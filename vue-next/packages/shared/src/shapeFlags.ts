// vnode节点的类型
export const enum ShapeFlags {
  ELEMENT = 1, //普通元素节点
  FUNCTIONAL_COMPONENT = 1 << 1, //函数形式组件
  STATEFUL_COMPONENT = 1 << 2,//对象形式组件
  TEXT_CHILDREN = 1 << 3, //文本形式子节点
  ARRAY_CHILDREN = 1 << 4, //数组形式子节点
  SLOTS_CHILDREN = 1 << 5, //插槽子节点
  TELEPORT = 1 << 6,// teleport组件
  SUSPENSE = 1 << 7,//suspense组件
  COMPONENT_SHOULD_KEEP_ALIVE = 1 << 8, //组件是否保存状态不被销毁
  COMPONENT_KEPT_ALIVE = 1 << 9,
  COMPONENT = ShapeFlags.STATEFUL_COMPONENT | ShapeFlags.FUNCTIONAL_COMPONENT //组件
}
