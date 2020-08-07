/* @flow */

import type Watcher from './watcher'
import {
  remove
} from '../util/index'
import config from '../config'

let uid = 0

/**
 * A dep is an observable that can have multiple
 * directives subscribing to it.
 * 一个dep实例对象可以有多个watcher
 */
export default class Dep {
  static target: ? Watcher;
  id: number;
  subs: Array < Watcher > ;

  constructor() {
    this.id = uid++ //后续移除添加会依据此唯一标识符
    this.subs = [] //订阅该dep类的watcher
  }

  addSub(sub: Watcher) { //添加订阅watcher
    this.subs.push(sub)
  }

  removeSub(sub: Watcher) { //移除订阅watcher
    remove(this.subs, sub)
  }

  depend() {
    if (Dep.target) { //Dep.target存放当前正在处理的watcher,该watcher与该dep实例互相添加
      Dep.target.addDep(this)
    }
  }

  notify() { //通知相关的订阅watcher执行更新操作
    // stabilize the subscriber list first
    const subs = this.subs.slice()
    if (process.env.NODE_ENV !== 'production' && !config.async) {
      // subs aren't sorted in scheduler if not running async
      // we need to sort them now to make sure they fire in correct
      // order
      // 父组件渲染watcher id小,所以更新操作从父组件到子组件
      subs.sort((a, b) => a.id - b.id)
    }
    for (let i = 0, l = subs.length; i < l; i++) {
      subs[i].update()
    }
  }
}

// The current target watcher being evaluated.
// This is globally unique because only one watcher
// can be evaluated at a time.
// 同一时间只能处理一个watcher,利用一个栈来维护wathcer处理队列
Dep.target = null
const targetStack = []

export function pushTarget(target: ? Watcher) { //当前处理watcher入栈
  targetStack.push(target)
  Dep.target = target
}

export function popTarget() { //处理完一个watcher则出栈
  targetStack.pop()
  Dep.target = targetStack[targetStack.length - 1]
}
