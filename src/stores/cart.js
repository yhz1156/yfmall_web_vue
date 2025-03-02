import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'

// 创建购物车状态
export const useCartStore = defineStore('cart', () => {
  // 从localStorage初始化购物车数据，显示状态默认为false
  const cart = ref(JSON.parse(localStorage.getItem('cart') || '[]'))
  const showCart = ref(false) // 修改初始值为false

  // 监听购物车数据变化并保存
  watch(cart, (newValue) => {
    localStorage.setItem('cart', JSON.stringify(newValue))
  }, { deep: true })

  // 监听购物车显示状态变化并保存
  watch(showCart, (newValue) => {
    localStorage.setItem('cartVisible', String(newValue))
  })

  // 计算购物车总金额
  const totalAmount = computed(() => {
    return cart.value.reduce((total, item) => total + item.price * item.quantity, 0)
  })

  // 添加商品到购物车
  const addToCart = (product) => {
    if (product.stock <= 0) {
      ElMessage.warning('商品库存不足')
      return
    }
    
    const existingItem = cart.value.find(item => item.id === product.id)
    if (existingItem) {
      if (existingItem.quantity + (product.quantity || 1) <= product.stock) {
        existingItem.quantity += (product.quantity || 1)
        ElMessage.success('已添加到购物车')
      } else {
        ElMessage.warning('已达到最大库存数量')
      }
    } else {
      cart.value.push({
        ...product,
        quantity: product.quantity || 1
      })
      ElMessage.success('已添加到购物车')
    }
  }

  // 从购物车移除商品
  const removeFromCart = (productId) => {
    const index = cart.value.findIndex(item => item.id === productId)
    if (index > -1) {
      cart.value.splice(index, 1)
      ElMessage.success('已从购物车移除')
    }
  }

  // 更新购物车商品数量
  const updateQuantity = (item, delta) => {
    const cartItem = cart.value.find(i => i.id === item.id)
    if (cartItem) {
      const newQuantity = cartItem.quantity + delta
      if (newQuantity > 0 && newQuantity <= item.stock) {
        cartItem.quantity = newQuantity
      }
    }
  }

  const clearCart = () => {
    cart.value = []
    showCart.value = false
    localStorage.removeItem('cart')
    localStorage.setItem('cartVisible', 'false')
  }

  // 切换购物车显示状态
  const toggleCart = () => {
    showCart.value = !showCart.value
  }

  // 关闭购物车面板
  const closeCart = () => {
    showCart.value = false
  }

  return {
    cart,
    showCart,
    totalAmount,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    toggleCart, // 导出新的切换方法
    closeCart, // 导出关闭方法
  }
})