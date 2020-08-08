import {
  ComponentInternalInstance,
  FunctionalComponent,
  Data
} from './component'
import {
  VNode,
  normalizeVNode,
  createVNode,
  Comment,
  cloneVNode,
  Fragment,
  VNodeArrayChildren,
  isVNode
} from './vnode'
import { handleError, ErrorCodes } from './errorHandling'
import { PatchFlags, ShapeFlags, isOn, isModelListener } from '@vue/shared'
import { warn } from './warning'
import { isHmrUpdating } from './hmr'

// mark the current rendering instance for asset resolution (e.g.
// resolveComponent, resolveDirective) during render
export let currentRenderingInstance: ComponentInternalInstance | null = null

export function setCurrentRenderingInstance(
  instance: ComponentInternalInstance | null
) {
  currentRenderingInstance = instance
}

// dev only flag to track whether $attrs was used during render.
// If $attrs was used during render then the warning for failed attrs
// fallthrough can be suppressed.
let accessedAttrs: boolean = false

export function markAttrsAccessed() {
  accessedAttrs = true
}

/**
 * 执行组件的render方法生成子vnode节点
 * @param instance 组件实例对象
 */
export function renderComponentRoot(
  instance: ComponentInternalInstance
): VNode {
  const {
    type: Component,
    parent,
    vnode,
    proxy,
    withProxy,
    props,
    slots,
    attrs,
    emit,
    render,
    renderCache,
    data,
    setupState,
    ctx
  } = instance

  let result
  currentRenderingInstance = instance
  if (__DEV__) {
    accessedAttrs = false
  }
  try {
    let fallthroughAttrs
    if (vnode.shapeFlag & ShapeFlags.STATEFUL_COMPONENT) { //组件vnode节点
      // withProxy is a proxy with a different `has` trap only for
      // runtime-compiled render functions using `with` block.
      // TODO 运行时进行template的编译时使用withProxy,两者在has的代理行为上存在差异
      const proxyToUse = withProxy || proxy
      result = normalizeVNode( //执行render函数,且规范化vnode节点
        render!.call(
          proxyToUse,
          proxyToUse!,
          renderCache,
          props,
          setupState,
          data,
          ctx
        )
      )
      fallthroughAttrs = attrs
    } else {
      // functional
      const render = Component as FunctionalComponent
      // in dev, mark attrs accessed if optional props (attrs === props)
      if (__DEV__ && attrs === props) {
        markAttrsAccessed()
      }
      result = normalizeVNode(
        render.length > 1
          ? render(
              props,
              __DEV__
                ? {
                    get attrs() {
                      markAttrsAccessed()
                      return attrs
                    },
                    slots,
                    emit
                  }
                : { attrs, slots, emit }
            )
          : render(props, null as any /* we know it doesn't need it */)
      )
      fallthroughAttrs = Component.props
        ? attrs
        : getFunctionalFallthrough(attrs)
    }

    // attr merging
    // in dev mode, comments are preserved, and it's possible for a template
    // to have comments along side the root element which makes it a fragment
    let root = result //新的vnode根节点
    let setRoot: ((root: VNode) => void) | undefined = undefined
    if (__DEV__) {
      ;[root, setRoot] = getChildRoot(result)
    }

    // 当组件配置inheritAttrs为true之后未在子组件注册的props,即使父组件传递子组件也不会显示
    if (Component.inheritAttrs !== false && fallthroughAttrs) {
      const keys = Object.keys(fallthroughAttrs)
      const { shapeFlag } = root
      if (keys.length) {
        if (
          shapeFlag & ShapeFlags.ELEMENT ||
          shapeFlag & ShapeFlags.COMPONENT
        ) {
          if (shapeFlag & ShapeFlags.ELEMENT && keys.some(isModelListener)) {
            // #1643, #1543
            // component v-model listeners should only fallthrough for component
            // HOCs
            // 
            fallthroughAttrs = filterModelListeners(fallthroughAttrs)
          }
          root = cloneVNode(root, fallthroughAttrs)//TODO 透传的属性增加到root vnode节点上 感觉这里可以优化毕竟只是增加属性并不需要重建一个vnode对象
        } else if (__DEV__ && !accessedAttrs && root.type !== Comment) {
          const allAttrs = Object.keys(attrs)
          const eventAttrs: string[] = []
          const extraAttrs: string[] = []
          for (let i = 0, l = allAttrs.length; i < l; i++) {
            const key = allAttrs[i]
            if (isOn(key)) {
              // ignore v-model handlers when they fail to fallthrough
              if (!isModelListener(key)) {
                // remove `on`, lowercase first letter to reflect event casing
                // accurately
                eventAttrs.push(key[2].toLowerCase() + key.slice(3))
              }
            } else {
              extraAttrs.push(key)
            }
          }
          if (extraAttrs.length) {
            warn(
              `Extraneous non-props attributes (` +
                `${extraAttrs.join(', ')}) ` +
                `were passed to component but could not be automatically inherited ` +
                `because component renders fragment or text root nodes.`
            )
          }
          if (eventAttrs.length) {
            warn(
              `Extraneous non-emits event listeners (` +
                `${eventAttrs.join(', ')}) ` +
                `were passed to component but could not be automatically inherited ` +
                `because component renders fragment or text root nodes. ` +
                `If the listener is intended to be a component custom event listener only, ` +
                `declare it using the "emits" option.`
            )
          }
        }
      }
    }

    // inherit scopeId
    const scopeId = vnode.scopeId
    // vite#536: if subtree root is created from parent slot if would already
    // have the correct scopeId, in this case adding the scopeId will cause
    // it to be removed if the original slot vnode is reused.
    const needScopeId = scopeId && root.scopeId !== scopeId
    const treeOwnerId = parent && parent.type.__scopeId
    const slotScopeId =
      treeOwnerId && treeOwnerId !== scopeId ? treeOwnerId + '-s' : null
    if (needScopeId || slotScopeId) {
      const extras: Data = {}
      if (needScopeId) extras[scopeId!] = ''
      if (slotScopeId) extras[slotScopeId] = ''
      root = cloneVNode(root, extras)
    }

    // inherit directives
    if (vnode.dirs) {
      if (__DEV__ && !isElementRoot(root)) {
        warn(
          `Runtime directive used on component with non-element root node. ` +
            `The directives will not function as intended.`
        )
      }
      root.dirs = vnode.dirs
    }
    // inherit transition data
    if (vnode.transition) {
      if (__DEV__ && !isElementRoot(root)) {
        warn(
          `Component inside <Transition> renders non-element root node ` +
            `that cannot be animated.`
        )
      }
      root.transition = vnode.transition
    }

    if (__DEV__ && setRoot) {
      setRoot(root)
    } else {
      result = root
    }
  } catch (err) {
    handleError(err, instance, ErrorCodes.RENDER_FUNCTION)
    result = createVNode(Comment)
  }
  currentRenderingInstance = null

  return result
}

