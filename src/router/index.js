import { createRouter, createWebHistory } from 'vue-router'
import Login from '../components/Login.vue'
import Patrol from '../components/Patrol.vue'
import InspectionForm from '../components/InspectionForm.vue'

const routes = [
    {
        path: '/',
        redirect: '/login' // 根路径重定向到登录页
    },
    {
        path: '/login',
        name: 'Login',
        component: Login
    },
    {
        path: '/login/:area',
        name: 'LoginWithArea',
        component: Login,
        props: true // 添加props支持，确保参数传递
    },
    {
        path: '/patrol/:area',
        name: 'Patrol',
        component: Patrol,
        props: true
    },
    {
        path: '/inspection-form/:area',
        name: 'InspectionForm',
        component: InspectionForm,
        props: true
    },
    // 添加404处理
    {
        path: '/:pathMatch(.*)*',
        redirect: '/login'
    }
]

const router = createRouter({
    history: createWebHistory(),
    routes
})

export default router