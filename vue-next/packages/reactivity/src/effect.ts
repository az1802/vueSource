import { TrackOpTypes, TriggerOpTypes } from './operations'
import { EMPTY_OBJ, isArray } from '@vue/shared'

// The main WeakMap that stores {target -> key -> dep} connections.
// Conceptually, it's easier to think of a dependency as a Dep class
// which maintains a Set of subscribers, but we simply store them as
// raw Sets to reduce memory overhead.
type Dep = Set<ReactiveEffect>
type KeyToDepMap = Map<any, Dep>
const targetMap = new WeakMap<any, KeyToDepMap>()

export interface ReactiveEffect<T = any> {
    (): T
    _isEffect: true
    id: number
    active: boolean
    raw: () => T
    deps: Array<Dep>
    options: ReactiveEffectOptions
}

export interface ReactiveEffectOptions {
    lazy?: boolean
    scheduler?: (job: ReactiveEffect) => void
    onTrack?: (event: DebuggerEvent) => void
    onTrigger?: (event: DebuggerEvent) => void
    onStop?: () => void
}

export type DebuggerEvent = {
    effect: ReactiveEffect
    target: object
    type: TrackOpTypes | TriggerOpTypes
    key: any
} & DebuggerEventExtraInfo

export interface DebuggerEventExtraInfo {
    newValue?: any
    oldValue?: any
    oldTarget?: Map<any, any> | Set<any>
}

const effectStack: ReactiveEffect[] = []
let activeEffect: ReactiveEffect | undefined

export const ITERATE_KEY = Symbol(__DEV__ ? 'iterate' : '')
export const MAP_KEY_ITERATE_KEY = Symbol(__DEV__ ? 'Map key iterate' : '')

/**
 * 是否被effect处理过
 * @param fn 待判断的函数
 */
export function isEffect(fn: any): fn is ReactiveEffect {
    return fn && fn._isEffect === true
}

/**
 * 传入副作用函数返回一个effect函数,其中运行fn的时候effect会收集相关依赖(dep)并互相添加。
 * @param options 副作用函数
 * @param fn 副作用函数,
 */
export function effect<T = any>(
    fn: () => T,
    options: ReactiveEffectOptions = EMPTY_OBJ
): ReactiveEffect<T> {
    if (isEffect(fn)) {
        fn = fn.raw
    }
    const effect = createReactiveEffect(fn, options)
    if (!options.lazy) {//立即运行(类似于vue2 watcher的immediate配置)
        effect()
    }
    return effect
}

// 解除effect和其依赖的dep的联系,同时设置active为false
export function stop(effect: ReactiveEffect) {
    if (effect.active) {
        cleanup(effect)
        if (effect.options.onStop) {
            effect.options.onStop()
        }
        effect.active = false
    }
}

let uid = 0

/**
 * 生成effect函数类似于vue2生成watcher对象
 * @param fn 
 * @param options 
 */
function createReactiveEffect<T = any>(
    fn: () => T,
    options: ReactiveEffectOptions
): ReactiveEffect<T> {
    const effect = function reactiveEffect(): unknown {
        if (!effect.active) {
            return options.scheduler ? undefined : fn()
        }
        if (!effectStack.includes(effect)) {//避免副作用函数多次执行
            cleanup(effect)//清除effect的依赖重新进行收集(vue2的实现中使用两个数组进行保存就的依赖和新的依赖)
            try {
                enableTracking()//确保可以进行依赖收集
                effectStack.push(effect)
                activeEffect = effect
                return fn()//执行函数进行依赖收集
            } finally {
                effectStack.pop()
                resetTracking()
                activeEffect = effectStack[effectStack.length - 1]
            }
        }
    } as ReactiveEffect
    effect.id = uid++
    effect._isEffect = true //用于effect的判定依据
    effect.active = true //是否可用
    effect.raw = fn //原始副作用函数,更新时会重新运行
    effect.deps = [] //存放依赖的响应式数据
    effect.options = options
    return effect
}

/**
 * 清除effect函数的依赖,即vue2中的watcher请出对应的dep
 * @param effect effect函数
 */
function cleanup(effect: ReactiveEffect) {
    const { deps } = effect
    if (deps.length) {
        for (let i = 0; i < deps.length; i++) {
            deps[i].delete(effect)
        }
        deps.length = 0
    }
}

