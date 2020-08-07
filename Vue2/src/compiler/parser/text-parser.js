/* @flow */

import { cached } from 'shared/util'
import { parseFilters } from './filter-parser'

const defaultTagRE = /\{\{((?:.|\r?\n)+?)\}\}/g
const regexEscapeRE = /[-.*+?^${}()|[\]\/\\]/g

const buildRegex = cached(delimiters => {
  const open = delimiters[0].replace(regexEscapeRE, '\\$&')
  const close = delimiters[1].replace(regexEscapeRE, '\\$&')
  return new RegExp(open + '((?:.|\\n)+?)' + close, 'g')
})

type TextParseResult = {
  expression: string,
  tokens: Array<string | { '@binding': string }>
}

/**
 * 解析文本字符串含表达式的情况,返回render函数所需要的表达式
 * --{{a+b}}--
 * {
 *    expression:""--"+_s(a+b)+"--"",
 *    tokens:["--",{@binding:"a+b"},"--"]
 * }
 */
export function parseText (
  text: string,
  delimiters?: [string, string]
): TextParseResult | void {
  const tagRE = delimiters ? buildRegex(delimiters) : defaultTagRE
  if (!tagRE.test(text)) { //如果不含有表达式直接返回
    return
  }
  const tokens = [] //存放静态字符串和解析后的表达式
  const rawTokens = [] //保留了原始内容的数组
  let lastIndex = tagRE.lastIndex = 0 //lastIndex 上一次检索的开始位置
  let match, index, tokenValue
  //对文本循环处理,找出其中的表达式字符串 匹配{{}}中间的文本
  while ((match = tagRE.exec(text))) {
    index = match.index
    // push text token  压入前面的文本部分({{前面部分
    if (index > lastIndex) {
      rawTokens.push(tokenValue = text.slice(lastIndex, index))
      tokens.push(JSON.stringify(tokenValue))
    }
    // tag token 对表达式串解析是否含过滤器
    const exp = parseFilters(match[1].trim())
    tokens.push(`_s(${exp})`)
    rawTokens.push({ '@binding': exp })
    lastIndex = index + match[0].length
  }
  if (lastIndex < text.length) {//末尾的静态文本处理
    rawTokens.push(tokenValue = text.slice(lastIndex))
    tokens.push(JSON.stringify(tokenValue))
  }
  return {
    expression: tokens.join('+'),
    tokens: rawTokens
  }
}
