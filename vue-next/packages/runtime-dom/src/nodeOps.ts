import { RendererOptions } from '@vue/runtime-core'

export const svgNS = 'http://www.w3.org/2000/svg'

const doc = (typeof document !== 'undefined' ? document : null) as Document

let tempContainer: HTMLElement
let tempSVGContainer: SVGElement

export const nodeOps: Omit<RendererOptions<Node, Element>, 'patchProp'> = {
  //parent中在anchor之前插入child dom节点
  insert: (child, parent, anchor) => {
    parent.insertBefore(child, anchor || null)
  },
  // 移除dom节点
  remove: child => {
    const parent = child.parentNode
    if (parent) {
      parent.removeChild(child)
    }
  },
  // 创建dom节点,is表示动态的标签
  createElement: (tag, isSVG, is): Element =>
    isSVG
      ? doc.createElementNS(svgNS, tag)
      : doc.createElement(tag, is ? { is } : undefined),
  // 创建文本节点
  createText: text => doc.createTextNode(text),
  // 创建注释节点
  createComment: text => doc.createComment(text),
  // 设置文本节点的内容
  setText: (node, text) => {
    node.nodeValue = text
  },
  // 设置dom节点的文本内容
  setElementText: (el, text) => {
    el.textContent = text
  },
  // 获取父dom节点
  parentNode: node => node.parentNode as Element | null,
  // 获取兄弟dom节点
  nextSibling: node => node.nextSibling,
  // 查询dom节点
  querySelector: selector => doc.querySelector(selector),

  setScopeId(el, id) {
    el.setAttribute(id, '')
  },
  // 克隆节点
  cloneNode(el) {
    return el.cloneNode(true)
  },

  // __UNSAFE__
  // Reason: innerHTML.
  // Static content here can only come from compiled templates.
  // As long as the user only uses trusted templates, this is safe.
  // 插入静态的节点内容,使用的是innerHTML所以插入的内容必须是可信的
  // 如静态节点<li>1</li><li>2</li>会直接通过innnerHTML的方式快捷插入并不会创建一个个的dom节点
  insertStaticContent(content, parent, anchor, isSVG) {
    const temp = isSVG
      ? tempSVGContainer ||
        (tempSVGContainer = doc.createElementNS(svgNS, 'svg'))
      : tempContainer || (tempContainer = doc.createElement('div'))
    temp.innerHTML = content
    const first = temp.firstChild as Element
    let node: Element | null = first
    let last: Element = node
    while (node) {
      last = node
      nodeOps.insert(node, parent, anchor)
      node = temp.firstChild as Element
    }
    return [first, last]
  }
}
