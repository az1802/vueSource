// __UNSAFE__
// Reason: potentially setting innerHTML.
// This can come from explicit usage of v-html or innerHTML as a prop in render

import { warn } from '@vue/runtime-core'

// functions. The user is responsible for using them with only trusted content.
/**
 * 使用dom元素直接赋值的方式更新属性
 * @param el dom元素
 * @param key 属性
 * @param value 属性值
 * @param prevChildren 前一个子节点
 * @param parentComponent 父组件实例
 * @param parentSuspense 父Suspense实例
 * @param unmountChildren 移除的子节点
 */
export function patchDOMProp(
  el: any,
  key: string,
  value: any,
  // the following args are passed only due to potential innerHTML/textContent
  // overriding existing VNodes, in which case the old tree must be properly
  // unmounted.
  prevChildren: any,
  parentComponent: any,
  parentSuspense: any,
  unmountChildren: any
) {
  if (key === 'innerHTML' || key === 'textContent') {
    if (prevChildren) {
      unmountChildren(prevChildren, parentComponent, parentSuspense)
    }
    el[key] = value == null ? '' : value
    return
  }
  if (key === 'value' && el.tagName !== 'PROGRESS') {
    // store value as _value as well since
    // non-string values will be stringified.
    // TODO 
    el._value = value
    el.value = value == null ? '' : value
    return
  }
  if (value === '' && typeof el[key] === 'boolean') {
    // e.g. <select multiple> compiles to { multiple: '' }
    el[key] = true
  } else if (value == null && typeof el[key] === 'string') {
    // e.g. <div :id="null">
    el[key] = ''
    el.removeAttribute(key)
  } else {
    // some properties perform value validation and throw
    try {
      el[key] = value
    } catch (e) {
      if (__DEV__) {
        warn(
          `Failed setting prop "${key}" on <${el.tagName.toLowerCase()}>: ` +
            `value ${value} is invalid.`,
          e
        )
      }
    }
  }
}
