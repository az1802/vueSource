# vue-router
router的使用方式存在较多大的改动

router-link组件不再支持tag  event等属性采用作用域插槽的形式生成内部的内容
1 使用作用域插槽,提供一些状态值和方法让用户可以自定义内部的内容和行为
2 custom属性表示是否呈现自带的包装元素a标签。
router-view组件同样采取作用域插槽来显示内部的内容
```html
 <router-link to="/foo" custom v-slot="{ href, navigate, isActive }">
  <li :class="{ active: isActive }">
    <a :href="href" @click="navigate"> foo {{ isActive }} </a>
  </li>
</router-link>

<router-view v-slot="{ Component ,route}">
  <transition>
    <keep-alive>
      <component :is="Component" />
    </keep-alive>
  </transition>
</router-view>
```