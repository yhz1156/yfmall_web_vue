<script setup>
import { useCartStore } from '../stores/cart'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Minus, Delete } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'  // 添加这行
import request from '../utils/request'
import { useUserStore } from '../stores/user'
import { ref, computed } from 'vue' // 添加这行

const router = useRouter()
const cartStore = useCartStore()
const userStore = useUserStore()
// 使用 storeToRefs 来保持响应性
const { cart, totalAmount } = storeToRefs(cartStore)
const { removeFromCart, updateQuantity, clearCart } = cartStore

const selectedItems = ref([]) // 选中商品的 ID 数组
const selectAll = ref(false) // 全选状态

// 计算选中商品的总金额和数量
const selectedStats = computed(() => {
  let total = 0
  let count = 0
  selectedItems.value.forEach(itemId => {
    const item = cart.value.find(i => i.id === itemId)
    if (item) {
      total += item.price * item.quantity
      count += item.quantity
    }
  })
  return { total, count }
})

// 处理全选
const handleSelectAll = (val) => {
  selectAll.value = val
  selectedItems.value = val ? cart.value.map(item => item.id) : []
}

// 处理单个商品选择
const handleSelect = (itemId) => {
  const index = selectedItems.value.indexOf(itemId)
  if (index === -1) {
    selectedItems.value.push(itemId)
  } else {
    selectedItems.value.splice(index, 1)
  }
  // 更新全选状态
  selectAll.value = selectedItems.value.length === cart.value.length
}

// 提交订单前检查
const handleSubmitOrder = () => {
  if (selectedItems.value.length === 0) {
    ElMessage.warning('请选择要购买的商品')
    return
  }

  if (!userStore.user?.id) {
    ElMessage.warning('请先登录')
    router.push('/')
    return
  }

  try {
    // 准备订单数据
    const orderData = {
      items: cart.value.filter(item => selectedItems.value.includes(item.id)),
      totalAmount: selectedStats.value.total
    }

    // 将订单数据存储到 localStorage，使用 try-catch 处理可能的错误
    try {
      localStorage.setItem('pendingOrder', JSON.stringify(orderData))
    } catch (error) {
      console.error('存储订单数据失败:', error)
      ElMessage.error('提交订单失败')
      return
    }
    
    // 使用 await 确保路由导航完成
    router.push('/payment').catch(err => {
      console.error('导航错误:', err)
      ElMessage.error('页面跳转失败')
    })
  } catch (error) {
    console.error('提交订单失败:', error)
    ElMessage.error('提交订单失败')
  }
}

// 修改提交订单方法
const submitOrder = async () => {
  if (!userStore.user?.id) {
    ElMessage.warning('请先登录')
    router.push('/')
    return
  }

  if (selectedItems.value.length === 0) {
    ElMessage.warning('请选择要购买的商品')
    return
  }

  try {
    await ElMessageBox.confirm('确认提交订单？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'info'
    })

    // 只处理选中的商品
    const selectedProducts = cart.value.filter(item => selectedItems.value.includes(item.id))
    const orderData = {
      customerId: userStore.user.id,
      totalAmount: selectedStats.value.total,
      status: 'PENDING',
      orderItems: selectedProducts.map(item => ({
        product: item,
        quantity: item.quantity,
        price: item.price
      }))
    }

    const response = await request.post('/orders/create', orderData)

    if (response) {
      // 只移除已下单的商品
      selectedItems.value.forEach(itemId => {
        removeFromCart(itemId)
      })
      ElMessage.success('订单提交成功')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('订单提交失败:', error)
      ElMessage.error(error.response?.data?.message || '订单提交失败')
    }
  }
}
</script>

<template>
  <div class="cart-page">
    <div class="cart-container">
      <!-- 页面标题区域 -->
      <div class="page-header">
        <div class="header-left">
          <h2>购物车</h2>
          <div class="cart-stats">
            <el-tag type="info">商品 {{ cart.length }}</el-tag>
            <el-tag type="success" v-if="selectedStats.count > 0">
              已选 {{ selectedStats.count }}
            </el-tag>
          </div>
        </div>
        <el-button type="primary" link @click="$router.push('/home')">
          继续购物<el-icon><ArrowRight /></el-icon>
        </el-button>
      </div>

      <!-- 购物车内容区域 -->
      <div v-if="cart.length > 0" class="cart-content">
        <!-- 全选区域 -->
        <div class="selection-bar">
          <el-checkbox
            v-model="selectAll"
            :indeterminate="selectedItems.length > 0 && selectedItems.length < cart.length"
            @change="handleSelectAll"
          >
            全选
          </el-checkbox>
        </div>

        <!-- 商品列表 -->
        <div class="cart-items">
          <div v-for="item in cart" :key="item.id" class="cart-item">
            <div class="item-select">
              <el-checkbox
                :value="selectedItems.includes(item.id)"
                @change="(val) => handleSelect(item.id)"
              />
            </div>
            
            <div class="item-content">
              <div class="item-main">
                <el-image 
                  :src="item.imageUrl" 
                  fit="cover"
                  class="item-image"
                >
                  <template #error>
                    <div class="image-placeholder">
                      <el-icon><Picture /></el-icon>
                    </div>
                  </template>
                </el-image>
                <div class="item-info">
                  <h4 class="item-name">{{ item.name }}</h4>
                  <p class="item-desc">{{ item.description }}</p>
                  <div class="item-price-mobile">
                    <span class="price">¥{{ item.price.toFixed(2) }}</span>
                  </div>
                </div>
              </div>
              
              <div class="item-actions">
                <div class="quantity-controls">
                  <el-input-number 
                    v-model="item.quantity"
                    :min="1"
                    :max="item.stock"
                    @change="(val) => updateQuantity(item, val - item.quantity)"
                    :controls-position="'right'"
                    size="small"
                  />
                  <span class="stock-info">库存: {{ item.stock }}</span>
                </div>
                
                <div class="item-subtotal">
                  <span class="subtotal-label">小计:</span>
                  <span class="subtotal-amount">¥{{ (item.price * item.quantity).toFixed(2) }}</span>
                </div>

                <el-button 
                  type="danger" 
                  circle
                  size="small"
                  @click="removeFromCart(item.id)"
                >
                  <el-icon><Delete /></el-icon>
                </el-button>
              </div>
            </div>
          </div>
        </div>

        <!-- 结算栏 -->
        <div class="checkout-bar">
          <div class="checkout-container">
            <div class="checkout-left">
              <el-checkbox
                v-model="selectAll"
                @change="handleSelectAll"
              >
                全选
              </el-checkbox>
              <div class="selected-count">
                已选 {{ selectedStats.count }} 件
              </div>
            </div>
            <div class="checkout-right">
              <div class="total-amount">
                <span>合计:</span>
                <strong>¥{{ selectedStats.total.toFixed(2) }}</strong>
              </div>
              <el-button
                type="primary"
                :disabled="selectedItems.length === 0"
                @click="handleSubmitOrder"
                class="checkout-button"
              >
                结算({{ selectedItems.length }})
              </el-button>
            </div>
          </div>
        </div>
      </div>

      <!-- 空购物车状态 -->
      <el-empty 
        v-else
        description="购物车是空的"
      >
        <template #extra>
          <el-button type="primary" @click="$router.push('/home')">
            去购物
          </el-button>
        </template>
      </el-empty>
    </div>
  </div>
