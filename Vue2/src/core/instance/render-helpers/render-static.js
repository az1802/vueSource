/* @flow */

/**
 * Runtime helper for rendering static trees.
 * 渲染静态节点,index为staticRenderFns中的下标位置
 */
export function renderStatic (
  index: number,
  isInFor: boolean
): VNode | Array<VNode> {
  const cached = this._staticTrees || (this._staticTrees = [])
  let tree = cached[index]
  // if has already-rendered static tree and not inside v-for,
  // we can reuse the same tree.
  // 已经存在且不在v-for中可以重复使用
  if (tree && !isInFor) {
    return tree
  }
  // otherwise, render a fresh tree.
  // 找到静态节点的渲染函数并且运行生成静态vnode
  tree = cached[index] = this.$options.staticRenderFns[index].call(
    this._renderProxy,
    null,
    this // for render fns generated for functional component templates
  )

  //标记为静态节点
  markStatic(tree, `__static__${index}`, false)
  return tree
}

/**
 * Runtime helper for v-once.
 * Effectively it means marking the node as static with a unique key.
 * 将v-once指令的vnode节点(isStatic,isOnce标记为true,赋值key)
 * <p v-for="(val,key) in arr" :key="val"><span v-once>{{item}}</span></p>
 * _l((arr),function(val,key){return _c('p',{key:val},[_o(_c('span',[_v(_s(item))]),0,val)])})
 */
export function markOnce (
  tree: VNode | Array<VNode>,
  index: number,
  key: string
) {
  markStatic(tree, `__once__${index}${key ? `_${key}` : ``}`, true)
  return tree
}

/**
 * 标记vnode节点为静态vnode
 */
function markStatic (
  tree: VNode | Array<VNode>,
  key: string,
  isOnce: boolean
) {
  if (Array.isArray(tree)) {
    for (let i = 0; i < tree.length; i++) {
      if (tree[i] && typeof tree[i] !== 'string') {
        markStaticNode(tree[i], `${key}_${i}`, isOnce)
      }
    }
  } else {
    markStaticNode(tree, key, isOnce)
  }
}

/**
 * 将vnode节点标记为静态vnode
 */
function markStaticNode (node, key, isOnce) {
  node.isStatic = true
  node.key = key
  node.isOnce = isOnce
}
