/* @flow */

/**
 * <div slot-scope="props">{{props.value}}</div>
 * _u([{key:"default",fn:function(props){return _c('div',{},[_c('p',[_v(_s(props.value))])])}}])
 * 不返回vnode节点只返回插槽name对应的渲染函数props参数有子组件渲染时提供(会存储于组件vnode的data.scopedSlots)
 * fns              作用域插槽的name和对应的渲染函数
 * res,             返回的结果
 * hasDynamicKeys   有动态的key会强制重新渲染
 * contentHashKey
 */
export function resolveScopedSlots (
  fns: ScopedSlotsData, // see flow/vnode
  res?: Object,
  // the following are added in 2.6
  hasDynamicKeys?: boolean,
  contentHashKey?: number
): { [key: string]: Function, $stable: boolean } {
  res = res || { $stable: !hasDynamicKeys }
  for (let i = 0; i < fns.length; i++) {
    const slot = fns[i]
    if (Array.isArray(slot)) {
      resolveScopedSlots(slot, res, hasDynamicKeys)
    } else if (slot) {
      // marker for reverse proxying v-slot without scope on this.$slots
      if (slot.proxy) {
        slot.fn.proxy = true
      }
      res[slot.key] = slot.fn
    }
  }
  if (contentHashKey) {
    (res: any).$key = contentHashKey
  }
  return res
}
