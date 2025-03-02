<script setup>
import NavBar from './components/NavBar.vue'
import { useRoute } from 'vue-router'
import { ref, onMounted } from 'vue'
import { useUserStore } from './stores/user'

const route = useRoute()
const isMobileView = ref(false)
const userStore = useUserStore()

const checkMobile = () => {
  isMobileView.value = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
}

onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)

  const savedUser = localStorage.getItem('user')
  const rememberMe = localStorage.getItem('rememberMe')
  
  if (savedUser && rememberMe === 'true') {
    try {
      const userData = JSON.parse(savedUser)
      userStore.setUser(userData, true)
      console.log('自动登录成功')
    } catch (error) {
      console.error('自动登录失败:', error)
      localStorage.removeItem('user')
      localStorage.removeItem('rememberMe')
    }
  }
})
</script>

<template>
  <NavBar v-if="route.path !== '/login'" />
  <div class="app-container" :class="{ 'login-page': route.path === '/login' }">
    <router-view></router-view>
  </div>
</template>

<style scoped>
/* 添加全局响应式基础样式 */
:root {
  --max-content-width: 1200px;
  --page-padding: 20px;
  --navbar-height: 60px;
  --content-margin-top: calc(var(--navbar-height) + 20px); /* 添加新变量 */
}

html, body {
  margin: 0;
  padding: 0;
  height: 100%;
  font-size: 16px;
}

@media (max-width: 768px) {
  :root {
    --page-padding: 10px;
  }
  
  html {
    font-size: 14px;
  }
}

.app-container {
  min-height: 100vh;
  background: #f5f7fa;
  padding: var(--page-padding);
  margin-top: var(--content-margin-top); /* 使用新变量 */
  box-sizing: border-box;
}

.app-container:not(.login-page) {
  padding-top: var(--navbar-height); /* 只添加顶部内边距 */
}

/* 通用响应式容器 */
.responsive-container {
  max-width: var(--max-content-width);
  margin: 0 auto;
  width: 100%;
  padding: 0 var(--page-padding);
  box-sizing: border-box;
}

/* 响应式网格系统 */
.grid {
  display: grid;
  gap: 20px;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
}

@media (max-width: 480px) {
  .grid {
    grid-template-columns: 1fr;
    gap: 10px;
  }
}

@media (max-width: 768px) {
  .app-container {
    padding-bottom: calc(var(--navbar-height) + 20px) !important;
  }
}

.logo {
  height: 6em;
  padding: 1.5em;
  will-change: filter;
  transition: filter 300ms;
}
.logo:hover {
  filter: drop-shadow(0 0 2em #646cffaa);
}
.logo.vue:hover {
  filter: drop-shadow(0 0 2em #42b883aa);
}
</style>
