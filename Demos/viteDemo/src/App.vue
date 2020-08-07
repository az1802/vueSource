<template>
  <img alt="Vue logo" src="./assets/logo.png" />
  <HelloWorld msg="Hello Vue 3.0 + Vite" />
  <Test />
</template>

<script>
import HelloWorld from './components/HelloWorld.vue'
import Test from './components/test.vue'
import { provide, inject } from 'vue'
export default {
  name: 'App',
  setup(){
    provide("theme",{theme:"dark"});
  },
  components: {
    HelloWorld,
    Test
  }
}
</script>
