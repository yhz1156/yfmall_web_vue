<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import request from '../utils/request'
import Papa from 'papaparse' // 添加这行导入
import { useClipboard } from '@vueuse/core' // 添加这行

const { copy } = useClipboard()

// 订单列表数据和过滤条件
const orders = ref([])
const loading = ref(false)
const dateRange = ref(null) // 修改为 null 初始值
const searchKeyword = ref('')
const statusFilter = ref('')
const currentPage = ref(1)
const pageSize = ref(10)
const filterDrawerVisible = ref(false) // 添加筛选抽屉状态

// 更新状态选项
const statusOptions = [
  { value: 'PENDING', label: '待处理' },
  { value: 'PROCESSING', label: '处理中' },
  { value: 'SHIPPED', label: '已发货' },
  { value: 'COMPLETED', label: '已完成' },
  { value: 'CANCELLED', label: '已取消' },
  { value: 'REFUNDING', label: '退货退款中', type: 'warning' }, // 添加退货退款状态
  { value: 'REFUNDED', label: '已退款', type: 'info' } // 添加已退款状态
]

// 订单统计数据
const orderStats = computed(() => {
  const total = orders.value.length
  const totalAmount = orders.value.reduce((sum, order) => sum + order.totalAmount, 0)
  const statusCount = orders.value.reduce((acc, order) => {
    acc[order.status] = (acc[order.status] || 0) + 1
    return acc
  }, {})
  
  return { total, totalAmount, statusCount }
})

// 过滤后的订单
const filteredOrders = computed(() => {
  return orders.value.filter(order => {
    // 订单号/客户ID筛选
    const searchText = searchKeyword.value.toLowerCase().trim()
    const matchSearch = !searchText || 
      order.id.toString().includes(searchText) ||
      order.customerId.toString().includes(searchText)
    
    // 状态筛选
    const matchStatus = !statusFilter.value || order.status === statusFilter.value
    
    // 日期范围筛选
    let matchDate = true
    if (dateRange.value && dateRange.value.length === 2) {
      const orderDate = new Date(order.orderDate)
      const startDate = new Date(dateRange.value[0])
      const endDate = new Date(dateRange.value[1])
      startDate.setHours(0, 0, 0, 0)
      endDate.setHours(23, 59, 59, 999)
      matchDate = orderDate >= startDate && orderDate <= endDate
    }
    
    return matchSearch && matchStatus && matchDate
  })
})

// 分页后的订单
const paginatedOrders = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return filteredOrders.value.slice(start, end)
})

// 获取订单列表
const fetchOrders = async () => {
  loading.value = true
  try {
    const response = await request.get('/orders')
    console.log('原始订单数据:', response)

    if (response && response.orders) {
      orders.value = response.orders.map(order => ({
        ...order,
        // 将 addressInfo 映射到 address
        address: order.addressInfo,
        // 将 items 映射到 orderItems
        orderItems: order.items.map(item => ({
          ...item,
          productDetails: item.product // 将 product 映射到 productDetails
        }))
      }))
      console.log('处理后的订单数据:', orders.value)
    }
  } catch (error) {
    console.error('获取订单列表失败:', error)
    ElMessage.error('获取订单列表失败')
  } finally {
    loading.value = false
  }
}

// 搜索处理函数
const handleSearch = () => {
  currentPage.value = 1 // 重置页码
  fetchOrders()
}

// 修改日期范围变化处理函数
const handleDateRangeChange = (dates) => {
  console.log('Date range changed:', dates) // 调试日志
  if (dates) {
    dateRange.value = dates
  } else {
    dateRange.value = null
  }
  currentPage.value = 1
  fetchOrders()
}

// 状态筛选变化处理函数
const handleStatusChange = () => {
  currentPage.value = 1 // 重置页码
  fetchOrders()
}

