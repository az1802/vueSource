/* @flow */

const fnExpRE = /^([\w$_]+|\([^)]*?\))\s*=>|^function(?:\s+[\w$]+)?\s*\(/
const fnInvokeRE = /\([^)]*?\);*$/
const simplePathRE = /^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*|\['[^']*?']|\["[^"]*?"]|\[\d+]|\[[A-Za-z_$][\w$]*])*$/

// KeyboardEvent.keyCode aliases
const keyCodes: { [key: string]: number | Array<number> } = {
  esc: 27,
  tab: 9,
  enter: 13,
  space: 32,
  up: 38,
  left: 37,
  right: 39,
  down: 40,
  'delete': [8, 46]
}

// KeyboardEvent.key aliases
const keyNames: { [key: string]: string | Array<string> } = {
  // #7880: IE11 and Edge use `Esc` for Escape key name.
  esc: ['Esc', 'Escape'],
  tab: 'Tab',
  enter: 'Enter',
  // #9112: IE11 uses `Spacebar` for Space key name.
  space: [' ', 'Spacebar'],
  // #7806: IE11 uses key names without `Arrow` prefix for arrow keys.
  up: ['Up', 'ArrowUp'],
  left: ['Left', 'ArrowLeft'],
  right: ['Right', 'ArrowRight'],
  down: ['Down', 'ArrowDown'],
  // #9112: IE11 uses `Del` for Delete key name.
  'delete': ['Backspace', 'Delete', 'Del']
}

// #4868: modifiers that prevent the execution of the listener
// need to explicitly return null so that we can determine whether to remove
// the listener for .once
// 针对不同的修饰符添加不同的代码,提前结束function的运行
const genGuard = condition => `if(${condition})return null;`

//不同的修饰符编码对应的代码字符串
const modifierCode: { [key: string]: string } = {
  stop: '$event.stopPropagation();',
  prevent: '$event.preventDefault();',
  self: genGuard(`$event.target !== $event.currentTarget`),
  ctrl: genGuard(`!$event.ctrlKey`),
  shift: genGuard(`!$event.shiftKey`),
  alt: genGuard(`!$event.altKey`),
  meta: genGuard(`!$event.metaKey`),
  left: genGuard(`'button' in $event && $event.button !== 0`),
  middle: genGuard(`'button' in $event && $event.button !== 1`),
  right: genGuard(`'button' in $event && $event.button !== 2`)
}

/**
 * todo 将事件数组转换为data参数字符串
 * 动态事件名 @[click-name]="say" -->  [click-name,say]
 * 静态事件名 @change="change"  -->  {"change":change}
 */
export function genHandlers (
  events: ASTElementHandlers,
  isNative: boolean
): string {
  const prefix = isNative ? 'nativeOn:' : 'on:'
  let staticHandlers = ``//静态事件名(名称会用"“包裹)
  let dynamicHandlers = ``//动态事件名
  for (const name in events) {
    const handlerCode = genHandler(events[name])
    if (events[name] && events[name].dynamic) {
      dynamicHandlers += `${name},${handlerCode},`
    } else {
      staticHandlers += `"${name}":${handlerCode},`
    }
  }
  staticHandlers = `{${staticHandlers.slice(0, -1)}}`
  if (dynamicHandlers) {
    return prefix + `_d(${staticHandlers},[${dynamicHandlers.slice(0, -1)}])`
  } else {
    return prefix + staticHandlers
  }
}

// Generate handler code with binding params on Weex
/* istanbul ignore next */
function genWeexHandler (params: Array<any>, handlerCode: string) {
  let innerHandlerCode = handlerCode
  const exps = params.filter(exp => simplePathRE.test(exp) && exp !== '$event')
  const bindings = exps.map(exp => ({ '@binding': exp }))
  const args = exps.map((exp, i) => {
    const key = `$_${i + 1}`
    innerHandlerCode = innerHandlerCode.replace(exp, key)
    return key
  })
  args.push('$event')
  return '{\n' +
    `handler:function(${args.join(',')}){${innerHandlerCode}},\n` +
    `params:${JSON.stringify(bindings)}\n` +
    '}'
}

/**
 * 将事件处理的值即绑定的函数部分根据值的类型和修饰符返回不同的代码字符串
 */
