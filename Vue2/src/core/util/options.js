/* @flow */

import config from '../config'
import {
  warn
} from './debug'
import {
  set
} from '../observer/index'
import {
  unicodeRegExp
} from './lang'
import {
  nativeWatch,
  hasSymbol
} from './env'

import {
  ASSET_TYPES,
  LIFECYCLE_HOOKS
} from 'shared/constants'

import {
  extend,
  hasOwn,
  camelize,
  toRawType,
  capitalize,
  isBuiltInTag,
  isPlainObject
} from 'shared/util'

/**
 * Option overwriting strategies are functions that handle
 * how to merge a parent option value and a child option
 * value into the final value.
 * 可以针对一些自定义的属性采取特定的合并策略
 */
const strats = config.optionMergeStrategies

/**
 * Options with restrictions
 */
if (process.env.NODE_ENV !== 'production') {
  strats.el = strats.propsData = function (parent, child, vm, key) {
    if (!vm) { //el,propsData的合并必须存在vue实例对象
      warn(
        `option "${key}" can only be used during instance ` +
        'creation with the `new` keyword.'
      )
    }
    return defaultStrat(parent, child)
  }
}

/**
 * Helper that recursively merges two data objects together.
 * to表示child data,from 表示parent data
 */
function mergeData(to: Object, from: ? Object): Object {
  if (!from) return to
  let key, toVal, fromVal

  const keys = hasSymbol ?
    Reflect.ownKeys(from) :
    Object.keys(from)

  //将from的值合并到to内部,相同的key如果都为对象会再一次深度合并,否则才去child的key
  for (let i = 0; i < keys.length; i++) {
    key = keys[i]
    // in case the object is already observed...
    if (key === '__ob__') continue
    toVal = to[key]
    fromVal = from[key]
    if (!hasOwn(to, key)) {
      set(to, key, fromVal)
    } else if (
      toVal !== fromVal &&
      isPlainObject(toVal) &&
      isPlainObject(fromVal)
    ) { //两个对象会采取深度合并的方法进行处理
      mergeData(toVal, fromVal)
    }
  }
  return to
}

/**
 * Data data是function时做一步预处理,返回一个function用于生成合并后的对象
 */
export function mergeDataOrFn(
  parentVal: any,
  childVal: any,
  vm ? : Component
): ? Function {
  if (!vm) {
    // in a Vue.extend merge, both should be functions
    if (!childVal) {
      return parentVal
    }
    if (!parentVal) {
      return childVal
    }
    // when parentVal & childVal are both present,
    // we need to return a function that returns the
    // merged result of both functions... no need to
    // check if parentVal is a function here because
    // it has to be a function to pass previous merges.
    return function mergedDataFn() {
      return mergeData(
        typeof childVal === 'function' ? childVal.call(this, this) : childVal,
        typeof parentVal === 'function' ? parentVal.call(this, this) : parentVal
      )
    }
  } else {
    return function mergedInstanceDataFn() { //构造一个function  返回一个合并对象
      // instance merge
      const instanceData = typeof childVal === 'function' ?
        childVal.call(vm, vm) :
        childVal
      const defaultData = typeof parentVal === 'function' ?
        parentVal.call(vm, vm) :
        parentVal
      if (instanceData) {
        return mergeData(instanceData, defaultData)
      } else {
        return defaultData
      }
    }
  }
}

/**
 * data的合并策略(采用mergeDataOrFn处理最终返回的是function)
 */
strats.data = function (
  parentVal: any,
  childVal: any,
  vm ? : Component
): ? Function {
  if (!vm) { //data必须是function形式
    if (childVal && typeof childVal !== 'function') {
      process.env.NODE_ENV !== 'production' && warn(
        'The "data" option should be a function ' +
        'that returns a per-instance value in component ' +
        'definitions.',
        vm
      )

      return parentVal
    }
    return mergeDataOrFn(parentVal, childVal)
  }

  return mergeDataOrFn(parentVal, childVal, vm)
}

/**
 * Hooks and props are merged as arrays.
 * 合并生命周期相关的钩子函数,最终返回一个数组
 * @param parentVal ([fn1,fn2],undefined,)
 * @param childVal (fn3,[fn4,fn5],undefined,)
 */
function mergeHook(
  parentVal: ? Array < Function > ,
  childVal : ? Function | ? Array < Function >
) : ? Array < Function > {
  const res = childVal ?
    parentVal ?
    parentVal.concat(childVal) :
    Array.isArray(childVal) ?
    childVal : [childVal] : parentVal
  return res ?
    dedupeHooks(res) : res
}

/**
 * 过滤钩子函数数组中重复的funtion
 */
