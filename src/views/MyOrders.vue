<script setup>
import { ref, onMounted, computed } from 'vue'
import { useUserStore } from '../stores/user'
import { ElMessage, ElMessageBox } from 'element-plus' // 添加这行
import request from '../utils/request'

const userStore = useUserStore()
const orders = ref([])
const loading = ref(false)
const statusFilter = ref('') // 添加状态筛选
const dateRange = ref([]) // 添加日期筛选

// 获取当前用户的订单
const fetchMyOrders = async () => {
  if (!userStore.user?.id) {
    ElMessage.warning('请先登录')
    return
  }

  loading.value = true
  try {
    const response = await request.get(`/orders/my-orders/${userStore.user.id}`)
    console.log('Orders response:', response)

    if (response && response.orders) {
      // 适配新的数据结构
      orders.value = response.orders.map(order => ({
        ...order,
        orderItems: order.items.map(item => ({
          ...item,
          productDetails: item.product // 将 product 映射到 productDetails
        }))
      }))
      console.log('Processed orders:', orders.value)
    }
  } catch (error) {
    console.error('获取订单失败:', error)
    ElMessage.error('获取订单失败：' + (error.message || '未知错误'))
  } finally {
    loading.value = false
  }
}

// 过滤后的订单
const filteredOrders = computed(() => {
  return orders.value.filter(order => {
    const matchStatus = !statusFilter.value || order.status === statusFilter.value
    
    if (dateRange.value && dateRange.value.length === 2) {
      const orderDate = new Date(order.orderDate)
      const startDate = new Date(dateRange.value[0])
      const endDate = new Date(dateRange.value[1])
      return matchStatus && orderDate >= startDate && orderDate <= endDate
    }
    
    return matchStatus
  })
})

// 订单状态选项
const statusOptions = [
  { value: 'PENDING', label: '待处理', type: 'info' },
  { value: 'PROCESSING', label: '处理中', type: 'warning' },
  { value: 'SHIPPED', label: '已发货', type: 'primary' },
  { value: 'COMPLETED', label: '已完成', type: 'success' },
  { value: 'CANCELLED', label: '已取消', type: 'danger' },
  { value: 'REFUNDING', label: '退款中', type: 'warning' },
  { value: 'REFUNDED', label: '已退款', type: 'info' }
]

// 获取详细的订单统计
const orderStats = computed(() => ({
  total: filteredOrders.value.length,
  totalAmount: filteredOrders.value.reduce((sum, order) => sum + order.totalAmount, 0),
  statusCount: filteredOrders.value.reduce((acc, order) => {
    acc[order.status] = (acc[order.status] || 0) + 1
    return acc
  }, {})
}))

// 格式化订单状态
const formatStatus = (status) => {
  const statusMap = {
    'COMPLETED': { text: '已完成', type: 'success' },
    'PROCESSING': { text: '处理中', type: 'warning' },
    'PENDING': { text: '待处理', type: 'info' },
    'SHIPPED': { text: '已发货', type: 'primary' },
    'CANCELLED': { text: '已取消', type: 'danger' },
    'REFUNDING': { text: '退款中', type: 'warning' },
    'REFUNDED': { text: '已退款', type: 'info' }
  }
  return statusMap[status] || { text: status, type: 'info' }
}

// 格式化日期
const formatDate = (dateString) => {
  return new Date(dateString).toLocaleString('zh-CN')
}

