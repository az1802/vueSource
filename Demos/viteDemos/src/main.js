import "./reset.css"
import { createApp } from 'vue'
import App from './App.vue'
import './index.css'
import { createRouter, createWebHistory } from 'vue-router'
import routes from "./Routes/route"


// 3. 创建 router 实例，然后传 `routes` 配置
const router = createRouter({
    history: createWebHistory(),
    routes,
})

const app = createApp(App);
app.use(router)
app.mount('#app')
