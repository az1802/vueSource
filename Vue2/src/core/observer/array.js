/*
 * not type checking this file because flow doesn't play well with
 * dynamically accessing methods on Array prototype
 */

import {
  def
} from '../util/index'

const arrayProto = Array.prototype
export const arrayMethods = Object.create(arrayProto) //创建一个新的数组原型对象避免对原生的产生污染

const methodsToPatch = [
  'push',
  'pop',
  'shift',
  'unshift',
  'splice',
  'sort',
  'reverse'
]

/**
 * Intercept mutating methods and emit events
 * 代理数组原来的方法当新加入值时做响应式处理
 */
methodsToPatch.forEach(function (method) {
  // cache original method
  const original = arrayProto[method]
  def(arrayMethods, method, function mutator(...args) {
    const result = original.apply(this, args) // 执行原生的方法获取结果
    const ob = this.__ob__ //此处this即为被管擦的数组对象
    let inserted
    switch (method) {
      case 'push':
      case 'unshift':
        inserted = args
        break
      case 'splice':
        inserted = args.slice(2)
        break
    }
    if (inserted) ob.observeArray(inserted) //对数组新加的值做响应式处理
    // notify change
    ob.dep.notify()
    return result
  })
})
