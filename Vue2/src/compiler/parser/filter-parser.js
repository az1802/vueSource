/* @flow */

const validDivisionCharRE = /[\w).+\-_$\]]/

/**
 * 解析表达式中的过滤器
 * charCodeAt返回的是Unicode统一码
 * 0x27  '
 * 0x22  "
 * 0x60  `
 * 0x2f  /
 * 0x7C  |
 * 0x5C  \
 *
 * _f()用于找到过滤器的处理函数
 * "msg | filterA(a,b) | filterB(c,d)" --> "_f("filterB")(_f("filterA")(msg,a,b),c,d)"
 * "msg , filterA  --> "_f("filterA")(msg)"
 * "msg , filterA(a,b)  --> "_f("filterA")(msg,a,b)"
 */
export function parseFilters (exp: string): string {
  let inSingle = false //内容在单引号内
  let inDouble = false //内容在双引号内
  let inTemplateString = false //在模板字符串内
  let inRegex = false //正则表达式
  let curly = 0 //{} 内
  let square = 0 //[] 内
  let paren = 0 //() 内
  let lastFilterIndex = 0 //表示上一次 | 符号的的位置
  let c, prev, i, expression, filters

  //通过循环对每一个字符进行判断处理,根据不同字符标记不同的状态量从而进行不同的处理
  for (i = 0; i < exp.length; i++) {
    prev = c
    c = exp.charCodeAt(i)
    //如果开始有',",`,/,当再次碰到且前一字符不是\时才重置状态(''内的 | 才不会处理)
    if (inSingle) {
      if (c === 0x27 && prev !== 0x5C) inSingle = false
    } else if (inDouble) {
      if (c === 0x22 && prev !== 0x5C) inDouble = false
    } else if (inTemplateString) {
      if (c === 0x60 && prev !== 0x5C) inTemplateString = false
    } else if (inRegex) {//在正则表达式内
      if (c === 0x2f && prev !== 0x5C) inRegex = false
    } else if (
      c === 0x7C && // pipe 管道过滤器 | 且前后不能是 | (避免对||的误判),且不能被(),[],{}包裹
      exp.charCodeAt(i + 1) !== 0x7C &&
      exp.charCodeAt(i - 1) !== 0x7C &&
      !curly && !square && !paren
    ) {
      if (expression === undefined) {
        // first filter, end of expression 第一次碰见 | 即截取前面部分为表达式值,后面走else做过滤器
        lastFilterIndex = i + 1
        expression = exp.slice(0, i).trim()
      } else {
        pushFilter()
      }
    } else {
      switch (c) {
        case 0x22: inDouble = true; break         // "
        case 0x27: inSingle = true; break         // '
        case 0x60: inTemplateString = true; break // `
        case 0x28: paren++; break                 // (
        case 0x29: paren--; break                 // )
        case 0x5B: square++; break                // [
        case 0x5D: square--; break                // ]
        case 0x7B: curly++; break                 // {
        case 0x7D: curly--; break                 // }
      }
      if (c === 0x2f) { // /字符 这里是判断是不是在正则表达式内
        let j = i - 1
        let p
        // find first non-whitespace prev char
        for (; j >= 0; j--) {
          p = exp.charAt(j)
          if (p !== ' ') break
        }
        if (!p || !validDivisionCharRE.test(p)) {
          inRegex = true
        }
      }
    }
  }

  //末尾处可能是过滤器情况的处理
  if (expression === undefined) {
    expression = exp.slice(0, i).trim()
  } else if (lastFilterIndex !== 0) {
    pushFilter()
  }

  /**
   * 维护过滤器链数组
   * lastFilterIndex为上一次 | 的位置 i为再次遇到 | 的位置
   */
  function pushFilter () {
    (filters || (filters = [])).push(exp.slice(lastFilterIndex, i).trim())
    lastFilterIndex = i + 1
  }

  //表达式和过滤器包装为函数形式
  if (filters) {
    for (i = 0; i < filters.length; i++) {
      expression = wrapFilter(expression, filters[i])
    }
  }

  return expression
}

/**
 * 将过滤器进行包装,转换成函数执行的字符串
 * msg , filterA  --> "_f("filterA")(msg)"
 * msg , filterA(a,b)  --> "_f("filterA")(msg,a,b)"
 * _f("filterA") 会先在实例的$options中去寻找注册的过滤器函数,再进行值过滤
 */
function wrapFilter (exp: string, filter: string): string {
  const i = filter.indexOf('(')
  if (i < 0) {
    // _f: resolveFilter
    return `_f("${filter}")(${exp})`
  } else {
    const name = filter.slice(0, i)
    const args = filter.slice(i + 1)
    return `_f("${name}")(${exp}${args !== ')' ? ',' + args : args}`
  }
}
