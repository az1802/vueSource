/* @flow */

import { isObject, isDef, hasSymbol } from 'core/util/index'

/**
 * render函数中针对v-for指令数组vnode节点的生成
 * <p v-for="(val,key,index) in obj" :key="item">{{val}}</p>转换为
 * _l((obj),function(val,key,index){return _c('p',{key:item},[_v(_s(val))])})
 * obj为数组和string时 会传入下标值和下标序号
 * obj为数字时构造数组然后数字从1开始传入到函数中
 * obj为对象传入val,key,index
 */
export function renderList (
  val: any,
  render: (
    val: any,
    keyOrIndex: string | number,
    index?: number
  ) => VNode
): ?Array<VNode> {
  let ret: ?Array<VNode>, i, l, keys, key

  //这里字符串也会被当做一个数组进行处理
  if (Array.isArray(val) || typeof val === 'string') {
    ret = new Array(val.length)
    for (i = 0, l = val.length; i < l; i++) {
      ret[i] = render(val[i], i)
    }
  } else if (typeof val === 'number') {
    ret = new Array(val)
    for (i = 0; i < val; i++) {
      ret[i] = render(i + 1, i)
    }
  } else if (isObject(val)) {
    if (hasSymbol && val[Symbol.iterator]) {
      ret = []
      const iterator: Iterator<any> = val[Symbol.iterator]()
      let result = iterator.next()
      while (!result.done) {
        ret.push(render(result.value, ret.length))
        result = iterator.next()
      }
    } else {
      keys = Object.keys(val)
      ret = new Array(keys.length)
      for (i = 0, l = keys.length; i < l; i++) {
        key = keys[i]
        ret[i] = render(val[key], key, i)
      }
    }
  }
  
  //状态标记用于normalizeArrayChildren规范化数组中给定默认的key值作为标识符便于复用
  if (!isDef(ret)) {
    ret = []
  }
  (ret: any)._isVList = true
  return ret
}
