/* @flow */

import { mergeOptions } from '../util/index'

/**
 * 扩展组件构造函数的options,在实例化时传入的options会与组件类的options进行合并
 */
export function initMixin (Vue: GlobalAPI) {
  Vue.mixin = function (mixin: Object) {
    this.options = mergeOptions(this.options, mixin)
    return this
  }
}
