/* @flow */

import { extend } from 'shared/util'
import { detectErrors } from './error-detector'
import { createCompileToFunctionFn } from './to-function'

export function createCompilerCreator (baseCompile: Function): Function {
  return function createCompiler (baseOptions: CompilerOptions) {//baseOptions和平台相关的一些参数配置
    /**
     * 编译函数(先合并传入的options,再调用baseCompile生成编译结果)
     * template 模板字符串
     * options  编译options
     * 返回编译结果对象{
     *    render,    渲染函数的代码字符串
     *    staticRenderFns,静态节点对应的函数字符串
     *    errors, 错误信息
     *    tips ,  建议信息
     * }
     */
    function compile (
      template: string,
      options?: CompilerOptions
    ): CompiledResult {
      const finalOptions = Object.create(baseOptions)
      const errors = []
      const tips = []

      //编译过程中产生了错误信息根据分类,将警告信息压入errors,建议信息压入tips中
      let warn = (msg, range, tip) => {
        (tip ? tips : errors).push(msg)
      }

      //此处options是编译时传入的一些配置信息,合并options生成最终finalOptions
      if (options) {
        if (process.env.NODE_ENV !== 'production' && options.outputSourceRange) {
          // $flow-disable-line
          const leadingSpaceLength = template.match(/^\s*/)[0].length
          // 开头空格也计算长度这样可以在编译错误的时候可以更精确的输出位置
          warn = (msg, range, tip) => {
            const data: WarningMessage = { msg }
            if (range) {
              if (range.start != null) {
                data.start = range.start + leadingSpaceLength
              }
              if (range.end != null) {
                data.end = range.end + leadingSpaceLength
              }
            }
            (tip ? tips : errors).push(data)
          }
        }
        // merge custom modules
        if (options.modules) {//合并自定义的modules
          finalOptions.modules =
            (baseOptions.modules || []).concat(options.modules)
        }
        // merge custom directives
        if (options.directives) {// 合并自定义的指令
          finalOptions.directives = extend(
            Object.create(baseOptions.directives || null),
            options.directives
          )
        }
        // copy other options
        for (const key in options) {
          if (key !== 'modules' && key !== 'directives') {
            finalOptions[key] = options[key]
          }
        }
      }

      finalOptions.warn = warn

      //执行核心的编译函数
      const compiled = baseCompile(template.trim(), finalOptions)
      if (process.env.NODE_ENV !== 'production') {
        detectErrors(compiled.ast, warn)
      }
      compiled.errors = errors
      compiled.tips = tips
      return compiled
    }

    return {
      compile,
      compileToFunctions: createCompileToFunctionFn(compile)
    }
  }
}
