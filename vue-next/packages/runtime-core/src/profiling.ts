import { ComponentInternalInstance, formatComponentName } from './component'

let supported: boolean
let perf: any

/**
 * 利用浏览器的performance.mark对init,mount,render,pathch,compile,hydrate的过程的开始时间进行标记
 * @param instance 组件实例对象
 * @param type 记录的阶段类型
 */
export function startMeasure(
  instance: ComponentInternalInstance,
  type: string
) {
  if (instance.appContext.config.performance && isSupported()) {
    perf.mark(`vue-${type}-${instance.uid}`)
  }
}

/**
 * 利用浏览器的performance.mark对init,mount,render,pathch,compile,hydrate的过程的结束时间进行标记
 * @param instance 组件实例对象
 * @param type 记录的阶段类型
 */
export function endMeasure(instance: ComponentInternalInstance, type: string) {
  if (instance.appContext.config.performance && isSupported()) {
    const startTag = `vue-${type}-${instance.uid}`
    const endTag = startTag + `:end`
    perf.mark(endTag)
    perf.measure(
      `<${formatComponentName(instance, instance.type)}> ${type}`,
      startTag,
      endTag
    )
    perf.clearMarks(startTag)
    perf.clearMarks(endTag)
  }
}

// 是否支持performance方法
function isSupported() {
  if (supported !== undefined) {
    return supported
  }
  /* eslint-disable no-restricted-globals */
  if (typeof window !== 'undefined' && window.performance) {
    supported = true
    perf = window.performance
  } else {
    supported = false
  }
  /* eslint-enable no-restricted-globals */
  return supported
}
