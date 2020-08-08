import { ElementWithTransition } from '../components/Transition'

// compiler should normalize class + :class bindings on the same element
// into a single binding ['staticClass', dynamic]
/**
 * 更新dom节点的class值
 * @param el dom节点
 * @param value 新的class值
 * @param isSVG 
 */
export function patchClass(el: Element, value: string | null, isSVG: boolean) {
  if (value == null) {
    value = ''
  }
  if (isSVG) {
    el.setAttribute('class', value)
  } else {
    // directly setting className should be faster than setAttribute in theory
    // if this is an element during a transition, take the temporary transition
    // classes into account.
    // TODO  
    const transitionClasses = (el as ElementWithTransition)._vtc
    if (transitionClasses) {
      value = (value
        ? [value, ...transitionClasses]
        : [...transitionClasses]
      ).join(' ')
    }
    el.className = value
  }
}