function genHandler (handler: ASTElementHandler | Array<ASTElementHandler>): string {
  if (!handler) {
    return 'function(){}'
  }
  // 数组形式的事件处理方法
  if (Array.isArray(handler)) {
    return `[${handler.map(handler => genHandler(handler)).join(',')}]`
  }
  //方法路径的判断,是不是以对象的方式查找某个方法a.a,a[a],a['a'] ,a["a"],[a].aa[a]
  const isMethodPath = simplePathRE.test(handler.value)
  //函数表达式function(){}或者(）=> {} 的形式
  const isFunctionExpression = fnExpRE.test(handler.value)

  //是否是函数调用的形式(change())
  const isFunctionInvocation = simplePathRE.test(handler.value.replace(fnInvokeRE, ''))

  //如果没有修饰符,是方法名或者函数表达式直接返回.否则像alert(1)表达式形式会用function包装再返回
  //存在修饰符需要处理对一些内置的修饰符做相应的代码处理
  if (!handler.modifiers) {
    if (isMethodPath || isFunctionExpression) {
      return handler.value
    }
    /* istanbul ignore if */
    if (__WEEX__ && handler.params) {
      return genWeexHandler(handler.params, handler.value)
    }
    return `function($event){${
      isFunctionInvocation ? `return ${handler.value}` : handler.value
    }}` // inline statement
  } else {
    let code = '' //整个代码字符串
    let genModifierCode = '' //存放修饰符相关的代码部分
    const keys = [] //压入修饰符中的一些键盘相关的修饰符 
    for (const key in handler.modifiers) {
      if (modifierCode[key]) {//内置修饰符的处理
        genModifierCode += modifierCode[key]
        // left/right
        if (keyCodes[key]) {//内置键码
          keys.push(key)
        }
      } else if (key === 'exact') {//exact表示事件触发需要额外的建码只能配合ctrl,shift,alt,meta使用
        const modifiers: ASTModifiers = (handler.modifiers: any)
        genModifierCode += genGuard(
          ['ctrl', 'shift', 'alt', 'meta']
            .filter(keyModifier => !modifiers[keyModifier])
            .map(keyModifier => `$event.${keyModifier}Key`)
            .join('||')
        )
      } else {
        keys.push(key)
      }
    }
    if (keys.length) { //根据键码生成键码的判断代码的字符串部分
      code += genKeyFilter(keys)
    }
    // Make sure modifiers like prevent and stop get executed after key filtering
    if (genModifierCode) {
      code += genModifierCode
    }
    const handlerCode = isMethodPath
      ? `return ${handler.value}($event)`
      : isFunctionExpression
        ? `return (${handler.value})($event)`
        : isFunctionInvocation
          ? `return ${handler.value}`
          : handler.value
    /* istanbul ignore if */
    if (__WEEX__ && handler.params) {
      return genWeexHandler(handler.params, code + handlerCode)
    }
    //code为键码和修饰符判断逻辑的代码，handlerCode是处理事件的代码
    return `function($event){${code}${handlerCode}}`
  }
}

/**
 * 根据键位码构造键位判断的字符串代码
 * 键位码的语句的判断是&&的关系 所以只要有一个键位码在其中就不会return null
 */
function genKeyFilter (keys: Array<string>): string {
  return (
    // make sure the key filters only apply to KeyboardEvents
    // #9441: can't use 'keyCode' in $event because Chrome autofill fires fake
    // key events that do not have keyCode property...
    `if(!$event.type.indexOf('key')&&` +
    `${keys.map(genFilterCode).join('&&')})return null;`
  )
}

/**
 * 单个键位码判断的字符串代码
 * "a"      -->  "_k($event.keyCode,"a",undefined,$event.key,undefined)"
 * "delete" -->  "_k($event.keyCode,"delete",[8,46],$event.key,["Backspace","Delete"])"
 */
function genFilterCode (key: string): string {
  const keyVal = parseInt(key, 10)//数字的形式的键位码处理
  if (keyVal) {
    return `$event.keyCode!==${keyVal}`
  }

  //字符串的形式
  const keyCode = keyCodes[key]
  const keyName = keyNames[key]
  return (
    `_k($event.keyCode,` +
    `${JSON.stringify(key)},` +
    `${JSON.stringify(keyCode)},` +
    `$event.key,` +
    `${JSON.stringify(keyName)}` +
    `)`
  )
}
