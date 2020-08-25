<template>
  <h1>vue3示例</h1>
  <!-- <ul>
    <router-link
      custom
      v-slot="{ href, navigate, isActive }"
      v-for="routeItem in routes"
      :to="routeItem.path"
    >
      <li :class="{ active: isActive }">
        <a :href="href" @click="navigate"> {{ routeItem.name }} </a>
      </li>
    </router-link>
  </ul>
  <router-view v-slot="{ Component, route }">
    <transition>
      <keep-alive>
        <component :is="Component" />
      </keep-alive>
    </transition>
  </router-view> -->
  <Suspense>
    <template #default>
      <AsyncCom />
      <div>123</div>
    </template>
    <template #fallback>
      <div>Loading...</div>
    </template>
  </Suspense>
</template>

<script>
import routes from "./Routes/route";
import AsyncCom from "./components/Test.vue";
export default {
  name: "App",
  components: {
    AsyncCom,
  },
  setup() {
    return {
      routes,
    };
  },
};
</script>
