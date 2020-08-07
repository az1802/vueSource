<template>
  <h1>{{ msg }}</h1>
  <button @click="addCount"   @click="addCount2" >count is: {{ state.count }}</button>
  <p>doubleCount---{{doubleCount}}</p>
  <p>
    Edit <code>components/HelloWorld.vue</code> to test hot module replacement.
  </p>
</template>

<script>
import { toRaw,provide, inject ,reactive,h ,watchEffect,watch,computed,onBeforeMount,onMounted,onBeforeUpdate,onUpdated,onBeforeUnmount,onUnmounted,onRenderTracked,onRenderTriggered} from "vue";
export default {
  name: "HelloWorld",
  props: {
    msg: String,
  },
  setup(props,context) {
    const state = reactive({
      count: 10,
    });
    // 初始运行会运行一次watchEffect函数,会在mounted之前运行
   let stop = watchEffect((onInvalidate) => {
    console.log("setup -> context", context)
      console.log(`name is: ${JSON.stringify(props)}`);
      state.count;
      onInvalidate(()=>{
        // 会先运行这个函数 再去执行监听函数内部的逻辑,所以这里可以放一些判断的逻辑取消监听函数内部的一些异步操作
        console.log("取消")
      })
    },
    {
      onTrack(){
        // 当一个 reactive 对象属性或一个 ref 作为依赖被追踪时，将调用 onTrack
      },
      onTrigger(){
        // 依赖项变更导致副作用被触发时，将调用 onTrigger
      }
    // flush: 'sync',
    //  flush: 'pre',
    //  flush: 'post',
  })

watch(()=>state.count,(count,prevCount)=>{
  console.log("watch-----",count,prevCount)
})

    function addCount(e) {
      e.stopImmediatePropagation()
      state.count++;
    }

    setTimeout(()=>{
      // stop()
    },2000)


    // 计算属性
    let doubleCount = computed(()=>{
      return  state.count*2;
    })

    // 声明周期相关
    //   onBeforeMounted(() => {
    //   console.log('BeforeMounted!')
    // })
     onMounted(() => {
      console.log('mounted!')
    })
    //   onBeforeUpdate(() => {
    //   console.log('onBeforeUpdate!')
    // })
    onUpdated(() => {
      console.log('updated!')
    })
    // onBeforeUnmount(() => {
    //   console.log('onBeforeUnmount!')
    // })
    onUnmounted(() => {
      console.log('unmounted!')
    })
    onRenderTracked(()=>{
      console.log('onRenderTracked!')
    })
    onRenderTriggered(()=>{
      console.log('onRenderTriggered!')
    })

    // 
    let theme = inject("themea",{default:"derfault"})
    console.log(theme);

    const foo = {a:"aaa"};
    const reactiveFoo = reactive(foo);
    console.log(reactiveFoo.a);
    toRaw(reactiveFoo).a="bbbb";
    console.log(reactiveFoo.a);

    function addCount2(){
      console.log(222)
    }

    return {
      state,
      addCount,
      addCount2,
      doubleCount
    }; 
  },
  urdata() {
    return {
      // count: 10,
    };
  },
};
</script>
