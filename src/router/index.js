import { createRouter, createWebHashHistory } from 'vue-router' // 改用 hash 模式
import { ElMessage } from 'element-plus' // 添加这行导入

// 添加检测移动端的函数
const isMobile = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
}

const routes = [
  {
    path: '/',
    redirect: '/home',
    meta: { title: '云上商城 - 首页' }
  },
  {
    path: '/login',    // 修改登录路径
    name: 'login',
    component: () => import('../components/LoginPage.vue'),
    meta: { title: '云上商城 - 登录' }
  },
  {
    path: '/home',
    name: 'home',
    component: () => import('../components/ShopPage.vue'),
    meta: { title: '云上商城 - 首页' }
  },
  {
    path: '/snake',
    name: 'snake',
    component: () => import('../components/Snake.vue')
  },
  {
    path: '/products',
    name: 'products',
    component: () => import('../components/ProductList.vue')
  },
  {
    path: '/orders',
    name: 'orders',
    component: () => import('../components/OrderList.vue')
  },
  {
    path: '/product/:id',
    name: 'ProductDetail',
    component: () => import('../views/ProductDetail.vue')
  },
  {
    path: '/cart',
    name: 'cart',
    component: () => import('../views/CartPage.vue'),
    meta: { requiresAuth: true } // 添加需要认证的标记
  },
  {
    path: '/profile',
    name: 'profile',
    component: () => import('../views/ProfilePage.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/my-orders',
    name: 'myOrders',
    component: () => import('../views/MyOrders.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/payment',
    name: 'payment',
    component: () => import('../views/PaymentPage.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('../views/NotFound.vue'),
    meta: { title: '页面未找到' }
  }
]

const router = createRouter({
  history: createWebHashHistory(), // 改用 hash 模式
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    } else {
      return { top: 0 }
    }
  }
})

// 修改路由守卫，添加标题更新
router.beforeEach((to, from, next) => {
  // 更新页面标题
  document.title = to.meta.title || '云上商城'
  
  // 原有的认证逻辑
  const user = JSON.parse(localStorage.getItem('user'))
  if (to.meta.requiresAuth && !user) {
    console.log('需要认证但未登录，重定向到登录页')
    ElMessage.warning('请先登录')
    next('/login')
  } else {
    console.log('正常放行')
    next()
  }
})

// 添加错误处理
router.onError((error) => {
  console.error('路由错误:', error)
  if (error.message.includes('Failed to fetch dynamically imported module')) {
    window.location.reload()
  }
})

export default router