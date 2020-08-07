/* @flow */

/**
 * Cross-platform code generation for component v-model
 * 组件上的v-model指令的代码生成(这里只是预处理)
 * <child  v-model.trim.number="msg"></child>
 * el.model={
 *   value:"(msg)",
 *   expression:"msg",
 *   callback:"function ($$v) {msg=_n((typeof $$v === 'string'? $$v.trim(): $$v))}"
 * }
 */
export function genComponentModel (
  el: ASTElement,
  value: string,
  modifiers: ?ASTModifiers
): ?boolean {
  const { number, trim } = modifiers || {}

  const baseValueExpression = '$$v'//函数参数
  let valueExpression = baseValueExpression
  if (trim) {
    valueExpression =
      `(typeof ${baseValueExpression} === 'string'` +
      `? ${baseValueExpression}.trim()` +
      `: ${baseValueExpression})`
  }
  if (number) {
    valueExpression = `_n(${valueExpression})`
  }
  const assignment = genAssignmentCode(value, valueExpression)

  //在AST节点上添加model属性,之后genData中会进一步去处理
  el.model = {
    value: `(${value})`,
    expression: JSON.stringify(value),
    callback: `function (${baseValueExpression}) {${assignment}}`
  }
}

/**
 * Cross-platform codegen helper for generating v-model value assignment code.
 * 返回赋值表达式
 * v-model=a[b]这种需要解析路径。路径方式会使用$set方式去赋值
 */
export function genAssignmentCode (
  value: string,
  assignment: string
): string {
  const res = parseModel(value)
  if (res.key === null) {
    return `${value}=${assignment}`
  } else {
    return `$set(${res.exp}, ${res.key}, ${assignment})`
  }
}

/**
 * Parse a v-model expression into a base path and a final key segment.
 * Handles both dot-path and possible square brackets.
 *
 * 对v-model指令绑定值可能存在的各种路径模式(.路径,[]路径)进行解析
 * Possible cases:
 *
 * - test
 * - test[key]
 * - test[test1[key]]
 * - test["a"][key]
 * - xxx.test[a[a].test1[key]]
 * - test.xxx.a["asa"][test1[key]]
 *
 */

let len, str, chr, index, expressionPos, expressionEndPos

type ModelParseResult = {
  exp: string,
  key: string | null
}

export function parseModel (val: string): ModelParseResult {
  // Fix https://github.com/vuejs/vue/pull/7730
  // allow v-model="obj.val " (trailing whitespace)
  val = val.trim()
  len = val.length

  if (val.indexOf('[') < 0 || val.lastIndexOf(']') < len - 1) {
    index = val.lastIndexOf('.')
    if (index > -1) {
      return {
        exp: val.slice(0, index),
        key: '"' + val.slice(index + 1) + '"'
      }
    } else {
      return {
        exp: val,
        key: null
      }
    }
  }

  str = val
  index = expressionPos = expressionEndPos = 0

  //最末级节点是[]的形式,找到末级[]开始和结束位置(0x5B为 [ 字符)
  while (!eof()) {
    chr = next()
    /* istanbul ignore if */
    if (isStringStart(chr)) {
      parseString(chr)
    } else if (chr === 0x5B) {
      parseBracket(chr)
    }
  }

  return {
    exp: val.slice(0, expressionPos),
    key: val.slice(expressionPos + 1, expressionEndPos)
  }
}

/**
 * 游标前进并返回下一个字符对应的编码数字
 */
function next (): number {
  return str.charCodeAt(++index)
}

/**
 * 路径解析当前游标位置是否已经到末尾
 */
function eof (): boolean {
  return index >= len
}

/**
 * 是否是字符串的起始位置
 * 0x22  "
 * 0x27  '
 */
function isStringStart (chr: number): boolean {
  return chr === 0x22 || chr === 0x27
}

/**
 * 0x5B  [
 * 0x5D  ]
 * inBracket 表示在[]的层数
 */
function parseBracket (chr: number): void {
  let inBracket = 1
  expressionPos = index
  while (!eof()) {
    chr = next()
    if (isStringStart(chr)) {
      parseString(chr)
      continue
    }
    if (chr === 0x5B) inBracket++
    if (chr === 0x5D) inBracket--
    if (inBracket === 0) {
      expressionEndPos = index
      break
    }
  }
}

/**
 * 不断的移动游标知道找到与chr( "  ' )对应的字符
 */
function parseString (chr: number): void {
  const stringQuote = chr
  while (!eof()) {
    chr = next()
    if (chr === stringQuote) {
      break
    }
  }
}
