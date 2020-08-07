/* @flow */

import {
  warn,
  nextTick,
  emptyObject,
  handleError,
  defineReactive
} from '../util/index'

import { createElement } from '../vdom/create-element'
import { installRenderHelpers } from './render-helpers/index'
import { resolveSlots } from './render-helpers/resolve-slots'
import { normalizeScopedSlots } from '../vdom/helpers/normalize-scoped-slots'
import VNode, { createEmptyVNode } from '../vdom/vnode'

import { isUpdatingChildComponent } from './lifecycle'

/**
 * 增加render函数运行时相关的属性和方法
 */
export function initRender (vm: Component) {
  vm._vnode = null // the root of the child tree  组件模板的根vnode节点
  vm._staticTrees = null // v-once cached trees  缓存静态vnode树
  const options = vm.$options
  const parentVnode = vm.$vnode = options._parentVnode // the placeholder node in parent tree 
  const renderContext = parentVnode && parentVnode.context//占位vnode节点的上下文即父实例对象
  vm.$slots = resolveSlots(options._renderChildren, renderContext)//todo 获取插槽vnode
  vm.$scopedSlots = emptyObject //作用域插槽默认内容为被冻结的空对象,不能赋值
  // bind the createElement fn to this instance
  // so that we get proper render context inside it.
  // args order: tag, data, children, normalizationType, alwaysNormalize
  // internal version is used by render functions compiled from templates
  // 绑定render函数至实例对象上
  vm._c = (a, b, c, d) => createElement(vm, a, b, c, d, false)
  // normalization is always applied for the public version, used in
  // user-written render functions.
  // 自己写的render函数在使用时需要对子节点进行规范化处理,所以最后一个参数宗伟true
  vm.$createElement = (a, b, c, d) => createElement(vm, a, b, c, d, true)

  // $attrs & $listeners are exposed for easier HOC creation.
  // they need to be reactive so that HOCs using them are always updated
   //获取占位符vnode上的data信息,并且设置为响应式,当更新时会触发更新
  const parentData = parentVnode && parentVnode.data

  /* istanbul ignore else */
  if (process.env.NODE_ENV !== 'production') {
    defineReactive(vm, '$attrs', parentData && parentData.attrs || emptyObject, () => {
      !isUpdatingChildComponent && warn(`$attrs is readonly.`, vm)
    }, true)
    defineReactive(vm, '$listeners', options._parentListeners || emptyObject, () => {
      !isUpdatingChildComponent && warn(`$listeners is readonly.`, vm)
    }, true)
  } else {
    defineReactive(vm, '$attrs', parentData && parentData.attrs || emptyObject, null, true)
    defineReactive(vm, '$listeners', options._parentListeners || emptyObject, null, true)
  }
}

export let currentRenderingInstance: Component | null = null

// for testing only
export function setCurrentRenderingInstance (vm: Component) {
  currentRenderingInstance = vm
}

/**
 * Vue原型中添加$nextTick,_render以及render函数执行所需方法
 */
export function renderMixin (Vue: Class<Component>) {
  // install runtime convenience helpers 引入render函数执行时的辅助方法
  installRenderHelpers(Vue.prototype)

  Vue.prototype.$nextTick = function (fn: Function) {
    return nextTick(fn, this)
  }

  // 运行render函数,返回vnode树的根节点
  Vue.prototype._render = function (): VNode {
    const vm: Component = this
    const { render, _parentVnode } = vm.$options

     //占位符节点存在则规范化作用域插槽
    if (_parentVnode) {
      vm.$scopedSlots = normalizeScopedSlots(
        _parentVnode.data.scopedSlots,
        vm.$slots,
        vm.$scopedSlots
      )
    }

    // set parent vnode. this allows render functions to have access
    // to the data on the placeholder node.
    // 设置父vnode(即占位符vnode)
    // 这样在redner函数执行的时候通过实例能访问到占位符vnode上的data
    vm.$vnode = _parentVnode
    // render self
    let vnode //执行render函数生成vnode树
    try {
      // There's no need to maintain a stack because all render fns are called
      // separately from one another. Nested component's render fns are called
      // when parent component is patched.
      currentRenderingInstance = vm //保证render函数运行时的上下文
      //render函数(with(this){return _c(....)}),第二个参数是拥有我们手写render函数的参数
      vnode = render.call(vm._renderProxy, vm.$createElement)
    } catch (e) {
      handleError(e, vm, `render`)
      // return error render result,
      // or previous vnode to prevent render error causing blank component
      // 存在定义的renderError则根据renderError生成vnode返回使用
      // 若rednerError执行中再次出现错误则使用之前的vnode节点没有则为空,避免死循环处理
      /* istanbul ignore else */
      if (process.env.NODE_ENV !== 'production' && vm.$options.renderError) {
        try {
          //render函数运行错误时,若存在错误边界则会调用renderError渲染vnode节点进行替换
          vnode = vm.$options.renderError.call(vm._renderProxy, vm.$createElement, e)
        } catch (e) {
          // 当renderError执行生成vnode节点则直接控制台提示错误避免
          handleError(e, vm, `renderError`)
          vnode = vm._vnode
        }
      } else {
        vnode = vm._vnode
      }
    } finally {
      currentRenderingInstance = null
    }
    // if the returned array contains only a single node, allow it
    if (Array.isArray(vnode) && vnode.length === 1) {
      vnode = vnode[0]
    }
    // return empty vnode in case the render function errored out
    if (!(vnode instanceof VNode)) {
      if (process.env.NODE_ENV !== 'production' && Array.isArray(vnode)) {
        // render函数返回多个vnode根节点则会提示错误
        warn(
          'Multiple root nodes returned from render function. Render function ' +
          'should return a single root node.',
          vm
        )
      }
      vnode = createEmptyVNode()
    }
    // set parent 构建父子vnode搭建vnode树
    vnode.parent = _parentVnode
    return vnode
  }
}