/**
 * dev only
 */
const getChildRoot = (
  vnode: VNode
): [VNode, ((root: VNode) => void) | undefined] => {
  if (vnode.type !== Fragment) {
    return [vnode, undefined]
  }
  const rawChildren = vnode.children as VNodeArrayChildren //所有的vnode节点
  const dynamicChildren = vnode.dynamicChildren as VNodeArrayChildren //动态的vnode节点后续存在更新的部分
  const children = rawChildren.filter(child => { //过滤注释节点
    return !(
      isVNode(child) &&
      child.type === Comment &&
      child.children !== 'v-if'
    )
  })
  if (children.length !== 1) {
    return [vnode, undefined]
  }
  // TODO 过滤注释节点仅剩一个节点时,会将此节点设置为根vnode节点(属于一层优化)
  const childRoot = children[0] 
  const index = rawChildren.indexOf(childRoot)
  const dynamicIndex = dynamicChildren ? dynamicChildren.indexOf(childRoot) : -1
  const setRoot = (updatedRoot: VNode) => {
    rawChildren[index] = updatedRoot
    if (dynamicIndex > -1) {
      dynamicChildren[dynamicIndex] = updatedRoot
    } else if (dynamicChildren && updatedRoot.patchFlag > 0) {
      dynamicChildren.push(updatedRoot)
    }
  }
  return [normalizeVNode(childRoot), setRoot]
}

