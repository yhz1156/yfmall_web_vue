<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/user'
import { ElMessage } from 'element-plus'
import request from '../utils/request'

const router = useRouter()
const userStore = useUserStore()

// 添加注册表单数据 (修改这里，直接使用对象而不是 reactive)
const registerForm = ref({
  name: '',
  email: '',
  password: '',
  phone: '',
  address: ''
})

// 修改登录表单数据对象
const loginForm = reactive({
  phone: '',  // 改为手机号
  password: '',
  remember: true
})

// 修改表单验证规则
const formRules = {
  // 登录表单规则
  loginPhone: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号码', trigger: 'blur' }
  ],
  loginPassword: [
    { required: true, message: '请输入密码', trigger: 'blur' }
  ],
  // 注册表单规则
  name: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 2, max: 20, message: '长度在 2 到 20 个字符', trigger: 'blur' }
  ],
  phone: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号码', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码长度至少 6 个字符', trigger: 'blur' }
  ],
  // 选填项规则（仅格式验证）
  email: [
    { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' }
  ]
}

const registerFormRef = ref(null)
const loginFormRef = ref(null)

const activeTab = ref('login')
const loading = ref(false)

// 修改注册处理方法
const handleRegister = async () => {
  if (!registerFormRef.value) return

  try {
    await registerFormRef.value.validate()
    loading.value = true
    
    // 修改数据处理方式
    const registerData = {
      name: registerForm.value.name?.trim(),
      phone: registerForm.value.phone?.trim(),
      password: registerForm.value.password,
      email: registerForm.value.email?.trim() || undefined,
      address: registerForm.value.address?.trim() || undefined
    }

    // 过滤掉 undefined 值
    const cleanData = Object.fromEntries(
      Object.entries(registerData).filter(([_, v]) => v != null)
    )

    console.log('注册数据:', cleanData) // 添加调试日志

    const response = await request.post('/auth/register', cleanData)
    
    if (response.message === '注册成功') {
      ElMessage.success('注册成功')
      // 自动填充登录表单
      loginForm.phone = registerForm.value.phone
      // 切换到登录标签页
      activeTab.value = 'login'
      // 重置注册表单
      registerFormRef.value.resetFields()
    }
  } catch (error) {
    console.error('注册失败:', error)
    ElMessage.error(error.response?.data?.message || '注册失败')
  } finally {
    loading.value = false
  }
}

const loginLoading = ref(false)

// 修改登录处理方法
const handleLogin = async () => {
  if (!loginFormRef.value) return
  
  try {
    await loginFormRef.value.validate()
    loginLoading.value = true
    // 传入 remember 参数
    const success = await userStore.login(
      loginForm.phone, 
      loginForm.password,
      loginForm.remember
    )
    if (success) {
      router.push('/home')  // 修复这行代码
    }
  } catch (error) {
    if (error.name !== 'ValidationError') {
      console.error('Login error:', error)
      ElMessage.error('登录失败，请检查手机号和密码')
    }
  } finally {
    loginLoading.value = false
  }
}
</script>

<template>
  <div class="login-container">
    <div class="login-box">
      <div class="login-header">
        <el-icon :size="40" color="var(--el-color-primary)"><Shop /></el-icon>
        <h2>购物商城</h2>
      </div>

      <el-tabs v-model="activeTab" class="login-tabs">
        <!-- 登录表单 -->
        <el-tab-pane label="账号登录" name="login">
          <el-form
            ref="loginFormRef"
            :model="loginForm"
            :rules="formRules"
            @submit.prevent="handleLogin"
          >
            <el-form-item prop="phone">
              <el-input
                v-model="loginForm.phone"
                placeholder="请输入手机号"
                type="text"
                size="large"
                maxlength="11"
              >
                <template #prefix>
                  <el-icon><Iphone /></el-icon>
                </template>
              </el-input>
            </el-form-item>

            <el-form-item prop="password">
              <el-input
                v-model="loginForm.password"
                placeholder="请输入密码"
                type="password"
                size="large"
                show-password
                @keyup.enter="handleLogin"
              >
                <template #prefix>
                  <el-icon><Lock /></el-icon>
                </template>
              </el-input>
            </el-form-item>

            <el-form-item>
              <div class="login-options">
                <el-checkbox v-model="loginForm.remember">记住我</el-checkbox>
                <el-link type="primary">忘记密码？</el-link>
              </div>
            </el-form-item>

            <el-form-item>
              <el-button
                type="primary"
                size="large"
                :loading="loginLoading"
                class="submit-btn"
                @click="handleLogin"
              >
                登录
              </el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <!-- 注册表单 -->
        <el-tab-pane label="用户注册" name="register">
          <el-form
            ref="registerFormRef"
            :model="registerForm"
            :rules="formRules"
            class="register-form"
            label-position="top"
            @submit.prevent="handleRegister"
          >
            <el-form-item 
              label="用户名" 
              prop="name"
              required
            >
              <el-input 
                v-model="registerForm.name"
                placeholder="请输入用户名（必填）"
              />
            </el-form-item>
            
            <el-form-item 
              label="手机号码" 
              prop="phone"
              required
            >
              <el-input 
                v-model="registerForm.phone"
                placeholder="请输入手机号码（必填）"
                maxlength="11"
              />
            </el-form-item>
            
            <el-form-item 
              label="密码" 
              prop="password"
              required
            >
              <el-input 
                v-model="registerForm.password"
                type="password"
                placeholder="请输入密码（必填）"
                show-password
              />
            </el-form-item>
            
            <el-form-item 
              label="邮箱" 
              prop="email"
            >
              <el-input 
                v-model="registerForm.email"
                type="email"
                placeholder="请输入邮箱（选填）"
              />
            </el-form-item>
            
            <el-form-item 
              label="地址"
            >
              <el-input 
                v-model="registerForm.address"
                type="textarea"
                :rows="2"
                placeholder="请输入地址（选填）"
              />
            </el-form-item>
            
            <el-form-item>
              <el-button 
                type="primary" 
                class="submit-btn" 
                :loading="loading"
                @click="handleRegister"
              >
                注册
              </el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>
      </el-tabs>
    </div>
  </div>
</template>

<style scoped>
.login-container {
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background: linear-gradient(135deg, var(--el-color-primary-light-8) 0%, #ffffff 100%);
}

.login-box {
  width: 420px;
  padding: 30px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
}

.login-header {
  text-align: center;
  margin-bottom: 30px;
}

.login-header h2 {
  margin: 16px 0 0;
  color: var(--el-color-primary);
  font-size: 24px;
}

.login-options {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.submit-btn {
  width: 100%;
  height: 44px;
  font-size: 16px;
  border-radius: 22px;
}

.register-form {
  margin-top: 10px;
}

:deep(.el-tabs__nav) {
  width: 100%;
}

:deep(.el-tabs__item) {
  flex: 1;
  text-align: center;
}

:deep(.el-input__wrapper) {
  border-radius: 8px;
}

:deep(.el-form-item__label) {
  font-weight: 500;
}

/* 添加必填项样式 */
:deep(.el-form-item.is-required .el-form-item__label) {
  color: var(--el-color-danger);
}

/* 添加选填项提示样式 */
:deep(.el-input__placeholder) {
  color: #909399;
}

@media (max-width: 480px) {
  .login-box {
    width: 90%;
    max-width: 420px;
    padding: 20px;
    margin: 20px;
  }

  .login-header h2 {
    font-size: 20px;
  }
}
</style>
<!-- 2425361026@qq.com -->