# vite
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
