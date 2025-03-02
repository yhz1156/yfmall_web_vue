<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElLoading } from 'element-plus' // 添加 ElLoading 导入
import { ArrowLeft, ShoppingCart, Plus, Minus, Delete, Close } from '@element-plus/icons-vue'
import request from '../utils/request'
import { useCartStore } from '../stores/cart'

const route = useRoute()
const router = useRouter()
const { cart, showCart, totalAmount, addToCart, removeFromCart, updateQuantity, clearCart, toggleCart } = useCartStore()

const product = ref(null)
const loading = ref(false)
const quantity = ref(1)

// 添加移动端检测
const isMobile = ref(window.innerWidth <= 768)

// 监听窗口大小变化
window.addEventListener('resize', () => {
  isMobile.value = window.innerWidth <= 768
})

// 获取商品详情
const fetchProductDetail = async () => {
  loading.value = true
  try {
    const response = await request.get(`/products/${route.params.id}`)
    if (response) {
      product.value = response
    } else {
      throw new Error('商品不存在')
    }
  } catch (error) {
    ElMessage.error('获取商品详情失败')
    router.push('/home')
  } finally {
    loading.value = false
  }
}

// 添加到购物车
const handleAddToCart = () => {
  if (product.value) {
    const cartItem = {
      ...product.value,
      quantity: quantity.value
    }
    addToCart(cartItem)
    //ElMessage.success('已添加到购物车')
  }
}

// 提交订单
const submitOrder = async () => {
  if (cart.value.length === 0) {
    ElMessage.warning('购物车为空')
    return
  }

  const loadingInstance = ElLoading.service({
    lock: true,
    text: '订单提交中...',
    background: 'rgba(0, 0, 0, 0.7)'
  })

  try {
    const orderData = {
      customerId: 1, // 临时使用固定的customerId，实际应该从用户会话中获取
      totalAmount: totalAmount.value,
      status: 'Pending',
      orderItems: cart.value.map(item => ({
        product: item,
        quantity: item.quantity,
        price: item.price
      }))
    }

    const response = await request.post('/orders/create', orderData)
    if (response.message) {
      ElMessage.success(response.message)
      clearCart() // 使用新的clearCart方法
      // 刷新商品详情
      await fetchProductDetail()
    }
  } catch (error) {
    if (error.response?.data?.message) {
      ElMessage.error(error.response.data.message)
    } else {
      ElMessage.error('下单失败')
    }
  } finally {
    loadingInstance.close()
  }
}

// 返回上一页
const goBack = () => {
  router.back()
}

// 添加滚动位置重置
onMounted(() => {
  document.body.style.overflow = 'auto' // 确保body可以滚动
  window.scrollTo(0, 0)
  fetchProductDetail()
})

onBeforeUnmount(() => {
  document.body.style.overflow = '' // 恢复body默认滚动行为
})
</script>

