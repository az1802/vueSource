# Vue



### vue3使用


### 对比
vue2实例构造开销还是很大的.vue3使用proxy之后不会每一个属性都去defineProperty.而是通过代理拿到值直接返回。性能提升较大.
react实例构造开销较小尽量采取复用.


render函数中vue3把能提升的变量都提升到外部进行复用。这样每次运行render函数少了很多的变量声明。



Vue3对模块进行了充分的拆分,更好的支持tree shaking.


diff算法优化
1 内部加入shouldUpdateComponent;
2 key的diff优化，
3 blockchildren




其实 vue 一直都有很多相比 react 要好的实现方案：

响应式数据能更精准得进行节点更新
同时响应式数据能减少很多无谓的计算
composition api 相比较于 hooks 少了非常多的对象声明开销











### Vue3 Api及使用
reactive                    传入一个对象数据变为响应式
computed                    传入一个函数,返回一个值。当依赖发生变化时重新运行函数、
ref                         传入一个值变为响应式(使用.value进行访问)
readonly                    传入一个对象（响应式或普通）或 ref，返回一个原始对象的只读代理。一个只读的代理是“深层的”，对象内部任何嵌套的属性也都是只读的。
watchEffect                 立即执行传入的一个函数，并响应式追踪其依赖，并在其依赖变更时重新运行该函数。返回一个函数用于取消监听。

```javascript

```




### vite
Vite 是一个由原生 ESM 驱动的 Web 开发构建工具。在开发环境下基于浏览器原生 ES imports 开发，在生产环境下基于 Rollup 打包。

它主要具有以下特点：
快速的冷启动
即时的模块热更新
真正的按需编译


在浏览器中直接使用imprt export.
浏览器会识别添加 type="module"的 <script> 元素，浏览器会把这段内联 script 或者外链 script 认为是 ECMAScript 模块，浏览器将对其内部的 import 引用发起 http 请求获取模块内容。
```javascript
// hello.js
export default function () {
    console.log("hello world")
}

<script type="module">
    import sayHello from "./hello.js"    
    sayHello();
</script>
```
平时我们写代码，如果不是引用相对路径的模块，而是引用 node_modules 的模块，都是直接 import xxx from 'xxx'，由 Webpack 等工具来帮我们找这个模块的具体路径进行打包。但是浏览器不知道你项目里有 node_modules，它只能通过相对路径或者绝对路径去寻找模块。因此vite的核心功能拦截浏览器对模块的请求并且返回处理后的结果。
vite会帮我们将代码进行组装.实际上 vite 就是在按需加载的基础上通过拦截请求实现了实时按需编译
```javascript
// hello.js
import { createApp } from 'vue'
import App from './App.vue'
import './index.css'

createApp(App).mount('#app')

// 转变为
// 为了解决node_modules路径的问题加了@modules前缀。vite内部服务器koa中间件获取请求之后会去判断impor后面的资源路径是绝对路径还是相对路径。
// 绝对路径会视为npm模块

import { createApp } from '/@modules/vue.js'
import App from '/src/App.vue'
import '/src/index.css?import'

createApp(App).mount('#app')

```