const getFunctionalFallthrough = (attrs: Data): Data | undefined => {
  let res: Data | undefined
  for (const key in attrs) {
    if (key === 'class' || key === 'style' || isOn(key)) {
      ;(res || (res = {}))[key] = attrs[key]
    }
  }
  return res
}

/**
 * 组件标签上传递下去的属性,过滤出onUpdate:开头的事件即v-model
 * @param attrs 组件标签上传递下去属性
 */
const filterModelListeners = (attrs: Data): Data => {
  const res: Data = {}
  for (const key in attrs) {
    if (!isModelListener(key)) {
      res[key] = attrs[key]
    }
  }
  return res
}


const isElementRoot = (vnode: VNode) => {
  return (
    vnode.shapeFlag & ShapeFlags.COMPONENT ||
    vnode.shapeFlag & ShapeFlags.ELEMENT ||
    vnode.type === Comment // potential v-if branch switch
  )
}

/**
 * 组件vnode是否应该进行更新,内部调用的方法并未对外提供接口.(react有接口可以自定义组件本次的更新)、
 * 存在动画,指令,动态插槽,新旧属性对比存在改变,动态属性的值存在改变
 * @param prevVNode 旧组件vnode
 * @param nextVNode 新组件vnode
 * @param optimized 
 */
export function shouldUpdateComponent(
  prevVNode: VNode,
  nextVNode: VNode,
  optimized?: boolean
): boolean {
  const { props: prevProps, children: prevChildren } = prevVNode
  const { props: nextProps, children: nextChildren, patchFlag } = nextVNode

  // Parent component's render function was hot-updated. Since this may have
  // caused the child component's slots content to have changed, we need to
  // force the child to update as well.
  // 热更细时一直需要更新组件
  if (__DEV__ && (prevChildren || nextChildren) && isHmrUpdating) {
    return true
  }

  // force child update for runtime directive or transition on component vnode.
  // 存在动画或指令需要更新
  if (nextVNode.dirs || nextVNode.transition) {
    return true
  }

  if (optimized && patchFlag > 0) {
    if (patchFlag & PatchFlags.DYNAMIC_SLOTS) {
      // slot content that references values that might have changed,
      // e.g. in a v-for
      return true
    }
    if (patchFlag & PatchFlags.FULL_PROPS) {
      if (!prevProps) {
        return !!nextProps
      }
      // presence of this flag indicates props are always non-null
      // 新旧属性对比是否存在改变
      return hasPropsChanged(prevProps, nextProps!)
    } else if (patchFlag & PatchFlags.PROPS) {
      // 动态属性的值是否存在改变
      const dynamicProps = nextVNode.dynamicProps!
      for (let i = 0; i < dynamicProps.length; i++) {
        const key = dynamicProps[i]
        if (nextProps![key] !== prevProps![key]) {
          return true
        }
      }
    }
  } else {
    // this path is only taken by manually written render functions
    // so presence of any children leads to a forced update
    if (prevChildren || nextChildren) {
      if (!nextChildren || !(nextChildren as any).$stable) {
        return true
      }
    }
    if (prevProps === nextProps) {
      return false
    }
    if (!prevProps) {
      return !!nextProps
    }
    if (!nextProps) {
      return true
    }
    return hasPropsChanged(prevProps, nextProps)
  }

  return false
}

/**
 * 对比新旧属性判断是否存在改变
 * @param prevProps 旧属性
 * @param nextProps 新属性
 */
function hasPropsChanged(prevProps: Data, nextProps: Data): boolean {
  const nextKeys = Object.keys(nextProps)
  if (nextKeys.length !== Object.keys(prevProps).length) {
    return true
  }
  for (let i = 0; i < nextKeys.length; i++) {
    const key = nextKeys[i]
    if (nextProps[key] !== prevProps[key]) {
      return true
    }
  }
  return false
}

// 更新高阶组件的dom节点,高阶抽象组件的subTree均指向同一vnode节点
export function updateHOCHostEl(
  { vnode, parent }: ComponentInternalInstance,
  el: typeof vnode.el // HostNode
) {
  while (parent && parent.subTree === vnode) {
    ;(vnode = parent.vnode).el = el
    parent = parent.parent
  }
}