<template>
  <div class="product-detail" v-loading="loading" :class="{ 'is-mobile': isMobile }">
    <div class="page-header">
      <el-button @click="goBack" text>
        <el-icon><ArrowLeft /></el-icon>
        返回
      </el-button>
    </div>

    <template v-if="product">
      <div class="detail-container">
        <!-- 图片区域 -->
        <div class="product-image-section">
          <el-image
            :src="product.imageUrl || 'https://via.placeholder.com/400'"
            fit="cover"
            :preview-src-list="[product.imageUrl]"
            class="main-image"
          />
        </div>

        <!-- 商品信息和购买区域 -->
        <div class="info-purchase-section">
          <!-- 基本信息 -->
          <div class="product-info-section">
            <h1 class="product-name">{{ product.name }}</h1>
            <div class="price-stock-row">
              <div class="product-price">¥{{ product.price?.toFixed(2) }}</div>
              <el-tag 
                :type="product.stock > 20 ? 'success' : product.stock > 0 ? 'warning' : 'danger'"
                size="large"
              >
                {{ product.stock > 0 ? `库存: ${product.stock}` : '已售罄' }}
              </el-tag>
            </div>

            <!-- 购买操作区域 - 移到描述前面 -->
            <div class="purchase-section">
              <div class="quantity-section">
                <span class="quantity-label">数量</span>
                <el-input-number 
                  v-model="quantity"
                  :min="1"
                  :max="product.stock"
                  :disabled="product.stock <= 0"
                  size="large"
                />
              </div>
              <el-button 
                type="primary"
                :disabled="product.stock <= 0"
                @click="handleAddToCart"
                size="large"
                class="add-to-cart-btn"
              >
                <el-icon><ShoppingCart /></el-icon>
                加入购物车
              </el-button>
            </div>

            <!-- 商品描述 -->
            <div class="product-description">
              <h3>商品描述</h3>
              <p>{{ product.description }}</p>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- 购物车图标 -->
    <div class="cart-icon" @click="router.push('/cart')">
      <el-badge :value="cart.length" :hidden="cart.length === 0">
        <el-button circle>
          <el-icon><ShoppingCart /></el-icon>
        </el-button>
      </el-badge>
    </div>
  </div>
</template>

<style scoped>
.product-detail {
  padding: 20px;
  max-width: var(--max-content-width);
  margin: var(--navbar-height) auto 0;
  min-height: calc(100vh - var(--navbar-height));
  position: relative;
  background-color: #f5f7fa;
}

.product-detail.is-mobile {
  padding: 10px;
  padding-top: var(--navbar-height);
  padding-bottom: 100px;
}

.page-header {
  margin-bottom: 20px;
  position: sticky;
  top: var(--navbar-height);
  z-index: 10;
  background-color: #f5f7fa;
  padding: 10px 0;
}

.detail-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0,0,0,0.1);
  margin-bottom: 80px;
}

/* 修改图片区域样式 */
.product-image-section {
  width: 100%;
  max-height: 500px;
  display: flex;
  justify-content: center;
  align-items: center;
  background: #f8f9fa;
  border-radius: 8px;
  overflow: hidden;
}

.main-image {
  width: 100%;
  max-width: 500px;
  height: auto;
  object-fit: contain;
}

/* 修改商品信息和购买区域样式 */
.info-purchase-section {
  padding: 20px;
}

.product-info-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* 购买区域样式 */
.purchase-section {
  margin: 20px 0;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 20px;
}

.quantity-section {
  display: flex;
  align-items: center;
  gap: 15px;
}

.add-to-cart-btn {
  flex: 1;
  height: 45px;
}

/* 商品描述样式 */
.product-description {
  background: #f8f9fa;
  padding: 15px;
  border-radius: 8px;
  margin-bottom: 20px;
}

.product-description h3 {
  margin: 0 0 10px 0;
  font-size: 16px;
  color: #606266;
}

.product-description p {
  margin: 0;
  line-height: 1.6;
  color: #606266;
}

/* 购物车图标样式 */
.cart-icon {
  position: fixed;
  bottom: 80px;
  right: 20px;
  z-index: 101;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .product-detail {
    padding: 10px;
    margin-top: calc(var(--navbar-height) + 10px);
    padding-bottom: 80px; /* 为底部操作栏留出空间 */
  }

  .product-name {
    font-size: 20px;
  }

  .product-price {
    font-size: 24px;
  }

  .product-description {
    margin: 0;
    border-radius: 0;
  }

  .product-description.is-mobile {
    background: white;
    padding: 15px;
  }

  .info-purchase-section {
    padding: 15px;
  }

  .purchase-section {
    margin: 15px 0;
    padding: 15px;
    flex-direction: row;
    gap: 12px;
  }

  .quantity-section {
    gap: 8px;
  }

  :deep(.el-input-number) {
    width: 120px;
  }

  .cart-icon {
    bottom: 90px;
    right: 15px;
  }
}
</style>
