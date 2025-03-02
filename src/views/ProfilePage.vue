<script setup>
import { ref, onMounted } from 'vue'
import { useUserStore } from '../stores/user'
import { ElMessageBox, ElMessage } from 'element-plus'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'  // 添加这行

const userStore = useUserStore()
const router = useRouter()
const { user } = storeToRefs(userStore)

// 获取用户信息
const fetchUserInfo = () => {
  console.log('Current user:', user.value) // 调试日志
  if (!user.value) {
    const storedUser = localStorage.getItem('user')
    if (storedUser) {
      try {
        user.value = JSON.parse(storedUser)
      } catch (error) {
        console.error('Failed to parse stored user:', error)
        router.push('/')
      }
    } else {
      ElMessage.error('请先登录')
      router.push('/')
    }
  }
}

// 退出登录
const handleLogout = async () => {
  try {
    await ElMessageBox.confirm('确定要退出登录吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    userStore.logout()
    router.push('/')
  } catch (error) {
    // 用户取消退出
  }
}

const getRoleTag = (identity) => {
  if (identity?.trim() === 'ADMIN') {
    return {
      type: 'danger',
      label: '管理员'
    }
  }
  return {
    type: 'info',
    label: '普通用户'
  }
}

onMounted(fetchUserInfo)
</script>

<template>
  <div class="profile-page">
    <el-card class="profile-card" v-if="user">
      <!-- 添加调试信息 -->
      <pre style="display: none">{{ JSON.stringify(user, null, 2) }}</pre>
      <template #header>
        <div class="header">
          <h2>个人信息</h2>
          <el-button type="danger" @click="handleLogout">退出登录</el-button>
        </div>
      </template>
      
      <div class="profile-content">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="用户ID">{{ user.id }}</el-descriptions-item>
          <el-descriptions-item label="电话">{{ user.phone }}</el-descriptions-item>
          <el-descriptions-item label="用户名">{{ user.name }}</el-descriptions-item>
          <el-descriptions-item label="角色">
            <el-tag :type="getRoleTag(user.identity).type">
              {{ getRoleTag(user.identity).label }}
            </el-tag>
          </el-descriptions-item>
        </el-descriptions>
      </div>
    </el-card>

    <div v-else class="loading-state">
      <el-empty description="未登录或加载中..." />
    </div>
  </div>
</template>

<style scoped>
.profile-page {
  padding: 20px;
  margin-top: 60px;
}

.profile-card {
  max-width: 800px;
  margin: 0 auto;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header h2 {
  margin: 0;
  color: #303133;
}

.profile-content {
  padding: 20px 0;
}

.loading-state {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 400px;
}
</style>
