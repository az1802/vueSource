# Vue2与Vue3使用对比

### 初始化使用
Vue3不在提供Vue类,需要利用createApp创建vue实例对象然后执行mount方法进行挂载
```javascript
// vue2
import Vue from "vue";
import App from './App.vue'

new Vue({
  render: (h) => h(App)
}).$mount("#app");


// Vue3
import { createApp } from 'vue'
import App from './App.vue'

createApp(App).mount('#app')
```
### setup
新增setup函数选项,作为在组件内使用 Composition API 的入口点。会在初始化props和slots之后进行调用,beforeCreate还要早。提供两个参数props,context。根据其返回不同的结果会进行不同的处理。函数会作为render函数,对象则会作为data将其key挂载到执行ctx上,便于render函数运行时调用。
```javascript
export default {
  props: {
    name: String,
  },
  setup(props,context) {
    let state = reactive({
        count:1
    });
    return {
        ...toRefs(state)
    }
  },
}
```
### 全局配置
vue3不再提供全局的config配置,需要配置在组件实例对象上。vue3可以为每一个不同的app实例配置不同的全局设置
```javascript
// vue2
Vue.config.devtools = true
// vue3
app.config.devtools = true  
// 之前的配置采取的是Vue.config
const app = Vue.createApp({})
app.config = {
    devtools: true,//开发者工具
    errorHandler(err, vm, info) {//自定义错误处理
        console.log("errorHandler -> err, vm, info", err, vm, info)
    },
    warnHandler(err, vm, info) {//自定义警告信息处理
        console.log("warnHandler -> err, vm, info", err, vm, info)
    },
    globalProperties: {//配置组件实例的全局属性
        global: "全局属性"
    },
    isCustomElement: (tag) => {  //是否是自定义的元素

    },
    optionMergeStrategies() {  //自定义某个options参数的合并策略

    },
    performance: false //开启性能标记,组件的create render patch都将存在时间的记录
}
app.mount('#app')
```
### 生命周期
vue3新增了onRenderTracked,onRenderTriggered钩子函数用于跟踪数据的变化.同时提供了函数形式的生命周期方法注入。便于在setup中使用。
activated -> onActivated
deactivated -> onDeactivated              
beforeCreate -> use setup()
created -> use setup()
beforeMount -> onBeforeMount
mounted -> onMounted
beforeUpdate -> onBeforeUpdate
updated -> onUpdated
beforeUnmount -> onBeforeUnmount
unmounted -> onUnmounted
errorCaptured -> onErrorCaptured                 子组件运行错误时会触发此钩子函数
renderTracked -> onRenderTracked                运行人render函数时当调用某个数据会触发此钩子函数记录那些值进行了使用
renderTriggered -> onRenderTriggered            当数据更新时操作了哪些值使得render函数重新更新
### 响应式系统
vue3提供reactive,ref用于将数据响应化处理.vue2只能通过配置data.通过函数的形式将数据变为响应式.这样可以更利于逻辑进行函数式的分离。
toRefs将响应式对象里的key,valu用ref处理这样便于解构赋值的使用.
```javascript
function useMousePosition() {
    const pos = reactive({
        x: 0,
        y: 0,
      })
    const count = ref(0)
    return {
        ...toRefs(pos),
        count
    }
}
```
### 计算属性
Vue3提供computed函数用于创建计算属性。参数使用方式与vue2一样
```javascript
export default{
    setup(){
        const count = ref(1)
       
        const doubleCount = computed(() => count.value * 2)
        
        const doubleCount = computed({
            get: () => count.value * 2,
            set: (val) => {
                count.value = val/2
            },
        })
        return {
            count,
            doubleCount
        }
    }
}
```
### watch与watchEffect
watch与watchEffect 在手动停止,副作用无效,刷新即使,调试方面共享行为。
watch相比于watchEffect:
1 懒散地执行副作用
2 更具体地说明什么状态应该触发观察者重新运行
3 访问被监视状态的先前值和当前值
```javascript

// watchEffect会在setup初始化运行的时候执行一次,进行依赖收集.当运行时内部的响应式数据发生变化之后就会再次执行副作用函数
let count = ref(1);
watchEffect(()=>{
    count.value++;
})

// 当使用watch观察单个值的时候,第一个值需要使用函数的形式
const state = reactive({ count: 0 })
watch(
  () => state.count,
  (count, prevCount) => {
    /* ... */
  }
)
//watch观察单个值时,ref形式可以直接使用
const count = ref(0)
watch(count, (count, prevCount) => {
  /* ... */
})
// 观察多个源执行同一个方法
watch([fooRef, barRef], ([foo, bar], [prevFoo, prevBar]) => {
  /* ... */
})
```
### provide/inject
vue3新增了provide,inject函数用于在setup函数中。
```javascript
app.component('todo-list', {
  data() {
    return {
      todos: ['Feed a cat', 'Buy tickets']
    }
  },
//   provide: { 
//     user: 'John Doe'
//   }, 
//   provide: { //想返回一个响应式的值需要使用函数的形式
//     todoLength: this.todos.length // this will result in error 'Cannot read property 'length' of undefined`
//   },
  provide() {
    return {
        // 这种情形返回的值不是响应式的,父级改变之后子级并不会发生变化.可以通过对象的形式绕过去但是部件以
        // 需要响应式则采取 computed将提供的值变为响应式
      todoLength: this.todos.length
    }
  },
  template: `
    <div>
      {{ todos.length }}
      <!-- rest of the template -->
    </div>
  `
})
```
vue3中provide,inject函数的使用
```javascript
import { provide, inject } from 'vue'

