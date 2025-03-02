<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import request from '../utils/request'
import { useUserStore } from '../stores/user'
import { Plus, ArrowLeft, Money, Wallet } from '@element-plus/icons-vue'

const router = useRouter()
const userStore = useUserStore()

const formRef = ref(null) // 添加表单引用

// 获取路由传递的订单数据
const orderInfo = ref(JSON.parse(localStorage.getItem('pendingOrder') || '{}'))

// 表单数据
const form = ref({
  name: '',
  phone: '',
  address: '',
  paymentMethod: 'wechat', // 支付方式：wechat/alipay
  notes: ''
})

// 表单验证规则
const rules = {
  paymentMethod: [
    { required: true, message: '请选择支付方式', trigger: 'change' }
  ]
}

// 计算总金额
const totalAmount = computed(() => {
  return orderInfo.value.totalAmount || 0
})

// 提交订单
const submitOrder = async () => {  // 移除 formEl 参数
  try {
    // 检查必要数据
    if (!selectedAddress.value) {
      ElMessage.warning('请选择收货地址')
      return
    }

    if (!form.value.paymentMethod) {
      ElMessage.warning('请选择支付方式')
      return
    }

    if (!orderInfo.value.items || orderInfo.value.items.length === 0) {
      ElMessage.warning('订单数据无效')
      return
    }

    await ElMessageBox.confirm('确认提交订单？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'info'
    })

    // 构造订单数据
    const orderData = {
      customerId: userStore.user.id,
      addressId: selectedAddress.value.id,
      totalAmount: totalAmount.value,
      items: orderInfo.value.items.map(item => ({
        productId: item.id,
        quantity: item.quantity,
        price: item.price
      })),
      paymentMethod: form.value.paymentMethod,
      note: form.value.notes || ''
    }

    console.log('提交订单数据:', orderData)

    const response = await request.post('/orders/create', orderData)

    if (response) {
      ElMessage.success('订单提交成功')
      localStorage.removeItem('pendingOrder')
      router.push('/my-orders')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('订单提交失败:', error)
      ElMessage.error(error.response?.data?.message || '订单提交失败')
    }
  }
}

// 地址管理相关数据
const addressList = ref([])
const selectedAddress = ref(null)
const addressDialogVisible = ref(false)
const addressForm = ref({
  recipientName: '',
  phone: '',
  address: ''
})
const isEditingAddress = ref(false)
const editingAddressId = ref(null)

// 获取地址列表
const fetchAddresses = async () => {
  try {
    console.log('Fetching addresses for user:', userStore.user.id)
    const response = await request.get(`/addresses/customer/${userStore.user.id}`)
    console.log('Response:', response)
    
    // 修正数据处理逻辑
    if (response && response.addresses) {
      // 直接使用 response.addresses 数组
      addressList.value = response.addresses
      console.log('Updated address list:', addressList.value)
      
      // 如果有地址，默认选中第一个
      if (addressList.value.length > 0) {
        handleSelectAddress(addressList.value[0])
      }
    }
  } catch (error) {
    console.error('获取地址列表失败:', error)
    ElMessage.error('获取地址列表失败')
  }
}

// 保存地址
const saveAddress = async () => {
  try {
    // 确保所有必填字段都已填写
    if (!addressForm.value.recipientName || !addressForm.value.phone || !addressForm.value.address) {
      ElMessage.warning('请填写完整的地址信息')
      return
    }

    const addressData = {
      ...addressForm.value,
      customerId: userStore.user.id, // 确保传递 customerId
    }

    console.log('Saving address with data:', addressData) // 调试日志

    let response
    if (isEditingAddress.value) {
      response = await request.put(`/addresses/${editingAddressId.value}`, {
        ...addressForm.value,
        customerId: userStore.user.id // 编辑时也要传递 customerId
      })
    } else {
      response = await request.post('/addresses', addressData)
    }

    if (response) {
      ElMessage.success(isEditingAddress.value ? '地址更新成功' : '地址添加成功')
      addressDialogVisible.value = false
      await fetchAddresses()
      resetAddressForm()
    }
  } catch (error) {
    console.error('保存地址失败:', error)
    ElMessage.error('保存地址失败：' + (error.response?.data?.message || '未知错误'))
  }
}

