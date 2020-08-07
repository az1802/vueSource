/* @flow */

import { dirRE, onRE } from './parser/index'

type Range = { start?: number, end?: number };

// these keywords should not appear inside expressions, but operators like
// typeof, instanceof and in are allowed
// 这些关键字不应出现在表达式中除了typeof,instanceof,in
const prohibitedKeywordRE = new RegExp('\\b' + (
  'do,if,for,let,new,try,var,case,else,with,await,break,catch,class,const,' +
  'super,throw,while,yield,delete,export,import,return,switch,default,' +
  'extends,finally,continue,debugger,function,arguments'
).split(',').join('\\b|\\b') + '\\b')

// these unary operators should not be used as property/method names
// 这些一元运算符不应用作属性/方法名
const unaryOperatorsRE = new RegExp('\\b' + (
  'delete,typeof,void'
).split(',').join('\\s*\\([^\\)]*\\)|\\b') + '\\s*\\([^\\)]*\\)')

// strip strings in expressions
const stripStringRE = /'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*\$\{|\}(?:[^`\\]|\\.)*`|`(?:[^`\\]|\\.)*`/g

// detect problematic expressions in a template
// 在模板中检测有问题的表达式
export function detectErrors (ast: ?ASTNode, warn: Function) {
  if (ast) {
    checkNode(ast, warn)
  }
}

/**
 * 递归检查AST树中的每一个节点
 */
function checkNode (node: ASTNode, warn: Function) {
  if (node.type === 1) {
    for (const name in node.attrsMap) {
      if (dirRE.test(name)) {
        const value = node.attrsMap[name] //指令对应的值
        if (value) {
          const range = node.rawAttrsMap[name] //带参数和修饰符的指令全称
          if (name === 'v-for') {
            checkFor(node, `v-for="${value}"`, warn, range)
          } else if (name === 'v-slot' || name[0] === '#') {
            checkFunctionParameterExpression(value, `${name}="${value}"`, warn, range)
          } else if (onRE.test(name)) {
            checkEvent(value, `${name}="${value}"`, warn, range)
          } else {
            checkExpression(value, `${name}="${value}"`, warn, range)
          }
        }
      }
    }
    if (node.children) {
      for (let i = 0; i < node.children.length; i++) {
        checkNode(node.children[i], warn)
      }
    }
  } else if (node.type === 2) {
    checkExpression(node.expression, node.text, warn, node)//检查文本节点中的表达式
  }
}

/**
 * 检查事件名称
 */
function checkEvent (exp: string, text: string, warn: Function, range?: Range) {
  const stripped = exp.replace(stripStringRE, '')
  const keywordMatch: any = stripped.match(unaryOperatorsRE)
  if (keywordMatch && stripped.charAt(keywordMatch.index - 1) !== '$') {
    warn(
      `avoid using JavaScript unary operator as property name: ` +
      `"${keywordMatch[0]}" in expression ${text.trim()}`,
      range
    )
  }
  checkExpression(exp, text, warn, range)
}

/**
 * 检查v-for指令各个部分的值是否合法
 */
function checkFor (node: ASTElement, text: string, warn: Function, range?: Range) {
  checkExpression(node.for || '', text, warn, range)
  checkIdentifier(node.alias, 'v-for alias', text, warn, range)
  checkIdentifier(node.iterator1, 'v-for iterator', text, warn, range)
  checkIdentifier(node.iterator2, 'v-for iterator', text, warn, range)
}

/**
 * v-for=(val,key,item) in obj
 * 使用 var a = _ 的方式检查v-for指令中(val,key,item)字符串的命名是否符合变量命名规范
 */
function checkIdentifier (
  ident: ?string,
  type: string,
  text: string,
  warn: Function,
  range?: Range
) {
  if (typeof ident === 'string') {
    try {
      new Function(`var ${ident}=_`)
    } catch (e) {
      warn(`invalid ${type} "${ident}" in expression: ${text.trim()}`, range)
    }
  }
}

/**
 *new Funtion 方式检查表达式是否有错误
 */
function checkExpression (exp: string, text: string, warn: Function, range?: Range) {
  try {
    new Function(`return ${exp}`)
  } catch (e) {
    const keywordMatch = exp.replace(stripStringRE, '').match(prohibitedKeywordRE)
    if (keywordMatch) {
      warn(
        `avoid using JavaScript keyword as property name: ` +
        `"${keywordMatch[0]}"\n  Raw expression: ${text.trim()}`,
        range
      )
    } else {
      warn(
        `invalid expression: ${e.message} in\n\n` +
        `    ${exp}\n\n` +
        `  Raw expression: ${text.trim()}\n`,
        range
      )
    }
  }
}

/**
 *new Funtion 方式检查exp作为函数参数是否合法
 */
function checkFunctionParameterExpression (exp: string, text: string, warn: Function, range?: Range) {
  try {
    new Function(exp, '')
  } catch (e) {
    warn(
      `invalid function parameter expression: ${e.message} in\n\n` +
      `    ${exp}\n\n` +
      `  Raw expression: ${text.trim()}\n`,
      range
    )
  }
}
