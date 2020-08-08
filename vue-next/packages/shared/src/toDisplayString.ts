import { isArray, isObject, isPlainObject } from './index'

/**
 * For converting {{ interpolation }} values to displayed strings.
 * 将{{}} 内部的变量转换为字符串形式
 * @private
 */
export const toDisplayString = (val: unknown): string => {
  return val == null
    ? ''
    : isObject(val)
      ? JSON.stringify(val, replacer, 2)
      : String(val)
}

/**
 * 主要是针对set和map做特殊的处理然后显示出来
 * map.add("a","aa")map.add("b","bb") --> { "Map(2)": { "a =>": "aa", "b =>": "bb" } }
 * set.add('aa') set.add("bb") --> { "Set(2)": [ "aa", "ba" ] }
 * @param _key 键值
 * @param val 值
 */
const replacer = (_key: string, val: any) => {
  if (val instanceof Map) {
    return {
      [`Map(${val.size})`]: [...val.entries()].reduce((entries, [key, val]) => {
        ;(entries as any)[`${key} =>`] = val
        return entries
      }, {})
    }
  } else if (val instanceof Set) {
    return {
      [`Set(${val.size})`]: [...val.values()]
    }
  } else if (isObject(val) && !isArray(val) && !isPlainObject(val)) {
    return String(val)
  }
  return val
}