// 删除地址
const deleteAddress = async (addressId) => {
  try {
    await ElMessageBox.confirm('确定要删除这个地址吗？', '提示', {
      type: 'warning'
    })
    await request.delete(`/addresses/${addressId}`)
    ElMessage.success('地址删除成功')
    await fetchAddresses()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除地址失败')
    }
  }
}

// 编辑地址
const editAddress = (address) => {
  isEditingAddress.value = true
  editingAddressId.value = address.id
  addressForm.value = { ...address }
  addressDialogVisible.value = true
}

// 打开新增地址对话框
const openAddAddressDialog = () => {
  isEditingAddress.value = false
  editingAddressId.value = null
  resetAddressForm()
  addressDialogVisible.value = true
}

// 重置地址表单
const resetAddressForm = () => {
  addressForm.value = {
    recipientName: '',
    phone: '',
    address: ''
  }
}

// 选择地址时自动填充表单
const handleSelectAddress = (address) => {
  if (!address) return
  
  console.log('Selecting address:', address)
  selectedAddress.value = address
  
  // 更新表单数据
  form.value = {
    ...form.value,
    name: address.recipientName,
    phone: address.phone,
    address: address.address
  }
}

// 支付方式配置
const paymentMethods = [
  { value: 'wechat', label: '微信支付', icon: Money },
  { value: 'alipay', label: '支付宝', icon: Wallet }
]

onMounted(() => {
  fetchAddresses()
})
</script>

