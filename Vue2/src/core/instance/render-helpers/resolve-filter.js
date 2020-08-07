/* @flow */

import { identity, resolveAsset } from 'core/util/index'

/**
 * Runtime helper for resolving filters
 * _v(_s(_f("a")(msg)))
 * render函数运行寻找过滤器函数(identity传入什么值返回什么值)
 */
 */
export function resolveFilter (id: string): Function {
  return resolveAsset(this.$options, 'filters', id, true) || identity
}
