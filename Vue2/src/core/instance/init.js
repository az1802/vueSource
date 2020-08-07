/* @flow */

import config from '../config'
import { initProxy } from './proxy'
import { initState } from './state'
import { initRender } from './render'
import { initEvents } from './events'
import { mark, measure } from '../util/perf'
import { initLifecycle, callHook } from './lifecycle'
import { initProvide, initInjections } from './inject'
import { extend, mergeOptions, formatComponentName } from '../util/index'

let uid = 0

/**
 * 向Vue原型中添加_init方法
 */
export function initMixin (Vue: Class<Component>) {
  Vue.prototype._init = function (options?: Object) {
    const vm: Component = this
    //vue实例的唯一标识符
    vm._uid = uid++

    let startTag, endTag
    /* istanbul ignore if 性能埋点,计算init方法执行完的时间消耗 */
    if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
      startTag = `vue-perf-start:${vm._uid}`
      endTag = `vue-perf-end:${vm._uid}`
      mark(startTag)
    }

    // vue实例标志,避免被Obserbe观察
    vm._isVue = true
    // 合并options,将传入的options与构造函数本身的options进行合并(插件都是默认配置和传入的配置进行合并的策略)
    if (options && options._isComponent) {
      // optimize internal component instantiation
      // since dynamic options merging is pretty slow, and none of the
      // internal component options needs special treatment.
      initInternalComponent(vm, options)//动态的options合并相当慢,这里只有需要处理一些特殊的参数属性
    } else {
      vm.$options = mergeOptions(
        resolveConstructorOptions(vm.constructor),//获取当前构造函数的基本options
        options || {},
        vm
      )
    }
    //代理vm实例属性,当某个属性获取不到时提示错误便于开发
    if (process.env.NODE_ENV !== 'production') {
      initProxy(vm)
    } else {
      vm._renderProxy = vm
    }
    // expose real self
    vm._self = vm
    initLifecycle(vm) //初始化vue实例生命周期相关的属性
    initEvents(vm) //初始化事件相关属性,若存在父监听事件,则添加到该实例上
    initRender(vm) //初始化render渲染所需的slots 渲染函数等
    callHook(vm, 'beforeCreate')// 触发beforeCreate生命周期函数
    initInjections(vm) // resolve injections before data/props
    initState(vm) //对props,methods,data,computed,watch进行初始化
    initProvide(vm) // resolve provide after data/props
    callHook(vm, 'created') // 触发created生命周期函数

    /* istanbul ignore if */
    if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
      vm._name = formatComponentName(vm, false)
      mark(endTag)
      measure(`vue ${vm._name} init`, startTag, endTag)
    }

    // 实例绑定到对应DOM元素上(组件构造函数若没有配置el则$mount过程不在这里执行)
    if (vm.$options.el) {
      vm.$mount(vm.$options.el)
    }
  }
}

/**
 * 组件vnode上的属性,事件,插槽都是在父模板下解析
 * 所以这里要提取到组件实例的$options
 */
export function initInternalComponent (vm: Component, options: InternalComponentOptions) {
  const opts = vm.$options = Object.create(vm.constructor.options)
  // doing this because it's faster than dynamic enumeration.
  const parentVnode = options._parentVnode
  opts.parent = options.parent
  opts._parentVnode = parentVnode

  const vnodeComponentOptions = parentVnode.componentOptions
  opts.propsData = vnodeComponentOptions.propsData
  opts._parentListeners = vnodeComponentOptions.listeners
  opts._renderChildren = vnodeComponentOptions.children
  opts._componentTag = vnodeComponentOptions.tag

  if (options.render) {
    opts.render = options.render
    opts.staticRenderFns = options.staticRenderFns
  }
}

/**
 * 返回当前Vue构造函数的options,会递归查询父类的options
 * 若父类options改变会更新缓存的superOptions同时更新自身的options
 * 整端逻辑会比较绕主要解决继承的问题
 */
export function resolveConstructorOptions (Ctor: Class<Component>) {
  let options = Ctor.options//构造类中的组件 指令
  if (Ctor.super) {//类继承的过程中会使用到一般不涉及
    //获取最新的super options并于缓存的super options进行比较,不一致进行更新
    const superOptions = resolveConstructorOptions(Ctor.super)
    const cachedSuperOptions = Ctor.superOptions
    if (superOptions !== cachedSuperOptions) {//更新子类的上的父类options
      // super option changed,
      // need to resolve new options.
      Ctor.superOptions = superOptions
      // check if there are any late-modified/attached options (#4976)
      const modifiedOptions = resolveModifiedOptions(Ctor)
      // update base extend options
      if (modifiedOptions) {
        extend(Ctor.extendOptions, modifiedOptions)
      }
      options = Ctor.options = mergeOptions(superOptions, Ctor.extendOptions)
      if (options.name) {
        options.components[options.name] = Ctor
      }
    }
  }
  return options
}

/**
 * 对组件构造函数之前缓存的options与最新options做对比
 * 将不一样的地方保存到modified返回
 */
function resolveModifiedOptions (Ctor: Class<Component>): ?Object {
  let modified
  const latest = Ctor.options
  const sealed = Ctor.sealedOptions
  for (const key in latest) {
    if (latest[key] !== sealed[key]) {
      if (!modified) modified = {}
      modified[key] = latest[key]
    }
  }
  return modified
}