function dedupeHooks(hooks) {
  const res = []
  for (let i = 0; i < hooks.length; i++) {
    if (res.indexOf(hooks[i]) === -1) {
      res.push(hooks[i])
    }
  }
  return res
}

/**
 * beforeCreate,created,beforeMount,mounted,
 * beforeUpdate,updated,beforeDestroy,destroyed,
 * activated,deactivated,errorCaptured这些生命周期相关的合并策略
 */
LIFECYCLE_HOOKS.forEach(hook => {
  strats[hook] = mergeHook
})

/**
 * Assets
 *
 * When a vm is present (instance creation), we need to do
 * a three-way merge between constructor options, instance
 * options and parent options.
 * 
 * 'component','directive','filter'资源型的合并策略,采取的是原型链模式非直接覆盖
 */
function mergeAssets(
  parentVal: ? Object,
  childVal : ? Object,
  vm ? : Component,
  key : string
) : Object {
  const res = Object.create(parentVal || null)
  if (childVal) {
    process.env.NODE_ENV !== 'production' && assertObjectType(key, childVal, vm)
    return extend(res, childVal)
  } else {
    return res
  }
}

ASSET_TYPES.forEach(function (type) {
  strats[type + 's'] = mergeAssets
})

/**
 * Watchers.
 *
 * Watchers hashes should not overwrite one
 * another, so we merge them as arrays.
 * 
 * watcher函数不应该被覆盖重写,所以最终合并为一个数组
 * todo  各种模式下的合并
 */
strats.watch = function (
  parentVal: ? Object,
  childVal : ? Object,
  vm ? : Component,
  key : string
): ? Object {
  // work around Firefox's Object.prototype.watch...
  if (parentVal === nativeWatch) parentVal = undefined
  if (childVal === nativeWatch) childVal = undefined
  /* istanbul ignore if */
  if (!childVal) return Object.create(parentVal || null)
  if (process.env.NODE_ENV !== 'production') {
    assertObjectType(key, childVal, vm)
  }
  if (!parentVal) return childVal
  const ret = {}
  extend(ret, parentVal)
  for (const key in childVal) {
    let parent = ret[key]
    const child = childVal[key]
    if (parent && !Array.isArray(parent)) { //todo 为什么只处理非数组形式,数组形式的不处理
      parent = [parent]
    }
    ret[key] = parent ?
      parent.concat(child) :
      Array.isArray(child) ? child : [child] //监听函数相连接,先执行父级再执行子级
  }
  return ret
}

/**
 * Other object hashes.
 * 
 * props,methods,inject,computed的合并策略(浅拷贝的覆盖更新)
 */
strats.props =
  strats.methods =
  strats.inject =
  strats.computed = function (
    parentVal: ? Object,
    childVal : ? Object,
    vm ? : Component,
    key : string
  ): ? Object {
    if (childVal && process.env.NODE_ENV !== 'production') {
      assertObjectType(key, childVal, vm) //这些值必须是对象否则提示警告信息
    }
    if (!parentVal) return childVal
    const ret = Object.create(null)
    extend(ret, parentVal) //浅拷贝一个parent到ret
    if (childVal) extend(ret, childVal) //进行覆盖式合并
    return ret
  }
strats.provide = mergeDataOrFn

/**
 * Default strategy.
 * 默认合并策略(完全覆盖合并)
 */
const defaultStrat = function (parentVal: any, childVal: any): any {
  return childVal === undefined ?
    parentVal :
    childVal
}

/**
 * Validate component names
 */
function checkComponents(options: Object) {
  for (const key in options.components) {
    validateComponentName(key)
  }
}

/**
 * 验证组件名,只能用字母开头中间使用'-'符号链接,不能是原生html标签名
 */
export function validateComponentName(name: string) {
  if (!new RegExp(`^[a-zA-Z][\\-\\.0-9_${unicodeRegExp.source}]*$`).test(name)) {
    warn(
      'Invalid component name: "' + name + '". Component names ' +
      'should conform to valid custom element name in html5 specification.'
    )
  }
  if (isBuiltInTag(name) || config.isReservedTag(name)) {
    warn(
      'Do not use built-in or reserved HTML elements as component ' +
      'id: ' + name
    )
  }
}

/**
 * Ensure all props option syntax are normalized into the
 * Object-based format.
 * 
 * 处理props为标准模式便于后续处理
 * todo (props:{a:Number,b:{type:String}} --> {a:{type:Number},b:{type:String}} )
 */
