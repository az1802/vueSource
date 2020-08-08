import { patchClass } from './modules/class'
import { patchStyle } from './modules/style'
import { patchAttr } from './modules/attrs'
import { patchDOMProp } from './modules/props'
import { patchEvent } from './modules/events'
import { isOn, isString, isFunction, isModelListener } from '@vue/shared'
import { RendererOptions } from '@vue/runtime-core'

const nativeOnRE = /^on[a-z]/

type DOMRendererOptions = RendererOptions<Node, Element>

export const forcePatchProp: DOMRendererOptions['forcePatchProp'] = (_, key) =>
  key === 'value'

/**
 * 对dom节点属性部分进行更新,style,class会特别处理,事件监听和特殊的boolean属性单独处理,一般的属性直接更新值
 * @param el dom节点
 * @param key 需要更新的属性
 * @param prevValue 属性旧值
 * @param nextValue 属性新值
 * @param isSVG 是否是svg标签
 * @param prevChildren 子节点的子节点
 * @param parentComponent 父组件实例
 * @param parentSuspense 父级的suspense节点
 * @param unmountChildren 
 */
export const patchProp: DOMRendererOptions['patchProp'] = (
  el,
  key,
  prevValue,
  nextValue,
  isSVG = false,
  prevChildren,
  parentComponent,
  parentSuspense,
  unmountChildren
) => {
  switch (key) {
    // special
    case 'class':
      patchClass(el, nextValue, isSVG)
      break
    case 'style':
      patchStyle(el, prevValue, nextValue)
      break
    default:
      if (isOn(key)) {
        // ignore v-model listeners 忽略v-model的事件监听
        if (!isModelListener(key)) {
          patchEvent(el, key, prevValue, nextValue, parentComponent)
        }
      } else if (shouldSetAsProp(el, key, nextValue, isSVG)) {
        // 通过操作dom节点更新属性
        patchDOMProp(
          el,
          key,
          nextValue,
          prevChildren,
          parentComponent,
          parentSuspense,
          unmountChildren
        )
      } else {
        // special case for <input v-model type="checkbox"> with
        // :true-value & :false-value
        // store value as dom properties since non-string values will be
        // stringified.
        if (key === 'true-value') {
          ;(el as any)._trueValue = nextValue
        } else if (key === 'false-value') {
          ;(el as any)._falseValue = nextValue
        }
        // 使用setAttributeNS方法更新属性
        patchAttr(el, key, nextValue, isSVG)
      }
      break
  }
}

/**
 * 是否可以通过直接通过dom不需要使用setAttributeNS进行属性更新
 * @param el dom元素
 * @param key 属性
 * @param value 属性值
 * @param isSVG 
 */
function shouldSetAsProp(
  el: Element,
  key: string,
  value: unknown,
  isSVG: boolean
) {
  if (isSVG) {
    // most keys must be set as attribute on svg elements to work
    // ...except innerHTML
    if (key === 'innerHTML') {
      return true
    }
    // or native onclick with function values
    if (key in el && nativeOnRE.test(key) && isFunction(value)) {
      return true
    }
    return false
  }

  // spellcheck and draggable are numerated attrs, however their
  // corresponding DOM properties are actually booleans - this leads to
  // setting it with a string "false" value leading it to be coerced to
  // `true`, so we need to always treat them as attributes.
  // Note that `contentEditable` doesn't have this problem: its DOM
  // property is also enumerated string values.
  if (key === 'spellcheck' || key === 'draggable') {
    return false
  }

  // #1787 form as an attribute must be a string, while it accepts an Element as
  // a prop
  if (key === 'form' && typeof value === 'string') {
    return false
  }

  // #1526 <input list> must be set as attribute
  if (key === 'list' && el.tagName === 'INPUT') {
    return false
  }

  // native onclick with string value, must be set as attribute
  if (nativeOnRE.test(key) && isString(value)) {
    return false
  }

  return key in el
}
