<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import { useUserStore } from '../stores/user'
import { useCartStore } from '../stores/cart'
import { Shop } from '@element-plus/icons-vue'  // 添加图标导入

const route = useRoute()
const userStore = useUserStore()
const cartStore = useCartStore()
const isCollapse = ref(false)
const isMobileMenuOpen = ref(false)

// 导航项配置
const navItems = computed(() => {
  const items = [
    { path: '/home', icon: 'House', label: '首页' },
    { 
      path: '/cart', 
      icon: 'ShoppingCart', 
      label: '购物车', 
      badge: cartStore.cart.length // 直接使用 cart.length 而不是 computed
    },
    { path: '/profile', icon: 'User', label: '我的' },
  ]

  // 如果是管理员，添加管理功能
  if (userStore.user?.identity?.trim() === 'ADMIN') {
    items.splice(1, 0, 
      { path: '/products', icon: 'Goods', label: '商品', adminOnly: true },
      { path: '/orders', icon: 'Document', label: '订单', adminOnly: true }
    )
  } else {
    // 非管理员显示我的订单
    items.splice(2, 0, { path: '/my-orders', icon: 'List', label: '订单' })
  }

  return items
})

// 检测是否是移动设备
const isMobile = ref(false)

const checkMobile = () => {
  isMobile.value = window.innerWidth <= 768
}

onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', checkMobile)
})
</script>

<template>
  <div :class="{ 'mobile-nav': isMobile, 'desktop-nav': !isMobile }">
    <!-- 桌面端导航栏 -->
    <nav v-if="!isMobile" class="navbar">
      <div class="nav-container">
        <router-link to="/home" class="logo">
          <el-icon><Shop /></el-icon>
          <span class="logo-text">购物商城</span>
        </router-link>

        <div class="nav-menu">
          <router-link
            v-for="item in navItems"
            :key="item.path"
            :to="item.path"
            class="nav-item"
            :class="{ 'admin-item': item.adminOnly, active: route.path === item.path }"
          >
            <el-badge v-if="item.badge" :value="item.badge" :hidden="!item.badge">
              <el-icon><component :is="item.icon" /></el-icon>
            </el-badge>
            <el-icon v-else><component :is="item.icon" /></el-icon>
            <span>{{ item.label }}</span>
          </router-link>

          <!-- 用户信息/登录按钮 -->
          <div class="user-section">
            <template v-if="userStore.user">
              <el-dropdown trigger="click">
                <div class="user-info">
                  <el-avatar :size="32">{{ userStore.user.name?.[0] }}</el-avatar>
                  <span class="username">{{ userStore.user.name }}</span>
                </div>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item @click="$router.push('/profile')">
                      <el-icon><User /></el-icon>个人中心
                    </el-dropdown-item>
                    <el-dropdown-item @click="userStore.logout">
                      <el-icon><SwitchButton /></el-icon>退出登录
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </template>
            <template v-else>
              <el-button type="primary" @click="$router.push('/login')">
                登录/注册
              </el-button>
            </template>
          </div>
        </div>
      </div>
    </nav>

    <!-- 移动端底部导航栏 -->
    <nav v-else class="mobile-navbar">
      <router-link
        v-for="item in navItems"
        :key="item.path"
        :to="item.path"
        class="mobile-nav-item"
        :class="{ 'admin-item': item.adminOnly, active: route.path === item.path }"
      >
        <el-badge
          v-if="item.badge"
          :value="item.badge"
          :hidden="item.badge === 0"
          :max="99"
        >
          <el-icon><component :is="item.icon" /></el-icon>
        </el-badge>
        <el-icon v-else><component :is="item.icon" /></el-icon>
        <span>{{ item.label }}</span>
      </router-link>
    </nav>
  </div>
</template>

<style scoped>
/* 桌面端样式 */
.desktop-nav .navbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: var(--navbar-height);
  background: white;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  z-index: 1000;
}

.nav-container {
  max-width: var(--max-content-width);
  margin: 0 auto;
  height: 100%;
  display: flex;
  align-items: center;
  padding: 0 var(--page-padding);
}

.logo {
  display: flex;
  align-items: center;
  gap: 8px;
  text-decoration: none;
  color: var(--el-color-primary);
  font-size: 1.2em;
  font-weight: bold;
}

/* 移除 logo-image 样式，不再需要 */

.nav-menu {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-left: auto;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  text-decoration: none;
  color: #606266;
  border-radius: 20px;
  transition: all 0.3s;
}

.nav-item:hover {
  color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
}

.nav-item.active {
  color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
  font-weight: 500;
}

.nav-badge :deep(.el-badge__content) {
  transform: translate(50%, -50%) scale(0.8);
}

.user-section {
  margin-left: 20px;
  padding-left: 20px;
  border-left: 1px solid #eee;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 20px;
  transition: all 0.3s;
}

.user-info:hover {
  background: var(--el-color-primary-light-9);
}

.mobile-toggle {
  display: none;
  background: none;
  border: none;
  cursor: pointer;
  padding: 8px;
  margin-left: auto;
}

@media (max-width: 768px) {
  .mobile-toggle {
    display: block;
  }

  .nav-menu.menu-open .nav-item {
    display: flex !important; /* 强制显示 */
  }
  .nav-menu {
    position: fixed;
    top: var(--navbar-height);
    left: 0;
    right: 0;
    background: white;
    flex-direction: column;
    padding: 20px;
    gap: 15px;
    transform: translateY(-100%);
    transition: transform 0.3s ease;
    box-shadow: 0 4px 8px rgba(0,0,0,0.1);
  }

  .nav-menu.menu-open {
    transform: translateY(0);
  }

  .nav-item {
    width: 100%;
    justify-content: center;
  }

  .user-section {
    margin: 0;
    padding: 0;
    border: none;
    width: 100%;
    display: flex;
    justify-content: center;
  }

  .logo-text {
    display: none;
  }


}

.admin-item {
  color: var(--el-color-danger);
}

.admin-item:hover,
.admin-item.active {
  color: var(--el-color-danger);
  background: var(--el-color-danger-light-9);
}

/* 移动端样式 */
.mobile-navbar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 56px;
  background: white;
  box-shadow: 0 -2px 8px rgba(0,0,0,0.1);
  display: flex;
  justify-content: space-around;
  align-items: center;
  z-index: 1000;
}

.mobile-nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  text-decoration: none;
  color: #909399;
  padding: 4px 0;
  flex: 1;
}

.mobile-nav-item span {
  font-size: 12px;
}

.mobile-nav-item.active {
  color: var(--el-color-primary);
}

.mobile-nav-item.admin-item {
  color: var(--el-color-danger);
}

.mobile-nav-item.admin-item.active {
  color: var(--el-color-danger);
}

.mobile-nav-item :deep(.el-badge__content) {
  transform: translate(40%, -40%) scale(0.8);
  z-index: 1;
}

/* 为移动端底部导航腾出空间 */
:deep(.app-container) {
  padding-bottom: 76px !important; /* 56px导航栏 + 20px间距 */
}

.mobile-nav-item .el-icon {
  font-size: 24px;
  height: 24px;
  width: 24px;
  margin-bottom: 4px;
}
</style>