
import Bar from "../components/Bar.vue";
import Foo from "../components/Foo.vue"

// 路由配置信息
const routes = [
    { path: '/foo', component: Foo, name: "Foo" },
    { path: '/bar', component: Bar, name: "Bar" }
]


export default routes