function normalizeProps(options: Object, vm: ? Component) {
  const props = options.props
  if (!props) return
  const res = {}
  let i, val, name
  if (Array.isArray(props)) { //数组模式,数组内必须是字符串
    i = props.length
    while (i--) {
      val = props[i]
      if (typeof val === 'string') {
        name = camelize(val) //props-abc 转为propsAbc
        res[name] = {
          type: null
        }
      } else if (process.env.NODE_ENV !== 'production') {
        warn('props must be strings when using array syntax.')
      }
    }
  } else if (isPlainObject(props)) { //对象模式
    for (const key in props) {
      val = props[key]
      name = camelize(key)
      res[name] = isPlainObject(val) ?
        val : {
          type: val
        }
    }
  } else if (process.env.NODE_ENV !== 'production') {
    warn(
      `Invalid value for option "props": expected an Array or an Object, ` +
      `but got ${toRawType(props)}.`,
      vm
    )
  }
  options.props = res
}

/**
 * Normalize all injections into Object-based format
 * 确保所有的inject语法规范化为基于对象的格式
 * todo ['msg'] 转换为 inject = {msg:{from : "msg"}}
 */
function normalizeInject(options: Object, vm: ? Component) {
  const inject = options.inject
  if (!inject) return
  const normalized = options.inject = {}
  if (Array.isArray(inject)) {
    for (let i = 0; i < inject.length; i++) {
      normalized[inject[i]] = {
        from: inject[i]
      }
    }
  } else if (isPlainObject(inject)) {
    for (const key in inject) {
      const val = inject[key]
      normalized[key] = isPlainObject(val) ?
        extend({
          from: key
        }, val) : {
          from: val
        }
    }
  } else if (process.env.NODE_ENV !== 'production') {
    warn(
      `Invalid value for option "inject": expected an Array or an Object, ` +
      `but got ${toRawType(inject)}.`,
      vm
    )
  }
}

/**
 * Normalize raw function directives into object format.
 * todo 标准化指令对象   {a:{bind:fn,update:fn}}
 */
function normalizeDirectives(options: Object) {
  const dirs = options.directives
  if (dirs) {
    for (const key in dirs) {
      const def = dirs[key]
      if (typeof def === 'function') {
        dirs[key] = {
          bind: def,
          update: def
        }
      }
    }
  }
}

/**
 * 检验是否是纯碎的对象
 */
function assertObjectType(name: string, value: any, vm: ? Component) {
  if (!isPlainObject(value)) {
    warn(
      `Invalid value for option "${name}": expected an Object, ` +
      `but got ${toRawType(value)}.`,
      vm
    )
  }
}

/**
 * Merge two option objects into a new one.
 * Core utility used in both instantiation and inheritance.
 * 针对不同的属性合并采取不同的合并策略
 */
export function mergeOptions(
  parent: Object,
  child: Object,
  vm ? : Component
): Object {
  if (process.env.NODE_ENV !== 'production') {
    checkComponents(child)
  }

  if (typeof child === 'function') {
    child = child.options
  }

  // 处理props inject dorectives 为标准模式便于后续合并
  normalizeProps(child, vm)
  normalizeInject(child, vm)
  normalizeDirectives(child)

  // Apply extends and mixins on the child options,
  // but only if it is a raw options object that isn't
  // the result of another mergeOptions call.
  // Only merged options has the _base property.
  if (!child._base) {
    if (child.extends) {
      parent = mergeOptions(parent, child.extends, vm)
    }
    if (child.mixins) {
      for (let i = 0, l = child.mixins.length; i < l; i++) {
        parent = mergeOptions(parent, child.mixins[i], vm)
      }
    }
  }

  const options = {}
  let key
  for (key in parent) { //先处理父级options的属性
    mergeField(key)
    mergeField(key)
  }
  for (key in child) { //处理子级options的属性
    if (!hasOwn(parent, key)) {
      mergeField(key)
    }
  }

  //它对不同的key有着不同的合并策略。
  function mergeField(key) {
    const strat = strats[key] || defaultStrat
    options[key] = strat(parent[key], child[key], vm, key)
  }
  return options
}

/**
 * Resolve an asset.
 * This function is used because child instances need access
 * to assets defined in its ancestor chain.
 */
export function resolveAsset(
  options: Object,
  type: string,
  id: string,
  warnMissing ? : boolean
): any {
  /* istanbul ignore if */
  if (typeof id !== 'string') {
    return
  }
  const assets = options[type]
  // check local registration variations first
  if (hasOwn(assets, id)) return assets[id]
  const camelizedId = camelize(id)
  if (hasOwn(assets, camelizedId)) return assets[camelizedId]
  const PascalCaseId = capitalize(camelizedId)
  if (hasOwn(assets, PascalCaseId)) return assets[PascalCaseId]
  // fallback to prototype chain
  const res = assets[id] || assets[camelizedId] || assets[PascalCaseId]
  if (process.env.NODE_ENV !== 'production' && warnMissing && !res) {
    warn(
      'Failed to resolve ' + type.slice(0, -1) + ': ' + id,
      options
    )
  }
  return res
}
