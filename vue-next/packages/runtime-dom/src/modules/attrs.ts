import { isSpecialBooleanAttr } from '@vue/shared'

export const xlinkNS = 'http://www.w3.org/1999/xlink'

/**
 * 使用setAttributeNS更新属性
 * @param el dom元素
 * @param key 更新的属性
 * @param value 属性值
 * @param isSVG 
 */
export function patchAttr(
  el: Element,
  key: string,
  value: any,
  isSVG: boolean
) {
  if (isSVG && key.startsWith('xlink:')) {
    if (value == null) {
      el.removeAttributeNS(xlinkNS, key.slice(6, key.length))
    } else {
      el.setAttributeNS(xlinkNS, key, value)
    }
  } else {
    // note we are only checking boolean attributes that don't have a
    // corresponding dom prop of the same name here.
    const isBoolean = isSpecialBooleanAttr(key) //boolean类型的属性需要进行移除
    if (value == null || (isBoolean && value === false)) {
      el.removeAttribute(key)
    } else {
      el.setAttribute(key, isBoolean ? '' : value)
    }
  }
}
