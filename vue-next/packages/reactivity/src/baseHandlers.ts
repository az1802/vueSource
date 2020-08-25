import { reactive, readonly, toRaw, ReactiveFlags } from './reactive'
import { TrackOpTypes, TriggerOpTypes } from './operations'
import { track, trigger, ITERATE_KEY } from './effect'
import {
    isObject,
    hasOwn,
    isSymbol,
    hasChanged,
    isArray,
    extend
} from '@vue/shared'
import { isRef } from './ref'

const builtInSymbols = new Set(
    Object.getOwnPropertyNames(Symbol)
        .map(key => (Symbol as any)[key])
        .filter(isSymbol)
)

const get = /*#__PURE__*/ createGetter()
const shallowGet = /*#__PURE__*/ createGetter(false, true)
const readonlyGet = /*#__PURE__*/ createGetter(true)
const shallowReadonlyGet = /*#__PURE__*/ createGetter(true, true)


// 数组的'includes', 'indexOf', 'lastIndexOf'方法进行重写会访问数组的每一项进行依赖收集
const arrayInstrumentations: Record<string, Function> = {}
    ;['includes', 'indexOf', 'lastIndexOf'].forEach(key => {
        arrayInstrumentations[key] = function (...args: any[]): any {
            const arr = toRaw(this) as any
            for (let i = 0, l = (this as any).length; i < l; i++) {
                track(arr, TrackOpTypes.GET, i + '')
            }
            // we run the method using the original args first (which may be reactive)
            const res = arr[key](...args)
            if (res === -1 || res === false) {
                // if that didn't work, run it again using raw values.
                return arr[key](...args.map(toRaw))
            } else {
                return res
            }
        }
    })

/**
 * 创建响应式代理的get方法。先处理一些内部属性的值直接返回结果并不进行依赖收集
 * @param isReadonly 访问的值是否只读,只读不会进行依赖(dep)收集,因为后续是不能更改此值的
 * @param shallow 不会对子级的key进行深度的代理,即深度子级的访问使用原始对象不会进行依赖收集
 */
function createGetter(isReadonly = false, shallow = false) {
    return function get(target: object, key: string | symbol, receiver: object) {
        if (key === ReactiveFlags.IS_REACTIVE) {
            return !isReadonly
        } else if (key === ReactiveFlags.IS_READONLY) {
            return isReadonly
        } else if (
            key === ReactiveFlags.RAW &&
            receiver ===
            (isReadonly
                ? (target as any)[ReactiveFlags.READONLY]
                : (target as any)[ReactiveFlags.REACTIVE])
        ) {
            return target
        }

        const targetIsArray = isArray(target)
        if (targetIsArray && hasOwn(arrayInstrumentations, key)) {//'includes', 'indexOf', 'lastIndexOf'数组这三个方法会去访问数组每一项进行一次依赖收集
            return Reflect.get(arrayInstrumentations, key, receiver)
        }

        const res = Reflect.get(target, key, receiver)

        if (
            isSymbol(key)
                ? builtInSymbols.has(key)
                : key === `__proto__` || key === `__v_isRef`
        ) {
            return res
        }

        if (!isReadonly) {//只读对象不会进行依赖收集因为后续不会更改此值
            track(target, TrackOpTypes.GET, key)
        }

        if (shallow) { //直接返回结果不会对res再次进行响应式处理
            return res
        }

        if (isRef(res)) {
            // ref unwrapping, only for Objects, not for Arrays.
            return targetIsArray ? res : res.value
        }

        if (isObject(res)) {
            // Convert returned value into a proxy as well. we do the isObject check
            // here to avoid invalid value warning. Also need to lazy access readonly
            // and reactive here to avoid circular dependency.
            // 深度响应式处理,只有访问到具体的值时才会去做值的响应式处理
            return isReadonly ? readonly(res) : reactive(res)
        }

        return res
    }
}

const set = /*#__PURE__*/ createSetter()
const shallowSet = /*#__PURE__*/ createSetter(true)

/**
 * 创建响应式代理的set方法
 * @param shallow 是否浅层设置值,深度设置值即不会触发相应的更新
 */
function createSetter(shallow = false) {
    return function set(
        target: object,
        key: string | symbol,
        value: unknown,
        receiver: object
    ): boolean {
        const oldValue = (target as any)[key]
        if (!shallow) {
            value = toRaw(value)
            if (!isArray(target) && isRef(oldValue) && !isRef(value)) {
                oldValue.value = value
                return true
            }
        } else {
            // in shallow mode, objects are set as-is regardless of reactive or not
        }

        const hadKey = hasOwn(target, key)
        const result = Reflect.set(target, key, value, receiver)
        // don't trigger if target is something up in the prototype chain of original
        if (target === toRaw(receiver)) {
            if (!hadKey) {
                trigger(target, TriggerOpTypes.ADD, key, value)
            } else if (hasChanged(value, oldValue)) {
                trigger(target, TriggerOpTypes.SET, key, value, oldValue)
            }
        }
        return result
    }
}

// 拦截delete proxy[propKey]的操作(vue2不支持)
function deleteProperty(target: object, key: string | symbol): boolean {
    const hadKey = hasOwn(target, key)
    const oldValue = (target as any)[key]
    const result = Reflect.deleteProperty(target, key)
    if (result && hadKey) {//触发effect,并且操作为删除类型
        trigger(target, TriggerOpTypes.DELETE, key, undefined, oldValue)
    }
    return result
}

// 拦截propKey in proxy的操作(vue2不支持)
function has(target: object, key: string | symbol): boolean {
    const result = Reflect.has(target, key)
    if (!isSymbol(key) || !builtInSymbols.has(key)) {
        //非Symbol的key访问会进行依赖(dep)收集,vue2不支持
        track(target, TrackOpTypes.HAS, key)
    }
    return result
}
// Object.getOwnPropertyNames(proxy)、Object.getOwnPropertySymbols(proxy)、Object.keys(proxy)、for...in循环(vue2不支持)
function ownKeys(target: object): (string | number | symbol)[] {
    track(target, TrackOpTypes.ITERATE, ITERATE_KEY)
    return Reflect.ownKeys(target)
}

// 会深度代理子级key
export const mutableHandlers: ProxyHandler<object> = {
    get,
    set,
    deleteProperty,
    has,
    ownKeys
}

// 只读对象的代理,无法赋值
export const readonlyHandlers: ProxyHandler<object> = {
    get: readonlyGet,
    has,
    ownKeys,
    set(target, key) {
        if (__DEV__) {
            console.warn(
                `Set operation on key "${String(key)}" failed: target is readonly.`,
                target
            )
        }
        return true
    },
    deleteProperty(target, key) {
        if (__DEV__) {
            console.warn(
                `Delete operation on key "${String(key)}" failed: target is readonly.`,
                target
            )
        }
        return true
    }
}

// 只代理子级key,不会深度的处理代理对象
export const shallowReactiveHandlers: ProxyHandler<object> = extend(
    {},
    mutableHandlers,
    {
        get: shallowGet,
        set: shallowSet
    }
)

// Props handlers are special in the sense that it should not unwrap top-level
// refs (in order to allow refs to be explicitly passed down), but should
// retain the reactivity of the normal readonly object.
// 浅层的只读代理配置
export const shallowReadonlyHandlers: ProxyHandler<object> = extend(
    {},
    readonlyHandlers,
    {
        get: shallowReadonlyGet
    }
)
