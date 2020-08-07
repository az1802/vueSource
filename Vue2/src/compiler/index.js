/* @flow */

import { parse } from './parser/index'
import { optimize } from './optimizer'
import { generate } from './codegen/index'
import { createCompilerCreator } from './create-compiler'

/** 
 * createCompilerCreator` allows creating compilers that use alternative
 * parser/optimizer/codegen, e.g the SSR optimizing compiler.
 * Here we just export a default compiler using the default parts.
 *
 * createCompilerCreator返回一个默认的compileCreate function,
 * 然后不同平台利用createCompiler传入自己的options既可以创建适应该平台下的compile函数
 */
export const createCompiler = createCompilerCreator(function baseCompile (
  template: string,
  options: CompilerOptions
): CompiledResult {
  const ast = parse(template.trim(), options)
  if (options.optimize !== false) {
    optimize(ast, options)
  }
  
  //将AST对象转换成render函数的代码字符串
  //"with(this){return _c('div',{attrs:{"id":"app"}},[_c('p',[_v(_s(msg))])])}"
  const code = generate(ast, options)
  return {
    ast,
    render: code.render,
    staticRenderFns: code.staticRenderFns
  }
})
