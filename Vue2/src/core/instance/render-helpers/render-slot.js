/* @flow */

import { extend, warn, isObject } from 'core/util/index'

/**
 * Runtime helper for rendering <slot>
 * <slot name="header">header默认内容</slot>节点对应的render代码
 * _t("header",[_v("header默认内容")])
 *
 * <slot name="header" title="123" :[msg]="msg " v-bind="obj"><span>默认内容</span></slot>
 * "_t("header",[_c('span',[_v("默认内容")])],_d({"title":"123"},[msg,msg]),obj"
 *
 *
 * 渲染slot标签,返回VNode节点数组
 * name       插槽对应名称
 * fallback   插槽内的默认内容
 * prop       插槽上的属性部分
 * bindObject 插槽v-bind指令绑定的值
 */
export function renderSlot (
  name: string,
  fallback: ?Array<VNode>,
  props: ?Object,
  bindObject: ?Object
): ?Array<VNode> {
  const scopedSlotFn = this.$scopedSlots[name]
  let nodes
  if (scopedSlotFn) { // scoped slot 作用域插槽有更高的优先级
    props = props || {}
    if (bindObject) {
      if (process.env.NODE_ENV !== 'production' && !isObject(bindObject)) {
        warn(
          'slot v-bind without argument expects an Object',
          this
        )
      }
      //合并slot上v-bind指令和属性数据,作为作用域插槽的参数传入
      props = extend(extend({}, bindObject), props)
    }

    //使用父组件下生成的render函数注入子组件提供的数据生成vnode节点
    //从而实现子组件的数据作用域出现在父组件
    nodes = scopedSlotFn(props) || fallback
  } else {
    nodes = this.$slots[name] || fallback
  }

  const target = props && props.slot
  if (target) {
    return this.$createElement('template', { slot: target }, nodes)
  } else {
    return nodes
  }
}
