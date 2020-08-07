/* @flow */

import type VNode from 'core/vdom/vnode'

/**
 * Runtime helper for resolving raw children VNodes into a slot object.
 * 这里会对插槽节点按name进行分类处理并将结果存储于slots返回
 * children   组件vnode下的子节点
 * context    组件的上下文
 */
export function resolveSlots (
  children: ?Array<VNode>,
  context: ?Component
): { [key: string]: Array<VNode> } {
  if (!children || !children.length) {
    return {}
  }
  const slots = {}
  //遍历子节点进行分类,将具有相同slot名称的节点放在同一个数组
  for (let i = 0, l = children.length; i < l; i++) {
    const child = children[i]
    const data = child.data
    // remove slot attribute if the node is resolved as a Vue slot node 
    // 被当做slot的vnode删除data中的slot属性
    if (data && data.attrs && data.attrs.slot) {
      delete data.attrs.slot
    }
    // named slots should only be respected if the vnode was rendered in the
    // same context.
    if ((child.context === context || child.fnContext === context) &&
      data && data.slot != null
    ) {
      const name = data.slot //同名插槽放到一起
      const slot = (slots[name] || (slots[name] = []))
      if (child.tag === 'template') {  //template标签会将其子节点放入此插槽名中
        slot.push.apply(slot, child.children || []) //这里使用apply做一个一级展开
      } else {
        slot.push(child) //默认插槽
      }
    } else {
      (slots.default || (slots.default = [])).push(child)
    }
  }
  // ignore slots that contains only whitespace 
  // 当某个插槽内部的标签全是注释节点或者全是" "字符串则忽略这个插槽(插槽的一个优化)
  for (const name in slots) {
    if (slots[name].every(isWhitespace)) {
      delete slots[name]
    }
  }
  return slots
}

/**
 * 判断VNode节点是否是一个空白符节点
 */
function isWhitespace (node: VNode): boolean {
  return (node.isComment && !node.asyncFactory) || node.text === ' '
}