// 申请退货退款
const applyRefund = async (order) => {
  try {
    await ElMessageBox.confirm(
      '确定要申请退货退款吗？',
      '申请退货退款',
      {
        confirmButtonText: '确定申请',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    // 发送更新订单状态的请求
    const response = await request.put(`/orders/${order.id}/status`, { 
      status: 'REFUNDING'
    })

    if (response) {
      ElMessage.success('退货退款申请已提交')
      fetchMyOrders() // 刷新订单列表
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('申请退货退款失败:', error)
      ElMessage.error('申请失败，请稍后重试')
    }
  }
}

// 判断订单是否可以申请退货退款
const canRefund = (order) => {
  const refundableStatus = ['COMPLETED', 'SHIPPED']
  return refundableStatus.includes(order.status) && 
         !['REFUNDING', 'REFUNDED'].includes(order.status)
}

onMounted(fetchMyOrders)
</script>

<template>
  <div class="my-orders">
    <el-card class="order-container">
      <template #header>
        <div class="page-header">
          <div class="header-left">
            <h2>我的订单</h2>
            <el-tag type="info">共 {{ orderStats.total }} 笔订单</el-tag>
            <el-tag type="success">总金额: ¥{{ orderStats.totalAmount.toFixed(2) }}</el-tag>
          </div>
          <div class="header-actions">
            <el-select v-model="statusFilter" placeholder="订单状态" clearable>
              <el-option
                v-for="item in statusOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              >
                <el-tag :type="item.type" size="small">{{ item.label }}</el-tag>
              </el-option>
            </el-select>
            
            <el-date-picker
              v-model="dateRange"
              type="daterange"
              range-separator="至"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
            />
            
            <el-button @click="fetchMyOrders" :loading="loading">
              <el-icon><Refresh /></el-icon> 刷新
            </el-button>
          </div>
        </div>
      </template>

      <!-- 订单状态统计卡片 -->
      <div class="status-overview">
        <el-card 
          v-for="status in statusOptions" 
          :key="status.value" 
          :class="['status-card', { active: statusFilter === status.value }]"
          @click="statusFilter = status.value === statusFilter ? '' : status.value"
        >
          <template #header>
            <el-tag :type="status.type">{{ status.label }}</el-tag>
          </template>
          <div class="status-count">
            {{ orderStats.statusCount[status.value] || 0 }}
            <small>笔订单</small>
          </div>
        </el-card>
      </div>

      <div v-loading="loading">
        <template v-if="filteredOrders.length">
          <div class="order-list">
            <el-card v-for="order in filteredOrders" :key="order.id" class="order-item">
              <template #header>
                <div class="order-header">
                  <div class="order-info">
                    <el-tag>订单号：{{ order.id }}</el-tag>
                    <span class="order-date">{{ formatDate(order.orderDate) }}</span>
                  </div>
                  <el-tag :type="formatStatus(order.status).type">
                    {{ formatStatus(order.status).text }}
                  </el-tag>
                </div>
              </template>

              <div class="order-products">
                <div v-for="item in order.orderItems" :key="item.id" class="product-item">
                  <el-image 
                    :src="item.productDetails?.imageUrl || 'https://via.placeholder.com/80'" 
                    fit="cover"
                    class="product-image"
                  >
                    <template #error>
                      <div class="image-placeholder">暂无图片</div>
                    </template>
                  </el-image>
                  <div class="product-info">
                    <h4>{{ item.productDetails?.name }}</h4>
                    <div class="product-price">
                      <span>¥{{ item.price.toFixed(2) }}</span>
                      <span class="quantity">x {{ item.quantity }}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div class="order-footer">
                <div class="order-actions">
                  <el-button 
                    v-if="canRefund(order)"
                    type="warning" 
                    size="small"
                    @click="applyRefund(order)"
                  >
                    申请退货退款
                  </el-button>
                  <el-tag 
                    v-else-if="order.status === 'REFUNDING'"
                    type="warning"
                  >
                    退款处理中
                  </el-tag>
                  <el-tag 
                    v-else-if="order.status === 'REFUNDED'"
                    type="info"
                  >
                    已退款
                  </el-tag>
                </div>
                <div class="total-amount">
                  <span>共 {{ order.orderItems?.length || 0 }} 件商品</span>
                  <span class="price">总计：¥{{ order.totalAmount.toFixed(2) }}</span>
                </div>
              </div>
            </el-card>
          </div>
        </template>

        <el-empty 
          v-else 
          :description="loading ? '加载中...' : '暂无相关订单'"
        >
          <template #extra>
            <el-button type="primary" @click="$router.push('/home')">
              去购物
            </el-button>
          </template>
        </el-empty>
      </div>
    </el-card>

    <!-- 添加调试信息 -->
    <pre v-if="orders.length" style="display: none">{{ JSON.stringify(orders, null, 2) }}</pre>
  </div>
</template>

<style scoped>
.my-orders {
  padding: 20px;
  margin-top: 60px;
}

.order-container {
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.page-header h2 {
  margin: 0;
  font-size: 20px;
}

.order-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.order-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.order-info {
  display: flex;
  gap: 20px;
  color: #606266;
}

.product-item {
  display: flex;
  gap: 15px;
  padding: 10px;
  border-bottom: 1px solid #f0f0f0;
}

.product-item:last-child {
  border-bottom: none;
}

.product-image {
  width: 80px;
  height: 80px;
  border-radius: 4px;
}

.product-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.product-info h4 {
  margin: 0;
  font-size: 14px;
  color: #303133;
}

.product-price {
  display: flex;
  justify-content: space-between;
  color: #606266;
}

.quantity {
  color: #909399;
}

.order-footer {
  margin-top: 15px;
  padding-top: 15px;
  border-top: 1px solid #f0f0f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.total-amount {
  font-size: 16px;
  color: #606266;
}

.price {
  color: #f56c6c;
  font-size: 18px;
  font-weight: bold;
}

.image-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f7fa;
  color: #909399;
  font-size: 12px;
}

.status-overview {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
  margin-bottom: 20px;
}

.status-card {
  text-align: center;
  cursor: pointer;
  transition: all 0.3s;
}

.status-card:hover {
  transform: translateY(-3px);
}

.status-card.active {
  box-shadow: 0 0 0 2px var(--el-color-primary);
}

.status-count {
  font-size: 24px;
  font-weight: bold;
  color: #303133;
}

.status-count small {
  font-size: 14px;
  color: #909399;
  font-weight: normal;
}

.header-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.order-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}
</style>
