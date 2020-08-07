import { initMixin } from './init'
import { stateMixin } from './state'
import { renderMixin } from './render'
import { eventsMixin } from './events'
import { lifecycleMixin } from './lifecycle'
import { warn } from '../util/index'

/**
 * Vue类构造函数声明,内部调用_init方法初始化实例对象
 * @param (Object) options 组件的options声明
 */
function Vue (options) {
  if (process.env.NODE_ENV !== 'production' &&
    !(this instanceof Vue)
  ) {
    warn('Vue is a constructor and should be called with the `new` keyword')
  }
  this._init(options)
}

initMixin(Vue) //原型中添加_init方法
stateMixin(Vue) //原型中添加$set,$delete,$watch方法和$data,$props属性
eventsMixin(Vue) //原型中添加$on,$off,$once,$emit事件相关方法
lifecycleMixin(Vue) //原型中添加_update,$forceUpdate,$destroy组件更新摧毁方法
renderMixin(Vue) //原型中添加$nextTick,_render以及render函数执行所需方法

export default Vue
