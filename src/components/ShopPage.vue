<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElLoading } from 'element-plus'
import { ShoppingCart, Plus, Minus, Delete, Close, Search, Picture } from '@element-plus/icons-vue'
import request from '../utils/request'
import { useCartStore } from '../stores/cart'
import { useRouter } from 'vue-router'

// 商品列表数据
const products = ref([])
const loading = ref(false)
const { cart, showCart, totalAmount, addToCart, removeFromCart, updateQuantity, clearCart, toggleCart } = useCartStore()
const router = useRouter()

// 获取所有商品
const fetchProducts = async () => {
  loading.value = true
  try {
    const response = await request.get('/products')
    if (Array.isArray(response)) {
      products.value = response
    } else {
      ElMessage.error('获取商品列表失败')
    }
  } catch (error) {
    ElMessage.error('获取商品列表失败')
  } finally {
    loading.value = false
  }
}

// 搜索和过滤
const searchKeyword = ref('')
const sortOption = ref('default')

// 过滤后的商品列表
const filteredProducts = computed(() => {
  return products.value.filter(product => {
    const matchKeyword = !searchKeyword.value || 
      product.name.toLowerCase().includes(searchKeyword.value.toLowerCase()) ||
      product.description.toLowerCase().includes(searchKeyword.value.toLowerCase())
    // 只显示可用状态的商品
    const isAvailable = product.status === 'AVAILABLE'
    return matchKeyword && isAvailable
  })
})

// 商品排序
const sortedProducts = computed(() => {
  const products = [...filteredProducts.value]
  switch (sortOption.value) {
    case 'price-asc':
      return products.sort((a, b) => a.price - b.price)
    case 'price-desc':
      return products.sort((a, b) => b.price - a.price)
    case 'stock-desc':
      return products.sort((a, b) => b.stock - a.stock)
    default:
      return products
  }
})

// 添加到购物车时的动画效果
const addToCartWithAnimation = (product) => {
  const button = event.currentTarget
  button.classList.add('adding')
  setTimeout(() => {
    button.classList.remove('adding')
    addToCart(product)
  }, 300)
}

// 跳转到商品详情页
const goToProductDetail = (productId) => {
  router.push(`/product/${productId}`)
}

onMounted(() => {
  fetchProducts()
})
</script>

<template>
  <div class="shop-page">
    <!-- 简化过滤栏 -->
    <div class="filter-bar">
      <el-input
        v-model="searchKeyword"
        placeholder="搜索商品名称或描述"
        clearable
        class="search-input"
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>

      <el-select v-model="sortOption" placeholder="排序方式">
        <el-option label="默认排序" value="default" />
        <el-option label="价格从低到高" value="price-asc" />
        <el-option label="价格从高到低" value="price-desc" />
        <el-option label="库存从多到少" value="stock-desc" />
      </el-select>
    </div>

    <div class="products-container">
      <div class="products-header">
        <h2>商品列表</h2>
        <span class="product-count">共 {{ sortedProducts.length }} 件商品</span>
      </div>

      <div class="products-grid" v-loading="loading">
        <el-card 
          v-for="product in sortedProducts" 
          :key="product.id" 
          class="product-card"
          :class="{ 'out-of-stock': product.stock <= 0 }"
        >
          <div class="product-image" @click="goToProductDetail(product.id)">
            <el-image 
              :src="product.imageUrl || 'https://via.placeholder.com/200'" 
              fit="cover"
              :preview-src-list="[product.imageUrl]"
              class="clickable-image"
            >
              <template #error>
                <div class="image-placeholder">
                  <el-icon><Picture /></el-icon>
                </div>
              </template>
            </el-image>
            <div class="stock-badge" v-if="product.stock <= 5">
              仅剩 {{ product.stock }} 件
            </div>
          </div>

          <div class="product-info">
            <h3 class="product-title clickable" @click="goToProductDetail(product.id)">
              {{ product.name }}
            </h3>
            <p class="description">{{ product.description }}</p>
            <div class="price-stock">
              <span class="price">¥{{ product.price.toFixed(2) }}</span>
              <el-tag :type="product.stock > 20 ? 'success' : product.stock > 0 ? 'warning' : 'danger'">
                {{ product.stock > 0 ? `库存: ${product.stock}` : '已售罄' }}
              </el-tag>
            </div>
            <el-button 
              type="primary" 
              :disabled="product.stock <= 0"
              @click="addToCartWithAnimation(product)"
              class="add-to-cart-btn"
            >
              <el-icon><ShoppingCart /></el-icon>
              {{ product.stock > 0 ? '加入购物车' : '已售罄' }}
            </el-button>
          </div>
        </el-card>
      </div>

      <!-- 空状态 -->
      <el-empty
        v-if="sortedProducts.length === 0 && !loading"
        description="暂无相关商品"
      />
    </div>

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
.shop-page {
  padding: var(--page-padding);
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-width: var(--max-content-width);
  margin: 0 auto;
  margin-top: 35px;
}

