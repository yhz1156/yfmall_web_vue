import { defineStore } from 'pinia'
import { ref } from 'vue'
import request from '../utils/request'
import { ElMessage } from 'element-plus'

export const useUserStore = defineStore('user', () => {
  const user = ref(null)
  const rememberMe = ref(false)

  // 初始化时从 localStorage 读取用户数据
  const initUser = () => {
    const savedUser = localStorage.getItem('user')
    const savedRememberMe = localStorage.getItem('rememberMe')
    if (savedUser && savedRememberMe === 'true') {
      try {
        user.value = JSON.parse(savedUser)
      } catch (error) {
        console.error('Failed to parse saved user:', error)
        localStorage.removeItem('user')
      }
    }
  }

  const setUser = (userData, remember = false) => {
    user.value = userData.customer || userData
    rememberMe.value = remember
    
    // 根据是否记住我来决定是否持久化存储
    if (remember) {
      localStorage.setItem('user', JSON.stringify(user.value))
      localStorage.setItem('rememberMe', 'true')
    } else {
      sessionStorage.setItem('user', JSON.stringify(user.value))
      localStorage.removeItem('user')
      localStorage.removeItem('rememberMe')
    }
  }

  const login = async (phone, password, remember = false) => {
    try {
      console.log('发送登录请求')
      const response = await request.post('/auth/login', { phone, password })
      console.log('登录响应:', response)

      if (response && response.message === '登录成功') {
        const userData = {
          ...response.data,
          role: 'customer'
        }
        setUser(userData, remember)
        ElMessage.success('登录成功')
        return true
      }
      
      ElMessage.error(response?.message || '登录失败')
      return false
    } catch (error) {
      console.error('登录错误:', error)
      ElMessage.error('登录失败：' + (error.response?.data?.message || '未知错误'))
      return false
    }
  }

  const logout = () => {
    user.value = null
    localStorage.removeItem('user')
    localStorage.removeItem('rememberMe')
    sessionStorage.removeItem('user')
  }

  // 初始化
  initUser()

  return {
    user,
    rememberMe,
    setUser,
    login,
    logout
  }
})