import axios from 'axios'
import { ElMessage } from 'element-plus'

const request = axios.create({
   //baseURL: 'http://localhost:9000/api',
  baseURL: 'http://mall.yellow-fish.cn/api',
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 请求拦截器 - 添加这部分
request.interceptors.request.use(
  config => {
    console.log('Request:', config) // 调试日志
    return config
  },
  error => {
    console.error('Request error:', error)
    return Promise.reject(error)
  }
)

// 响应拦截器
request.interceptors.response.use(
  response => {
    console.log('原始响应:', response) // 打印原始响应
    console.log('响应数据:', response.data) // 打印响应数据
    return response.data
  },
  error => {
    console.error('请求错误:', error.response || error)
    const message = error.response?.data?.message || '请求失败'
    ElMessage.error(message)
    return Promise.reject(error)
  }
)

export default request