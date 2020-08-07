/* @flow */

import { warn } from 'core/util/index'

/**
 * 一次性绑定多个事件(即通向像data中的事件部分注入这些事件选项即可)
 * v-on="eventObj"
 * _g(code,eventObj)
 */
export default function on (el: ASTElement, dir: ASTDirective) {
  if (process.env.NODE_ENV !== 'production' && dir.modifiers) {
    warn(`v-on without argument does not support modifiers.`)
  }
  el.wrapListeners = (code: string) => `_g(${code},${dir.value})`
}
