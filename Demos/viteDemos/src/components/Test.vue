<template>
  <div>llllllllllll</div>
</template>
<script>
import Bar from "./Bar.vue";
export default {
  data() {
    return {};
  },
  setup() {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        resolve(Bar);
      }, 3000);
    });
  },
};
</script>
<style scoped>
</style>