// 更新订单状态
const updateOrderStatus = async (orderId, newStatus) => {
  try {
    await ElMessageBox.confirm(
      `确定要将订单状态更改为"${statusOptions.find(s => s.value === newStatus)?.label}"吗？`,
      '更改订单状态',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    await request({
      method: 'PUT',
      url: `/orders/${orderId}/status`,
      data: {
        status: newStatus
      }
    })

    // 成功后更新本地状态
    const index = orders.value.findIndex(order => order.id === orderId)
    if (index !== -1) {
      orders.value[index] = {
        ...orders.value[index],
        status: newStatus
      }
      // 强制更新视图
      orders.value = [...orders.value]
      ElMessage.success('订单状态更新成功')
    }

  } catch (error) {
    if (error !== 'cancel') {
      console.error('更新订单状态失败:', error)
      ElMessage.error('更新订单状态失败')
    }
  }
}

// 导出订单数据
const exportOrders = () => {
  try {
    // 使用过滤后的订单数据
    const exportData = filteredOrders.value.map(order => ({
      订单编号: order.id,
      客户ID: order.customerId,
      下单时间: formatDate(order.orderDate),
      订单状态: formatStatus(order.status).text,
      商品数量: order.items?.length || 0,
      订单总额: `¥${order.totalAmount.toFixed(2)}`,
      收货人: order.address?.recipientName || '',
      联系电话: order.address?.phone || '',
      收货地址: order.address?.address || '',
      备注: order.note || ''
    }))

    const csv = Papa.unparse(exportData, {
      header: true,
      encoding: "utf-8"
    })

    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const fileName = `订单数据_${new Date().toLocaleDateString()}.csv`
    
    if (window.navigator.msSaveOrOpenBlob) {
      // IE10+
      window.navigator.msSaveOrOpenBlob(blob, fileName)
    } else {
      // 其他浏览器
      link.href = URL.createObjectURL(blob)
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(link.href)
    }

    ElMessage.success('导出成功')
  } catch (error) {
    console.error('导出失败:', error)
    ElMessage.error('导出失败')
  }
}

// 格式化日期
const formatDate = (dateString) => {
  const date = new Date(dateString)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

// 格式化订单状态
const formatStatus = (status) => {
  const statusMap = {
    'COMPLETED': { text: '已完成', type: 'success' },
    'PROCESSING': { text: '处理中', type: 'warning' },
    'PENDING': { text: '待处理', type: 'info' },
    'SHIPPED': { text: '已发货', type: 'primary' },
    'CANCELLED': { text: '已取消', type: 'danger' },
    'REFUNDING': { text: '退货退款中', type: 'warning' }, // 添加退货退款状态
    'REFUNDED': { text: '已退款', type: 'info' } // 添加已退款状态
  }
  return statusMap[status] || { text: status, type: 'info' }
}

// 修改可更改状态的判断条件
const canChangeStatus = (status) => {
  return !['COMPLETED', 'CANCELLED', 'REFUNDED'].includes(status)
}

// 添加删除订单方法
const deleteOrder = async (orderId) => {
  try {
    await ElMessageBox.confirm(
      '确定要删除该订单吗？此操作不可恢复',
      '删除订单',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    await request.delete(`/orders/${orderId}`)
    ElMessage.success('订单删除成功')
    await fetchOrders() // 重新加载订单列表
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除订单失败:', error)
      ElMessage.error('删除订单失败')
    }
  }
}

// 添加移动端检测
const isMobile = ref(window.innerWidth <= 768)

// 监听窗口大小变化
window.addEventListener('resize', () => {
  isMobile.value = window.innerWidth <= 768
})

// 修改移动端筛选处理函数
const handleMobileFilter = () => {
  filterDrawerVisible.value = false
  handleSearch()
}

// 添加复制函数
const copyText = async (text) => {
  if (!text) return
  try {
    await copy(text)
    ElMessage.success('复制成功')
  } catch (error) {
    ElMessage.error('复制失败')
  }
}

// 修改复制函数为一键复制所有信息
const copyAddressInfo = (address) => {
  if (!address) return
  try {
    const fullAddress = `收货人：${address.recipientName}
电话：${address.phone}
地址：${address.address}`
    copy(fullAddress)
    ElMessage.success('已复制所有收货信息')
  } catch (error) {
    ElMessage.error('复制失败')
  }
}

// 格式化手机号码
const formatPhoneNumber = (phone) => {
  if (!phone) return '暂无电话';
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
}

onMounted(fetchOrders)
</script>

<template>
  <div class="order-list">
    <el-card class="order-container">
      <template #header>
        <div class="page-header" :class="{ 'mobile': isMobile }">
          <div class="header-left">
            <h2>订单管理</h2>
            <el-tag type="info">共 {{ orderStats.total }} 笔订单</el-tag>
            <el-tag type="success">总金额: ¥{{ orderStats.totalAmount.toFixed(2) }}</el-tag>
          </div>
          <!-- 移动端筛选按钮 -->
          <div v-if="isMobile" class="mobile-filter-buttons">
            <el-button @click="filterDrawerVisible = true">
              <el-icon><Filter /></el-icon>筛选
            </el-button>
            <el-button @click="exportOrders" type="success">
              <el-icon><Download /></el-icon>导出
            </el-button>
          </div>
          <!-- 桌面端筛选栏 -->
          <div v-else class="filter-section">
            <div class="search-group">
              <el-input
                v-model="searchKeyword"
                placeholder="输入订单编号或客户ID搜索"
                clearable
                class="search-input"
                @keyup.enter="handleSearch"
                @clear="handleSearch"
              >
                <template #prefix>
                  <el-icon><Search /></el-icon>
                </template>
              </el-input>
              <el-button type="primary" @click="handleSearch">
                <el-icon><Search /></el-icon>搜索
              </el-button>
            </div>
            
            <div class="filter-group">
              <el-select 
                v-model="statusFilter" 
                placeholder="订单状态" 
                clearable
                @change="handleStatusChange"
              >
                <el-option
                  v-for="item in statusOptions"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </el-select>
              
              <el-date-picker
                v-model="dateRange"
                type="daterange"
                range-separator="至"
                start-placeholder="开始日期"
                end-placeholder="结束日期"
                format="YYYY-MM-DD"
                value-format="YYYY-MM-DD"
                @change="handleDateRangeChange"
              />
              
              <el-button @click="exportOrders" type="success">
                <el-icon><Download /></el-icon>导出
              </el-button>
            </div>
          </div>
        </div>
      </template>

      <!-- 移动端订单卡片视图 -->
      <div v-if="isMobile" class="mobile-orders">
        <el-card
          v-for="order in paginatedOrders"
          :key="order.id"
          class="mobile-order-card"
        >
          <div class="mobile-order-header">
            <div class="order-id">订单 #{{ order.id }}</div>
            <el-tag :type="formatStatus(order.status).type">
              {{ formatStatus(order.status).text }}
            </el-tag>
          </div>

          <div class="mobile-order-content">
            <div class="mobile-order-info">
              <!-- 订单基本信息 -->
              <div class="info-row">
                <span class="label">下单时间:</span>
                <span>{{ formatDate(order.orderDate) }}</span>
              </div>
              <!-- 将客户ID改为显示电话号码 -->
              <div class="info-row">
                <span class="label">联系电话:</span>
                <span>{{ formatPhoneNumber(order.address?.phone) }}</span>
              </div>
              <div class="info-row">
                <span class="label">订单金额:</span>
                <span class="amount">¥{{ order.totalAmount.toFixed(2) }}</span>
              </div>

              <!-- 修改收货信息部分的模板 -->
              <div class="address-info" v-if="order.address">
                <div class="info-divider"></div>
                <!-- 将整个地址信息区域变成可点击区域 -->
                <div class="address-info-container" @click="copyAddressInfo(order.address)">
                  <div class="address-row">
                    <span class="label">收货人:</span>
                    <span class="value">{{ order.address.recipientName }}</span>
                  </div>
                  <div class="address-row">
                    <span class="label">电话:</span>
                    <span class="value">{{ order.address.phone }}</span>
                  </div>
                  <div class="address-row">
                    <span class="label">地址:</span>
                    <span class="value">{{ order.address.address }}</span>
                  </div>
                  <el-icon class="copy-all-icon"><CopyDocument /></el-icon>
                </div>
              </div>
              <div v-else class="no-address">暂无收货信息</div>
            </div>

            <!-- 商品列表 -->
            <div class="mobile-order-items">
              <div v-for="item in order.items" :key="item.id" class="mobile-order-item">
                <el-image
                  :src="item.product?.imageUrl"
                  class="item-image"
                  fit="cover"
                >
                  <template #error>
                    <div class="image-placeholder">暂无图片</div>
                  </template>
                </el-image>
                <div class="item-details">
                  <span class="item-name">{{ item.product?.name }}</span>
                  <div class="item-price-qty">
                    <span class="price">¥{{ item.price.toFixed(2) }}</span>
                    <span class="quantity">x{{ item.quantity }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- 订单操作按钮 -->
            <div class="mobile-order-actions">
              <el-dropdown 
                v-if="canChangeStatus(order.status)"
                @command="status => updateOrderStatus(order.id, status)"
              >
                <el-button type="primary" size="small">
                  更改状态<el-icon class="el-icon--right"><ArrowDown /></el-icon>
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item
                      v-for="status in statusOptions"
                      :key="status.value"
                      :command="status.value"
                      :disabled="order.status === status.value"
                    >
                      {{ status.label }}
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
              <el-button 
                type="danger" 
                size="small"
                @click="deleteOrder(order.id)"
              >
                删除订单
              </el-button>
            </div>
          </div>
        </el-card>
      </div>

      <!-- 桌面端表格视图 -->
      <el-table
        v-else
        v-loading="loading"
        :data="paginatedOrders"
        style="width: 100%"
        border
        table-layout="fixed"
      >
        <el-table-column prop="id" label="订单ID" width="80" fixed="left" />
        <el-table-column prop="customerId" label="客户ID" width="80" fixed="left" />
        
        <el-table-column label="下单时间" width="160">
          <template #default="{ row }">
            {{ formatDate(row.orderDate) }}
          </template>
        </el-table-column>

        <el-table-column label="订单金额" width="100" align="right">
          <template #default="{ row }">
            <span class="amount">¥{{ row.totalAmount.toFixed(2) }}</span>
          </template>
        </el-table-column>
        
        <el-table-column label="订单状态" width="100">
          <template #default="{ row }">
            <el-tag :type="formatStatus(row.status).type">
              {{ formatStatus(row.status).text }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="收货信息" min-width="200">
          <template #default="{ row }">
            <div class="shipping-info">
              <div v-if="row.address" class="recipient">
                <div><span class="label">收货人：</span>{{ row.address.recipientName }}</div>
                <div><span class="label">电话：</span>{{ row.address.phone }}</div>
                <div><span class="label">地址：</span>{{ row.address.address }}</div>
              </div>
              <span v-else class="no-info">暂无收货信息</span>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="备注" width="120" show-overflow-tooltip>
          <template #default="{ row }">
            <el-tooltip :content="row.note || '无'" placement="top">
              <span class="note">{{ row.note || '无' }}</span>
            </el-tooltip>
          </template>
        </el-table-column>

        <el-table-column label="订单明细" width="120" fixed="right">
          <template #default="{ row }">
            <el-popover
              placement="left"
              width="400"
              trigger="click"
            >
              <template #reference>
                <el-button type="primary" link>
                  {{ row.items?.length || 0 }} 件商品
                  <el-icon class="el-icon--right"><ArrowRight /></el-icon>
                </el-button>
              </template>
              <template #default>
                <div class="order-items-popover">
                  <div v-for="item in row.items" :key="item.id" class="order-item">
                    <el-image
                      :src="item.product?.imageUrl || 'https://via.placeholder.com/50'"
                      class="product-image"
                    >
                      <template #error>
                        <div class="image-placeholder">暂无图片</div>
                      </template>
                    </el-image>
                    <div class="item-info">
                      <span class="item-name">{{ item.product?.name }}</span>
                      <span class="item-price">¥{{ item.price.toFixed(2) }} × {{ item.quantity }}</span>
                    </div>
                  </div>
                </div>
              </template>
            </el-popover>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <div class="action-buttons">
              <el-dropdown 
                v-if="canChangeStatus(row.status)"
                @command="status => updateOrderStatus(row.id, status)"
                trigger="click"
              >
                <el-button type="primary" size="small">
                  状态<el-icon class="el-icon--right"><ArrowDown /></el-icon>
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item 
                      v-for="status in statusOptions"
                      :key="status.value"
                      :command="status.value"
                      :disabled="row.status === status.value"
                    >
                      <el-tag 
                        :type="formatStatus(status.value).type"
                        size="small"
                      >
                        {{ status.label }}
                      </el-tag>
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
              <el-popconfirm
                title="确定要删除此订单吗？"
                @confirm="deleteOrder(row.id)"
              >
                <template #reference>
                  <el-button type="danger" size="small" style="margin-left: 8px">
                    删除
                  </el-button>
                </template>
              </el-popconfirm>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-container" :class="{ 'mobile': isMobile }">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :total="filteredOrders.length"
          :page-sizes="isMobile ? [5, 10, 20] : [10, 20, 50, 100]"
          :layout="isMobile ? 'prev, pager, next' : 'total, sizes, prev, pager, next, jumper'"
        />
      </div>
    </el-card>

    <!-- 移动端筛选抽屉 -->
    <el-drawer
      v-model="filterDrawerVisible"
      title="筛选订单"
      direction="rtl"
      size="90%"
    >
      <div class="mobile-filter-form">
        <el-form>
          <el-form-item label="搜索">
            <el-input
              v-model="searchKeyword"
              placeholder="订单编号或客户ID"
              clearable
              @keyup.enter="handleSearch"
            />
          </el-form-item>
          <el-form-item label="订单状态">
            <el-select 
              v-model="statusFilter" 
              placeholder="选择状态"
              clearable
              style="width: 100%"
            >
              <el-option
                v-for="item in statusOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="日期范围">
            <el-date-picker
              v-model="dateRange"
              type="daterange"
              range-separator="至"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              style="width: 100%"
            />
          </el-form-item>
        </el-form>
        <div class="drawer-footer">
          <el-button @click="filterDrawerVisible = false">取消</el-button>
          <el-button type="primary" @click="handleMobileFilter">应用筛选</el-button>
        </div>
      </div>
    </el-drawer>
  </div>
</template>

<style scoped>
.order-list {
  padding: 20px;
  background-color: #f5f7fa;
  min-height: calc(100vh - 60px);
}

.order-container {
  border-radius: 8px;
}

.page-header {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.filter-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.search-group {
  display: flex;
  gap: 12px;
  align-items: center;
}

.search-input {
  width: 300px;
}

.filter-group {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}

.el-date-picker {
  width: 380px;
}

.status-overview {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin: 20px 0;
}

.status-card {
  text-align: center;
}

.status-header {
  display: flex;
  justify-content: center;
}

.status-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.status-count {
  font-size: 24px;
  font-weight: bold;
  color: #303133;
}

.status-label {
  font-size: 14px;
  color: #909399;
}

.amount {
  color: #f56c6c;
  font-weight: bold;
}

.order-items {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.order-item {
  display: flex;
  gap: 12px;
  padding: 8px;
  background-color: #f8f9fa;
  border-radius: 4px;
}

.product-image {
  width: 50px;
  height: 50px;
  border-radius: 4px;
}

.item-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.item-name {
  font-weight: 500;
}

.item-price {
  color: #909399;
  font-size: 13px;
}

.image-placeholder {
  width: 50px;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f0f0f0;
  color: #909399;
  font-size: 12px;
}

.detail-title {
  font-size: 13px;
  color: #606266;
}

.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

:deep(.el-card__header) {
  padding: 15px 20px;
}

:deep(.el-collapse-item__header) {
  height: 40px;
}

:deep(.el-collapse-item__content) {
  padding: 16px;
}

:deep(.el-dropdown-menu__item) {
  display: flex;
  align-items: center;
  padding: 8px 16px;
}

:deep(.el-dropdown-menu__item.is-disabled) {
  opacity: 0.7;
}

.action-buttons {
  display: flex;
  gap: 8px;
  align-items: center;
}

.shipping-info {
  padding: 8px;
  border-radius: 4px;
  background-color: #f8f9fa;
}

.recipient {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.recipient > div {
  display: flex;
  gap: 4px;
}

.label {
  color: #909399;
  font-size: 13px;
}

.detail-trigger {
  cursor: pointer;
  color: #409eff;
  display: flex;
  align-items: center;
  gap: 4px;
}

.order-items-popover {
  max-height: 400px;
  overflow-y: auto;
}

.order-item {
  display: flex;
  gap: 12px;
  padding: 8px;
  border-bottom: 1px solid #eee;
}

.order-item:last-child {
  border-bottom: none;
}

.product-image {
  width: 50px;
  height: 50px;
  border-radius: 4px;
  flex-shrink: 0;
}

:deep(.el-table) {
  margin-top: 20px;
}

:deep(.el-table .cell) {
  padding: 8px;
}

.note {
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #606266;
}

/* 调整表格样式 */
:deep(.el-table) {
  margin-top: 20px;
}

:deep(.el-table__fixed-right) {
  height: 100%; /* 确保固定列高度正确 */
  box-shadow: -2px 0 8px rgba(0,0,0,0.1);
}

:deep(.el-button--small) {
  padding: 5px 12px;
}

:deep(.el-dropdown) {
  margin-right: 8px;
}

/* 移动端样式 */
.page-header.mobile {
  flex-direction: column;
  gap: 12px;
}

.mobile-filter-buttons {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.mobile-orders {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.mobile-order-card {
  margin-bottom: 12px;
}

.mobile-order-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #ebeef5;
}

.order-id {
  font-weight: bold;
  color: #303133;
}

.mobile-order-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.mobile-order-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: #f8f9fa;
  padding: 12px;
  border-radius: 4px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.info-row .label {
  color: #909399;
  font-size: 13px;
}

.mobile-order-items {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.mobile-order-item {
  display: flex;
  gap: 8px;
  padding: 8px;
  background: #f8f9fa;
  border-radius: 4px;
}

.item-image {
  width: 60px;
  height: 60px;
  border-radius: 4px;
  flex-shrink: 0;
}

.item-details {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.item-name {
  font-size: 14px;
  color: #303133;
}

.item-price-qty {
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: #606266;
  font-size: 13px;
}

.mobile-order-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #ebeef5;
}

.mobile-filter-form {
  padding: 20px;
}

.drawer-footer {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 16px;
  background: white;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  border-top: 1px solid #ebeef5;
}

.pagination-container.mobile {
  justify-content: center;
  padding: 16px 0;
}

/* 添加收货信息样式 */
.address-info {
  margin-top: 8px;
}

.info-divider {
  height: 1px;
  background: #ebeef5;
  margin: 8px 0;
}

.address-info-container {
  position: relative;
  padding: 8px;
  cursor: pointer;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.address-info-container:hover {
  background-color: #ecf5ff;
}

.address-row {
  display: flex;
  align-items: center;
  padding: 4px 0;
}

.copy-all-icon {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  color: #909399;
  font-size: 16px;
  opacity: 0;
  transition: opacity 0.2s;
}

.address-info-container:hover .copy-all-icon {
  opacity: 1;
}

.no-address {
  color: #909399;
  font-size: 13px;
  text-align: center;
  padding: 8px 0;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .address-row {
    padding: 6px 0;
  }

  .copy-all-icon {
    opacity: 0.5; /* 在移动端总是显示复制图标 */
  }

  .address-info-container {
    padding: 8px 32px 8px 8px; /* 为复制图标留出空间 */
  }
}
</style>