const RootComponent = {
  setup() {
    //向子组件提供数据
    provide('count', 1);
  }
}

const childComponent = {
  setup() {
    //第二个参数为默认值
    const count = inject('count',0)
    return {
      count
    }
  }
}
```
### 新增内置组件(teleport,suspense)
挂载到同一容器下会按照顺序放入到容器中
```html
<teleport to="">
  <div>A</div>
</teleport>
<teleport to="body">
  <div>B</div>
</teleport>
```
### 组件注册
 vue2可以进行全局的组件注册,vue3组件注册均采用在实例对象上注册
```javascript
// vue2
Vue.component('my-component', { /* ... */ }) 

// vue3
const app = createApp({})

// 注册组件，传入一个选项对象
app.component('my-component', {
  /* ... */
})
```
### 指令
vue2指令可以注册在全局和局部。vue3指令只能注册在实例对象上。注册的钩子函数名称全部发生了改变
```javascript
// vue2中指令的钩子函数
Vue.directive('demo', {
  bind: function (el, binding, vnode) { //只调用一次即在绑定的时候进行调用

  },
  insert(){//被绑定元素插入父节点时调用 (仅保证父节点存在，但不一定已被插入文档中)。

  },
  update(){//但是可能发生在其子 VNode 更新之前。指令的值可能发生了改变，也可能没有

  },
  componentUpdated(){ //全部更新之后

  },
  unbind(){ //解绑的时候调用 对应vue3的unmounted

  },
})

// vue3指令的使用
const app = Vue.createApp({})
// Register a global custom directive called `v-focus`
app.directive('focus', {
  beforeMount(){},
  // When the bound element is mounted into the DOM...
  mounted(el) {
    // Focus the element
    el.focus()
  },
  beforeUpdate(){},
  updated(){},
  beforeUnmount(){},
  unmounted(){},
})
```
指令的多种使用方式
```html
<!-- 动态指令 -->
<a v-bind:[attributeName]="url"> ... </a>

<!-- 事件的监听支持多种形式 -->
<!-- 执行语句 -->
<button @click="counter += 1">Add 1</button> 
<!-- 执行方法 -->
<button @click="greet">Greet</button>
<!-- 内联执行 -->
<button @click="say('hi')">Say hi</button>
<!-- 执行多个方法 -->
<button @click="one($event), two($event)">Submit</button>
```
v-model指令内置绑定值和更新事件发生了变化
```html
<!-- vue2中组件上使用v-model.值使用value,事件使用input -->
<input
      v-bind:value="value"
      v-on:input="$emit('input', $event.target.value)"
