# vue源码解析

### vue2与Vue3对比
[vue2与3的差异](https://github.com/az1802/vueSource/blob/master/Vue2%E5%92%8CVue3%E4%BD%BF%E7%94%A8%E5%AF%B9%E6%AF%94.md)
使用方式上保留了大部分vue2的API只有少部分内容具有破坏性的更新。

### vue2源码注解
[vue2的源码注解](https://github.com/az1802/vueSource/tree/master/Vue2/src)

compiler-----------------template字符串转换为render函数<br>
core---------------------核心功能(内置组件,全局API,构造组件实例,数据响应式)<br>
&emsp;component-----------内置组件<br>
&emsp;global-api-------------全局API<br>
&emsp;instance---------------造组件实例<br>
&emsp;observer---------------数据响应式处理<br>
&emsp;util---------------------工具方法<br>
&emsp;vdom------------------虚拟dom相关的方法<br>
platforms----------------平台相关的节点操作方法(通过函数柯里化将不同的操作通过参数传入核心方法)<br>
sfc-----------------------vue单文件的处理<br>
shared-------------------不同平台公用的工具方法<br>

### vue3源码注解
vue3中将不同的功能(编译,数据响应式等独立为单独的包)使用lerna来管理多package项目。
[vue3源码注解](https://github.com/az1802/vueSource/tree/master/vue-next/packages)
compiler-core-----------------编译的核心部分(不同平台话的差异会通过参数进行注入)
compiler-dom-----------------编译过程dom相关的处理操作
compiler-sfc-------------------单vue文件的编译处理
compiler-ssr--------------------ssr渲染中的编译的处理
reactivity------------------------数据响应式的处理
runtime-core-------------------运行时核心功能
runtime-dom-------------------运行时与dom相关的操作部分
runtime-test--------------------测试相关
server-render-------------------服务器渲染
shared--------------------------公用的工具方法
size-check---------------------treeShaing之后包的大小检测
template-explorer-------------template字符串编译部分
vue-----------------------------主要入口


### 辅助工具
[正则表达式解析工具](https://regexper.com/)
[vue3模板解析](https://vue-next-template-explorer.netlify.app/)