</template>

<style scoped>
.cart-page {
  min-height: 100vh;
  background: #f5f7fa;
  padding: var(--page-padding);
  padding-bottom: calc(var(--navbar-height) + 20px);
  margin-top: 35px;
}

.cart-container {
  max-width: var(--max-content-width);
  margin: 0 auto;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.page-header {
  padding: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #ebeef5;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 15px;
}

.header-left h2 {
  margin: 0;
  font-size: 20px;
}

.cart-stats {
  display: flex;
  gap: 10px;
}

.cart-content {
  padding: 20px;
}

.list-header {
  padding: 15px;
  background: #f8f9fa;
  border-radius: 8px;
  margin-bottom: 15px;
  display: flex;
  align-items: center;
}

.header-labels {
  flex: 1;
  display: grid;
  grid-template-columns: 3fr 1fr 1fr 1fr 80px;
  margin-left: 50px;
  font-size: 14px;
  color: #606266;
}

.cart-items {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.cart-item {
  display: flex;
  gap: 12px;
  padding: 15px;
  background: white;
  border-radius: 8px;
  border: 1px solid #ebeef5;
}

.item-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.item-main {
  display: flex;
  gap: 12px;
}

.item-image {
  width: 100px;
  height: 100px;
  border-radius: 4px;
  flex-shrink: 0;
}

.item-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.item-name {
  margin: 0;
  font-size: 16px;
  font-weight: 500;
}

.item-desc {
  margin: 0;
  color: #909399;
  font-size: 14px;
}

.item-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

/* 修改结算栏样式 */
.checkout-bar {
  position: sticky;
  bottom: 0;
  left: 0;
  right: 0;
  background: white;
  margin-top: 20px;
  border-top: 1px solid #ebeef5;
  z-index: 100;
}

.checkout-container {
  max-width: var(--max-content-width);
  margin: 0 auto;
  padding: 15px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: white;
}

.checkout-left {
  display: flex;
  align-items: center;
  gap: 15px;
}

.checkout-right {
  display: flex;
  align-items: center;
  gap: 20px;
}

.total-amount {
  display: flex;
  align-items: baseline;
  gap: 8px;
  color: #606266;
}

.total-amount strong {
  color: #f56c6c;
  font-size: 20px;
}

.checkout-button {
  min-width: 120px;
  height: 40px;
  border-radius: 20px;
}

.selected-count {
  color: #909399;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .cart-page {
    padding: 10px;
  }

  .page-header {
    flex-direction: column;
    gap: 10px;
    align-items: flex-start;
  }

  .cart-item {
    flex-direction: column;
    padding: 12px;
  }

  .item-main {
    gap: 10px;
  }

  .item-image {
    width: 80px;
    height: 80px;
  }

  .item-actions {
    flex-wrap: wrap;
    padding-top: 10px;
    border-top: 1px solid #ebeef5;
  }

  .quantity-controls {
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .checkout-bar {
    padding: 10px 15px;
    font-size: 14px;
  }

  .checkout-container {
    padding: 10px 15px;
  }

  .checkout-left {
    gap: 10px;
  }

  .checkout-right {
    gap: 12px;
  }

  .total-amount strong {
    font-size: 18px;
  }

  .checkout-button {
    min-width: 100px;
    height: 36px;
  }

  .selected-count {
    font-size: 13px;
  }

  :deep(.el-input-number) {
    width: 120px;
  }

  .stock-info {
    font-size: 12px;
  }
}

/* 小屏幕适配 */
@media (max-width: 480px) {
  .item-image {
    width: 60px;
    height: 60px;
  }

  .item-name {
    font-size: 14px;
  }

  .item-desc {
    font-size: 12px;
  }

  :deep(.el-input-number) {
    width: 100px;
  }

  .checkout-bar {
    font-size: 12px;
  }

  .checkout-container {
    padding: 8px 12px;
  }

  .total-amount span {
    font-size: 13px;
  }

  .total-amount strong {
    font-size: 16px;
  }

  .checkout-button {
    min-width: 90px;
    height: 32px;
    font-size: 13px;
  }
}
</style>