>
<!-- vue3中值使用modelValue,事件使用update:modelValue -->
 <input
      :value="modelValue"
      @input="$emit('update:modelValue', $event.target.value)"
>
```
### slots使用
```html
<!-- 修饰符表示插槽的名称  值表示插槽的作用域 -->
<todo-list>
  <template v-slot:default="slotProps">
    <i class="fas fa-check"></i>
    <span class="green">{{ slotProps.item }}<span>
  </template>
</todo-list>
<!-- 值可以是合法的js表达式,这里的内容会作为参数字符串传入到作用域插槽的render函数中去 -->
<todo-list>
  <template v-slot:default="{item}">
    <i class="fas fa-check"></i>
    <span class="green">{{item }}<span>
  </template>
</todo-list>
<!-- 动态插槽 -->
<base-layout>
  <template v-slot:[dynamicSlotName]>
    ...
  </template>
</base-layout>
<!-- 插槽指令的简写  -->
<template #header> 
    <h1>Here might be a page title</h1>
</template>
<!-- 指令的简写模式必须带插槽名称 -->
<todo-list #default="{ item }">
  <i class="fas fa-check"></i>
  <span class="green">{{ item }}<span>
</todo-list>
```
### 全局API
defineComponent                     定义组件
defineAsyncComponent                定义异步组件
resolveComponent                    查找组件
resolveDynamicComponent             查找异步组件
resolveDirective                    查找注册的指令
withDirectives                      对vnode节点执行指令然后返回操作后的vnode节点
createRenderer                      创建render函数
```javascript
import { createRenderer } from 'vue'
const { render, createApp } = createRenderer<Node, Element>({
  patchProp,
  ...nodeOps
})
```
nextTick                            下一个事件循环中执行回调
### 异步组件的使用
异步组件建议在父级组件中包裹Suspense,提供了新的API定义异步组件
```javascript
const app = Vue.createApp({})

// const AsyncComp = defineAsyncComponent(() =>
//   import('./components/AsyncComponent.vue')
// )
const AsyncComp = Vue.defineAsyncComponent(
  () =>
    new Promise((resolve, reject) => {
      resolve({
        template: '<div>I am async!</div>'
      })
    })
)

app.component('async-example', AsyncComp)
```
### 新增事件的验证
TODO  emits返回false没有起作用
```html
<!-- v-model 自定义修饰符 -->
<div id="app">
  <my-component v-model.capitalize="myText"></my-component>
  {{ myText }}
</div>
<script>
const app = Vue.createApp({
  data() {
    return {
      myText: ''
    }
  }
})

app.component('my-component', {
  props: {
    modelValue: String,
    modelModifiers: { //必须要包含此配置否则this里面不含有modelModifiers
      default: () => ({})
    }
  },
  methods: {
    emitValue(e) {
      let value = e.target.value
      if (this.modelModifiers.capitalize) { //根据修饰符处理内容不具有通用性
        value = value.charAt(0).toUpperCase() + value.slice(1)
      }
      this.$emit('update:modelValue', value)
    }
  },
  template: `<input
    type="text"
    :value="modelValue"
    @input="emitValue">`
})

app.mount('#app')
</script>
```
### Vue3相比于Vue2的优化
1 vue2实例构造开销还是很大的.vue3使用proxy之后不会每一个属性都去defineProperty.而是通过代理拿到值直接返回。性能提升较大.
2 render函数中vue3把能提升的变量都提升到外部进行复用。这样每次运行render函数少了很多的变量声明。
3 vue2会在一开始就会将所有的data进行响应式处理无论是否会使用到,采用闭包的方式存放dep。Vue3响应式采取了proxy的方式。同时只有真正访问的内部数据的时候才会去响应式处理子级对象,同时dep的管理方式采用set+map的形式。
4 Vue3对模块进行了充分的拆分,更好的支持tree shaking.
5 diff算法优化
  1 内部加入shouldUpdateComponent;
  2 key的diff优化，
  3 blockchildren可以更快的进行path