.filter-bar {
  display: flex;
  gap: 15px;
  padding: 15px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0,0,0,0.1);
}

.search-input {
  flex: 1;
  min-width: 200px;
}

.products-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.product-count {
  color: #909399;
  font-size: 14px;
}

.products-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
  margin-top: 20px;
}

.product-card {
  transition: all 0.3s;
  height: 100%;
}

.product-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 6px 16px rgba(0,0,0,0.12);
}

.product-image {
  position: relative;
  width: 100%;
  height: 200px;
  overflow: hidden;
}

.stock-badge {
  position: absolute;
  top: 10px;
  right: 10px;
  background: rgba(245, 108, 108, 0.9);
  color: white;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
}

.image-placeholder {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f7fa;
  color: #909399;
  font-size: 24px;
}

.product-info {
  padding: 15px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.product-title {
  margin: 0;
  font-size: 16px;
  font-weight: 500;
  color: #303133;
}

.description {
  color: #606266;
  font-size: 14px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin: 0;
}

.add-to-cart-btn {
  position: relative;
  overflow: hidden;
}

.add-to-cart-btn.adding::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(255,255,255,0.2);
  transform: translateX(-100%);
  animation: adding 0.3s ease-in-out;
}

@keyframes adding {
  to {
    transform: translateX(100%);
  }
}

.out-of-stock {
  opacity: 0.7;
}

.products-container {
  flex: 1;
}

.products-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  margin-top: 20px;
}

.product-card {
  display: flex;
  flex-direction: column;
}

.product-image {
  width: 100%;
  height: 200px;
  overflow: hidden;
}

.product-info {
  padding: 15px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.price-stock {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.price {
  font-size: 1.2em;
  font-weight: bold;
  color: #f56c6c;
}

.description {
  color: #666;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* 购物车图标样式 */
.cart-icon {
  position: fixed;
  bottom: 100px; /* 改为距离底部 100px */
  right: 20px;
  z-index: 999; /* 确保在导航栏下方 */
}

.cart-icon .el-badge__content {
  background-color: #f56c6c;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .filter-bar {
    flex-direction: column;
  }

  .search-input {
    width: 100%;
  }

  .products-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }

  .product-card {
    height: auto;
  }

  .product-image {
    height: 150px;
  }

  .product-info {
    padding: 10px;
  }

  .product-title {
    font-size: 14px;
  }

  .description {
    font-size: 12px;
    -webkit-line-clamp: 2;
  }

  .price {
    font-size: 16px;
  }

  .add-to-cart-btn {
    padding: 8px;
    font-size: 12px;
  }

  .cart-icon {
    bottom: 80px; /* 移动端时距离底部更小一些 */
    right: 10px;
  }
}

/* 小屏幕手机适配 */
@media (max-width: 480px) {
  .products-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }

  .product-image {
    height: 120px;
  }

  .product-info {
    gap: 8px;
  }

  :deep(.el-tag) {
    transform: scale(0.8);
    transform-origin: left center;
  }
}
</style>



