/* @flow */

import config from 'core/config'
import { hyphenate } from 'shared/util'

/**
 * 检测键值是否匹配
 * Vue.config.keyCodes={up:[38, 87]}因为存在这种情况所以存在数组的判断
 */
function isKeyNotMatch<T> (expect: T | Array<T>, actual: T): boolean {
  if (Array.isArray(expect)) {
    return expect.indexOf(actual) === -1
  } else {
    return expect !== actual
  }
}

/**
 * Runtime helper for checking keyCodes from config.
 * exposed as Vue.prototype._k
 * passing in eventKeyName as last argument separately for backwards compat
 * 从配置文件中检查键码是否符合要求,将eventKeyName作为最后一个参数传入用于向后兼容
 * _k($event.keyCode,"a",undefined,$event.key,undefined)
 * {
 *   eventKeyCode,   事件原生的 keyCode
 *   key,            修饰符中键盘字符名称
 *   builtInKeyCode, 内值的键码对应的keyCode值
 *   eventKeyName,   事件原生的key
 *   builtInKeyName  内置键码的字符串名称
 * }
 */
export function checkKeyCodes (
  eventKeyCode: number,
  key: string,
  builtInKeyCode?: number | Array<number>,
  eventKeyName?: string,
  builtInKeyName?: string | Array<string>
): ?boolean {
  const mappedKeyCode = config.keyCodes[key] || builtInKeyCode
  if (builtInKeyName && eventKeyName && !config.keyCodes[key]) {
    return isKeyNotMatch(builtInKeyName, eventKeyName)
  } else if (mappedKeyCode) {
    return isKeyNotMatch(mappedKeyCode, eventKeyCode)
  } else if (eventKeyName) {
    return hyphenate(eventKeyName) !== key
  }
}