let shouldTrack = true
const trackStack: boolean[] = []

// 暂停依赖(dep)的收集
export function pauseTracking() {
    trackStack.push(shouldTrack)
    shouldTrack = false
}

// 恢复依赖(dep)的收集
export function enableTracking() {
    trackStack.push(shouldTrack)
    shouldTrack = true
}

//恢复上一次 shouldTrack的状态
export function resetTracking() {
    const last = trackStack.pop()
    shouldTrack = last === undefined ? true : last
}

/**
 * 当访问到响应式数据时进行effect收集.当设置对应值时就执行effect进行通知,从而完成想相关的更新操作
 * @param target 访问的对象
 * @param type tarck的触发行为('get','has','iterate')
 * @param key 对象的ke值
 */
export function track(target: object, type: TrackOpTypes, key: unknown) {
    if (!shouldTrack || activeEffect === undefined) {//禁止跟踪或者没有effect在执行均不会产生effect收集
        return
    }
    let depsMap = targetMap.get(target)
    if (!depsMap) {
        targetMap.set(target, (depsMap = new Map()))
    }
    let dep = depsMap.get(key)
    if (!dep) {
        depsMap.set(key, (dep = new Set()))
    }
    // dep和effect互相添加
    if (!dep.has(activeEffect)) {
        dep.add(activeEffect)
        activeEffect.deps.push(dep)
        if (__DEV__ && activeEffect.options.onTrack) {
            //TODO 开发环境中使用的onTrack函数,用于每次访问该值就会执行一次,性能损耗会比较大所以仅在开发环境中使用,多用于跟踪数据的行为
            activeEffect.options.onTrack({
                effect: activeEffect,
                target,
                type,
                key
            })
        }
    }
}

/**
 * 当设置某值是触发set代理,运行对应的effect完成更新操作
 * @param target 设置值的对象
 * @param type 
 * @param key 设置值的key
 * @param newValue 新值
 * @param oldValue 旧值
 * @param oldTarget 就的对象
 */
export function trigger(
    target: object,
    type: TriggerOpTypes,
    key?: unknown,
    newValue?: unknown,
    oldValue?: unknown,
    oldTarget?: Map<unknown, unknown> | Set<unknown>
) {
    const depsMap = targetMap.get(target)
    if (!depsMap) {
        // never been tracked
        return
    }

    // 需要执行effect函数
    const effects = new Set<ReactiveEffect>()
    const add = (effectsToAdd: Set<ReactiveEffect> | undefined) => {
        if (effectsToAdd) {
            effectsToAdd.forEach(effect => effects.add(effect))
        }
    }

    if (type === TriggerOpTypes.CLEAR) {
        // collection being cleared
        // trigger all effects for target
        // 清楚表示所有的effect都要执行
        depsMap.forEach(add)
    } else if (key === 'length' && isArray(target)) {
        // 数组的length属性对应的dep 以及下标大于新值的值都将收集对应的effect
        depsMap.forEach((dep, key) => {
            if (key === 'length' || key >= (newValue as number)) {
                add(dep)
            }
        })
    } else {
        // schedule runs for SET | ADD | DELETE
        if (key !== void 0) {
            add(depsMap.get(key))
        }
        // also run for iteration key on ADD | DELETE | Map.SET
        const isAddOrDelete =
            type === TriggerOpTypes.ADD ||
            (type === TriggerOpTypes.DELETE && !isArray(target))//数组的删除或触发length的处理 前面针对数组的length进行了处理
        if (
            isAddOrDelete ||
            (type === TriggerOpTypes.SET && target instanceof Map)
        ) {
            add(depsMap.get(isArray(target) ? 'length' : ITERATE_KEY)) //迭代器的改变,添加对应的effect
        }
        if (isAddOrDelete && target instanceof Map) {
            add(depsMap.get(MAP_KEY_ITERATE_KEY))
        }
    }

    // TODO onTrigger,scheduler具体使用场景
    const run = (effect: ReactiveEffect) => {
        if (__DEV__ && effect.options.onTrigger) {
            effect.options.onTrigger({
                effect,
                target,
                key,
                type,
                newValue,
                oldValue,
                oldTarget
            })
        }
        if (effect.options.scheduler) {
            effect.options.scheduler(effect)
        } else {
            effect()
        }
    }

    effects.forEach(run)
}