<template>
  <div class="payment-page">
    <div class="payment-container">
      <el-card>
        <template #header>
          <div class="page-header">
            <h2>确认订单</h2>
            <el-button type="primary" link @click="$router.push('/cart')">
              返回购物车
            </el-button>
          </div>
        </template>

        <!-- 商品清单卡片 -->
        <div class="payment-section">
          <div class="section-header">
            <h3>商品清单</h3>
            <span class="total">共 {{ orderInfo.items?.length || 0 }} 件</span>
          </div>
          <div class="product-list">
            <div v-for="item in orderInfo.items" :key="item.id" class="product-item">
              <el-image :src="item.imageUrl" class="product-image" />
              <div class="product-info">
                <div class="product-name">{{ item.name }}</div>
                <div class="product-detail">
                  <span class="price">¥{{ item.price.toFixed(2) }}</span>
                  <span class="quantity">× {{ item.quantity }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 收货地址卡片 -->
        <div class="payment-section">
          <div class="section-header">
            <h3>收货地址</h3>
            <el-button link type="primary" @click="openAddAddressDialog">
              <el-icon><Plus /></el-icon>新增地址
            </el-button>
          </div>
          <div class="address-list">
            <template v-if="addressList.length > 0">
              <div
                v-for="addr in addressList"
                :key="addr.id"
                class="address-item"
                :class="{ 'selected': selectedAddress?.id === addr.id }"
                @click="handleSelectAddress(addr)"
              >
                <div class="address-content">
                  <div class="address-main">
                    <div class="recipient">{{ addr.recipientName }} {{ addr.phone }}</div>
                    <div class="address-text">{{ addr.address }}</div>
                  </div>
                  <div class="address-actions">
                    <el-button type="primary" link @click.stop="editAddress(addr)">编辑</el-button>
                    <el-button type="danger" link @click.stop="deleteAddress(addr.id)">删除</el-button>
                  </div>
                </div>
              </div>
            </template>
            <el-empty v-else description="暂无收货地址">
              <el-button type="primary" @click="openAddAddressDialog">添加地址</el-button>
            </el-empty>
          </div>
        </div>

        <!-- 支付方式选择 -->
        <div class="payment-section">
          <div class="section-header">
            <h3>支付方式</h3>
          </div>
          <div class="payment-methods">
            <div
              v-for="method in paymentMethods"
              :key="method.value"
              class="payment-method"
              :class="{ active: form.paymentMethod === method.value }"
              @click="form.paymentMethod = method.value"
            >
              <el-icon><component :is="method.icon" /></el-icon>
              <span>{{ method.label }}</span>
            </div>
          </div>
        </div>

        <!-- 修改结算区域 -->
        <div class="checkout-section">
          <div class="checkout-container">
            <div class="checkout-left">
              <div class="order-summary">
                <span>共 {{ orderInfo.items?.length || 0 }} 件商品</span>
                <el-divider direction="vertical" />
                <span>实付款：</span>
                <span class="total-amount">¥{{ totalAmount.toFixed(2) }}</span>
              </div>
            </div>
            <div class="checkout-right">
              <el-button
                type="primary"
                :disabled="!selectedAddress"
                class="submit-btn"
                @click="submitOrder"
              >
                提交订单
              </el-button>
            </div>
          </div>
        </div>
      </el-card>
    </div>

    <!-- 地址编辑对话框 -->
    <el-dialog
      :title="isEditingAddress ? '修改地址' : '新增地址'"
      v-model="addressDialogVisible"
      width="90%"
      :max-width="500"
    >
      <el-form :model="addressForm" label-width="80px">
        <el-form-item label="收货人" required>
          <el-input v-model="addressForm.recipientName" placeholder="请输入收货人姓名" />
        </el-form-item>
        <el-form-item label="手机号码" required>
          <el-input v-model="addressForm.phone" placeholder="请输入手机号码" />
        </el-form-item>
        <el-form-item label="详细地址" required>
          <el-input
            v-model="addressForm.address"
            type="textarea"
            :rows="3"
            placeholder="请输入详细地址"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="addressDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveAddress">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.payment-page {
  padding: var(--page-padding);
  background: #f5f7fa;
  min-height: 100vh;
  margin-top: 35px;
}

.payment-container {
  max-width: var(--max-content-width);
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
  color: #303133;
}

.payment-section {
  background: white;
  border-radius: 8px;
  padding: 15px;
  margin-bottom: 15px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.section-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 500;
}

.product-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.product-item {
  display: flex;
  gap: 12px;
  padding: 10px;
  background: #f8f9fa;
  border-radius: 8px;
}

.product-image {
  width: 60px;
  height: 60px;
  border-radius: 4px;
  flex-shrink: 0;
}

.product-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.product-name {
  font-size: 14px;
  margin-bottom: 8px;
}

.product-detail {
  display: flex;
  justify-content: space-between;
  color: #909399;
}

.price {
  color: #f56c6c;
  font-weight: 500;
}

.address-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.address-item {
  border: 1px solid #dcdfe6;
  border-radius: 8px;
  padding: 12px;
  cursor: pointer;
  transition: all 0.3s;
}

.address-item.selected {
  border-color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
}

.address-content {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.address-main {
  flex: 1;
  padding-right: 15px;
}

.recipient {
  font-weight: 500;
  margin-bottom: 8px;
}

.address-text {
  color: #606266;
  font-size: 14px;
}

.payment-methods {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.payment-method {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 15px;
  border: 1px solid #dcdfe6;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
}

.payment-method.active {
  border-color: var(--el-color-primary);
  color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
}

/* 新的结算区域样式 */
.checkout-section {
  margin-top: 20px;
  border-top: 1px solid #ebeef5;
  background: white;
}

.checkout-container {
  padding: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.checkout-left {
  display: flex;
  align-items: center;
  gap: 15px;
}

.order-summary {
  display: flex;
  align-items: center;
  gap: 12px;
  color: #606266;
}

.total-amount {
  font-size: 20px;
  font-weight: bold;
  color: #f56c6c;
}

.submit-btn {
  min-width: 140px;
  height: 44px;
  font-size: 16px;
  border-radius: 22px;
}

.submit-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: white;
  padding: 10px 15px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 -2px 10px rgba(0,0,0,0.1);
}

.amount-value {
  color: #f56c6c;
  font-size: 20px;
  font-weight: bold;
  margin-left: 8px;
}

@media (max-width: 768px) {
  .payment-page {
    padding: 10px;
  }

  .checkout-container {
    padding: 15px;
    flex-direction: column;
    gap: 15px;
  }

  .order-summary {
    font-size: 14px;
  }

  .total-amount {
    font-size: 18px;
  }

  .submit-btn {
    width: 100%;
    height: 40px;
  }
}

@media (max-width: 480px) {
  .payment-page {
    margin-top: 0; /* 移动端移除顶部间距 */
  }

  .back-link {
    position: sticky;
    top: calc(var(--navbar-height) - 1px); /* 微调以防止间隙 */
    padding: 10px 15px;
    background: white; /* 移动端使用白色背景 */
    border-bottom: 1px solid #ebeef5;
  }

  .payment-container {
    padding: 0;
  }

  .payment-section {
    border-radius: 0;
    margin-bottom: 10px;
  }

  .product-image {
    width: 50px;
    height: 50px;
  }

  .submit-bar {
    padding: 8px 12px;
  }

  .amount-value {
    font-size: 18px;
  }
}
</style>
