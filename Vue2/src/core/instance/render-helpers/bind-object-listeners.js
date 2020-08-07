/* @flow */

import { warn, extend, isPlainObject } from 'core/util/index'

/**
 * v-on指令为对象值时会通过这里绑定多个事件,并将事件混入到data.on中
 * _g(data,eventObj)
 * data为已经编码完的数据对象
 * eventObj  v-on指令的值即要注入事件的对象
 */
export function bindObjectListeners (data: any, value: any): VNodeData {
  if (value) {
    if (!isPlainObject(value)) {
      process.env.NODE_ENV !== 'production' && warn(
        'v-on without argument expects an Object value',
        this
      )
    } else {
      const on = data.on = data.on ? extend({}, data.on) : {}
      for (const key in value) {
        const existing = on[key]
        const ours = value[key]
        on[key] = existing ? [].concat(existing, ours) : ours
      }
    }
  }
  return data
}
