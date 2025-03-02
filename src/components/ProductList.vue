<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import request from '../utils/request'
import Papa from 'papaparse'  // 添加这一行
import { Upload, Picture } from '@element-plus/icons-vue'

// 产品列表数据
const products = ref([])
const loading = ref(false)
const searchQuery = ref('')
const dialogVisible = ref(false)
const editingProduct = ref({
  name: '',
  description: '',
  price: 0,
  stock: 0,
  imageUrl: '', // 添加imageUrl字段
  status: 'AVAILABLE' // 默认为可用状态
})
const isEdit = ref(false)

// 添加分页相关数据
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)

// 添加表格多选功能
const selectedProducts = ref([])

// 添加表单验证规则
const rules = {
  name: [
    { required: true, message: '请输入商品名称', trigger: 'blur' },
    { min: 2, max: 50, message: '长度在 2 到 50 个字符', trigger: 'blur' }
  ],
  price: [
    { required: true, message: '请输入商品价格', trigger: 'blur' },
    { type: 'number', min: 0, message: '价格必须大于 0', trigger: 'blur' }
  ],
  stock: [
    { required: true, message: '请输入库存数量', trigger: 'blur' },
    { type: 'number', min: 0, message: '库存必须大于等于 0', trigger: 'blur' }
  ],
  status: [
    { required: true, message: '请选择商品状态', trigger: 'change' }
  ]
}

// 图片预览
const previewVisible = ref(false)
const previewImage = ref('')

const handlePreviewImage = (url) => {
  previewImage.value = url
  previewVisible.value = true
}

// 批量删除
const handleBatchDelete = async () => {
  if (selectedProducts.value.length === 0) {
    ElMessage.warning('请选择要删除的商品')
    return
  }

  try {
    await ElMessageBox.confirm(`确定要删除选中的 ${selectedProducts.value.length} 个商品吗？`, '警告', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    await Promise.all(selectedProducts.value.map(id => 
      request.delete(`/products/${id}`)
    ))
    
    ElMessage.success('批量删除成功')
    selectedProducts.value = []
    await fetchProducts()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('批量删除失败')
    }
  }
}

// 导出数据
const exportData = () => {
  const data = products.value.map(({ id, name, description, price, stock }) => 
    ({ id, name, description, price, stock })
  )
  
  const csv = Papa.unparse(data)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `products_${new Date().toISOString().split('T')[0]}.csv`
  link.click()
}

// 获取所有产品
const fetchProducts = async () => {
  loading.value = true
  try {
    const response = await request.get('/products', {
      params: {
        page: currentPage.value,
        pageSize: pageSize.value
      }
    })
    
    if (Array.isArray(response)) {
      products.value = response
      total.value = response.length // 如果后端没有返回总数，就用当前数组长度
    } else {
      console.error('Unexpected response format:', response)
      ElMessage.error('获取产品列表失败')
    }
  } catch (error) {
    console.error('获取产品列表失败:', error)
    ElMessage.error('获取产品列表失败')
  } finally {
    loading.value = false
  }
}

// 搜索产品
const searchProducts = async () => {
  if (!searchQuery.value) {
    await fetchProducts()
    return
  }
  loading.value = true
  try {
    const response = await request.get(`/products/search?name=${encodeURIComponent(searchQuery.value)}`)
    console.log('Response:', response) // 添加日志
    if (Array.isArray(response)) {
      console.log('Searched products:', response) // 添加日志
      products.value = response
    } else {
      console.error('Unexpected response format:', response) // 添加日志
      ElMessage.error('搜索产品失败')
    }
  } catch (error) {
    ElMessage.error('搜索产品失败')
  } finally {
    loading.value = false
  }
}

// 新增/编辑产品
const handleSave = async () => {
  try {
    const url = isEdit.value ? `/products/${editingProduct.value.id}` : '/products'
    const method = isEdit.value ? 'put' : 'post'
    
    // 确保 imageUrl 被包含在发送的数据中
    const productData = {
      ...editingProduct.value,
      imageUrl: editingProduct.value.imageUrl || '' // 确保即使没有图片也发送空字符串
    }
    
    await request[method](url, productData)
    ElMessage.success(isEdit.value ? '更新成功' : '创建成功')
    dialogVisible.value = false
    await fetchProducts()
  } catch (error) {
    console.error('保存失败:', error)
    ElMessage.error(isEdit.value ? '更新失败' : '创建失败')
  }
}

// 删除产品
const handleDelete = async (id) => {
  try {
    await ElMessageBox.confirm('确定要删除该产品吗？', '警告', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    await request.delete(`/products/${id}`)
    ElMessage.success('删除成功')
    await fetchProducts()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

// 检查低库存产品
const checkLowStock = async () => {
  try {
    const response = await request.get('/products/low-stock?threshold=20')
    console.log('Response:', response) // 添加日志
    if (Array.isArray(response)) {
      console.log('Low stock products:', response) // 添加日志
      if (response.length > 0) {
        ElMessage.warning(`有${response.length}个产品库存不足20件`)
      } else {
        ElMessage.success('所有产品库存充足')
      }
    } else {
      console.error('Unexpected response format:', response) // 添加日志
      ElMessage.error('检查库存失败')
    }
  } catch (error) {
    ElMessage.error('检查库存失败')
  }
}

// 打开编辑对话框
const openDialog = (product = null) => {
  isEdit.value = !!product
  editingProduct.value = product
    ? { ...product }
    : {
        name: '',
        description: '',
        price: 0,
        stock: 0,
        imageUrl: '', // 添加默认值
        status: 'AVAILABLE' // 默认为可用状态
      }
  dialogVisible.value = true
}

// 处理页面变化
const handlePageChange = (page) => {
  currentPage.value = page
  fetchProducts()
}

// 添加商品状态选项
const statusOptions = [
  { value: 'AVAILABLE', label: '可用' },
  { value: 'DISCONTINUED', label: '已下架' },
  { value: 'OUT_OF_STOCK', label: '缺货' }
]

// 更新状态显示样式
const getStatusType = (status) => {
  const typeMap = {
    'AVAILABLE': 'success',
    'DISCONTINUED': 'info',
    'OUT_OF_STOCK': 'danger'
  }
  return typeMap[status] || 'info'
}

const getStatusLabel = (status) => {
  const labelMap = {
    'AVAILABLE': '可用',
    'DISCONTINUED': '已下架',
    'OUT_OF_STOCK': '缺货'
  }
  return labelMap[status] || status
}

// 添加移动端检测
const isMobile = ref(window.innerWidth <= 768)

// 监听窗口大小变化
onMounted(() => {
  fetchProducts()
  
  window.addEventListener('resize', () => {
    isMobile.value = window.innerWidth <= 768
  })
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', () => {
    isMobile.value = window.innerWidth <= 768
  })
})

// 添加商品表单
const productForm = ref({
  name: '',
  description: '',
  price: 0,
  stock: 0,
  imageUrl: '',
  imageFile: null
})

// 修改上传图片处理函数
const handleImageUpload = async (event) => {
  const file = event.target.files[0]
  if (!file) return
  
  // 验证文件类型
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif']
  if (!allowedTypes.includes(file.type)) {
    ElMessage.error('只支持 JPG、PNG、GIF 格式的图片')
    return
  }

  // 验证文件大小（5MB）
  if (file.size > 5 * 1024 * 1024) {
    ElMessage.error('图片大小不能超过5MB')
    return
  }

  // 先显示本地预览
  editingProduct.value.imageUrl = URL.createObjectURL(file)

  // 上传图片并获取URL
  const imageUrl = await uploadImage(file)
  if (imageUrl) {
    // 更新商品的图片URL
    editingProduct.value.imageUrl = imageUrl
    ElMessage.success('图片上传成功')
  }
}

// 修改上传图片到服务器的函数
const uploadImage = async (file) => {
  const formData = new FormData()
  formData.append('file', file)

  try {
    loading.value = true
    const response = await request.post('/upload/image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })

    if (response.url) {
      // 只存储图片URL,不立即更新UI
      return response.url
    } else {
      throw new Error('上传失败')
    }
  } catch (error) {
    console.error('图片上传失败:', error)
    ElMessage.error('图片上传失败')
    return null
  } finally {
    loading.value = false
  }
}

// 移除图片
const removeImage = () => {
  productForm.value.imageUrl = ''
  productForm.value.imageFile = null
}
</script>

<template>
  <div class="product-list">
    <el-card class="page-container">
      <template #header>
        <div class="page-header" :class="{ 'mobile': isMobile }">
          <div class="header-left">
            <h2>产品管理</h2>
            <el-tag type="info">共 {{ total }} 件商品</el-tag>
          </div>
          <div class="header-actions" :class="{ 'mobile': isMobile }">
            <el-input
              v-model="searchQuery"
              placeholder="输入产品名称搜索"
              class="search-input"
              @keyup.enter="searchProducts"
              clearable
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
            <div class="action-buttons">
              <el-button type="primary" @click="openDialog()">
                <el-icon><Plus /></el-icon>
                <span v-if="!isMobile">新增</span>
              </el-button>
              <el-button 
                type="danger" 
                :disabled="!selectedProducts.length"
                @click="handleBatchDelete"
              >
                <el-icon><Delete /></el-icon>
                <span v-if="!isMobile">批量删除</span>
              </el-button>
              <el-button type="warning" @click="checkLowStock">
                <el-icon><Warning /></el-icon>
                <span v-if="!isMobile">库存预警</span>
              </el-button>
              <el-button @click="exportData">
                <el-icon><Download /></el-icon>
                <span v-if="!isMobile">导出</span>
              </el-button>
            </div>
          </div>
        </div>
      </template>

      <!-- 移动端表格视图 -->
      <div v-if="isMobile" class="mobile-product-list">
        <el-card
          v-for="product in products"
          :key="product.id"
          class="mobile-product-card"
          :body-style="{ padding: '0px' }"
        >
          <div class="mobile-product-header">
            <el-checkbox
              v-model="selectedProducts"
              :label="product.id"
            />
            <el-tag :type="getStatusType(product.status)" size="small">
              {{ getStatusLabel(product.status) }}
            </el-tag>
          </div>
          
          <div class="mobile-product-content">
            <el-image
              :src="product.imageUrl"
              fit="cover"
              class="mobile-product-image"
              @click="handlePreviewImage(product.imageUrl)"
            >
              <template #error>
                <el-avatar>{{ product.name.charAt(0) }}</el-avatar>
              </template>
            </el-image>
            
            <div class="mobile-product-info">
              <h3 class="mobile-product-name">{{ product.name }}</h3>
              <p class="mobile-product-desc">{{ product.description }}</p>
              <div class="mobile-product-meta">
                <span class="mobile-price">¥{{ product.price.toFixed(2) }}</span>
                <el-tag 
                  :type="product.stock < 20 ? 'danger' : product.stock < 50 ? 'warning' : 'success'"
                  size="small"
                >
                  库存: {{ product.stock }}
                </el-tag>
              </div>
            </div>
          </div>

          <div class="mobile-product-actions">
            <el-button type="primary" size="small" @click="openDialog(product)">
              <el-icon><Edit /></el-icon>编辑
            </el-button>
            <el-button type="danger" size="small" @click="handleDelete(product.id)">
              <el-icon><Delete /></el-icon>删除
            </el-button>
          </div>
        </el-card>
      </div>

      <!-- 桌面端表格视图 -->
      <el-table
        v-else
        v-loading="loading"
        :data="products"
        style="width: 100%"
        stripe
        border
        highlight-current-row
        @selection-change="val => selectedProducts = val.map(item => item.id)"
      >
        <el-table-column type="selection" width="55" />
        <el-table-column type="index" width="50" label="#" />
        <el-table-column prop="name" label="产品名称" min-width="200">
          <template #default="{ row }">
            <div class="product-item">
              <el-image
                :src="row.imageUrl"
                :preview-src-list="[row.imageUrl]"
                fit="cover"
                class="product-image"
                @click="handlePreviewImage(row.imageUrl)"
              >
                <template #error>
                  <el-avatar>{{ row.name.charAt(0) }}</el-avatar>
                </template>
              </el-image>
              <div class="product-info">
                <span class="product-name">{{ row.name }}</span>
                <span class="product-id">ID: {{ row.id }}</span>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="description" label="描述" min-width="200" show-overflow-tooltip />
        <el-table-column prop="price" label="价格" width="120" align="right">
          <template #default="{ row }">
            <span class="price">¥{{ row.price.toFixed(2) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="stock" label="库存" width="120" align="center">
          <template #default="{ row }">
            <el-tag :type="row.stock < 20 ? 'danger' : row.stock < 50 ? 'warning' : 'success'">
              {{ row.stock }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="120">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">
              {{ getStatusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button-group>
              <el-button type="primary" @click="openDialog(row)" :icon="Edit" />
              <el-button type="danger" @click="handleDelete(row.id)" :icon="Delete" />
            </el-button-group>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页器适配 -->
      <div class="pagination-container" :class="{ 'mobile': isMobile }">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :total="total"
          :page-sizes="isMobile ? [5, 10, 20] : [10, 20, 50, 100]"
          :layout="isMobile ? 'prev, pager, next' : 'total, sizes, prev, pager, next, jumper'"
          @size-change="fetchProducts"
          @current-change="handlePageChange"
        />
      </div>
    </el-card>

    <!-- 优化移动端对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑产品' : '新增产品'"
      :width="isMobile ? '95%' : '500px'"
      destroy-on-close
      :fullscreen="isMobile"
    >
      <el-form
        ref="formRef"
        :model="editingProduct"
        :rules="rules"
        label-width="80px"
        @submit.prevent="handleSave"
      >
        <el-form-item label="名称" prop="name">
          <el-input v-model="editingProduct.name" />
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input v-model="editingProduct.description" type="textarea" :rows="3" />
        </el-form-item>
        <el-form-item label="价格" prop="price">
          <el-input-number 
            v-model="editingProduct.price" 
            :precision="2" 
            :step="0.1" 
            :min="0"
            style="width: 200px"
          />
        </el-form-item>
        <el-form-item label="库存" prop="stock">
          <el-input-number 
            v-model="editingProduct.stock" 
            :min="0"
            style="width: 200px"
          />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-select v-model="editingProduct.status">
            <el-option
              v-for="item in statusOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="商品图片">
          <div class="image-uploader">
            <div 
              v-if="!editingProduct.imageUrl" 
              class="image-upload-trigger"
            >
              <input
                type="file"
                accept="image/*"
                class="file-input"
                @change="handleImageUpload"
              >
              <el-icon><Upload /></el-icon>
              <span>点击上传图片</span>
            </div>
            <div v-else class="image-preview">
              <img :src="editingProduct.imageUrl" class="preview-image">
              <div class="image-actions">
                <el-button 
                  type="danger" 
                  size="small" 
                  circle
                  @click="editingProduct.imageUrl = ''"
                >
                  <el-icon><Delete /></el-icon>
                </el-button>
              </div>
            </div>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSave" :loading="loading">
          {{ isEdit ? '保存' : '创建' }}
        </el-button>
      </template>
    </el-dialog>

    <!-- 修改图片预览组件 -->
    <el-dialog v-model="previewVisible" title="图片预览" width="800px">
      <el-image
        :src="previewImage"
        style="width: 100%"
        fit="contain"
        :preview-src-list="previewImage ? [previewImage] : []"
      >
        <template #error>
          <div class="image-error">
            <el-icon><Picture /></el-icon>
            <span>图片加载失败</span>
          </div>
        </template>
      </el-image>
    </el-dialog>
  </div>
</template>

<style scoped>
.product-list {
  padding: 20px;
  background-color: #f5f7fa;
  min-height: calc(100vh - 60px);
}

.page-container {
  border-radius: 8px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 20px;
  border-bottom: 1px solid #ebeef5;
}

.page-header h2 {
  margin: 0;
  font-size: 20px;
  color: #303133;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-actions {
  display: flex;
  gap: 16px;
  align-items: center;
}

.search-input {
  width: 300px;
}

.product-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.product-image {
  width: 50px;
  height: 50px;
  border-radius: 4px;
  cursor: pointer;
  transition: transform 0.3s;
}

.product-image:hover {
  transform: scale(1.1);
}

.product-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.product-name {
  font-weight: 500;
  color: #303133;
}

.product-id {
  font-size: 12px;
  color: #909399;
}

.price {
  color: #f56c6c;
  font-weight: bold;
}

.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

:deep(.el-tag) {
  width: 60px;
  text-align: center;
}

:deep(.el-table) {
  border-radius: 8px;
  overflow: hidden;
}

:deep(.el-card__header) {
  padding: 15px 20px;
  border-bottom: 1px solid #ebeef5;
}

:deep(.el-button-group) {
  display: flex;
  gap: 1px;
}

:deep(.el-image-viewer__wrapper) {
  z-index: 2100;
}

/* 移动端样式 */
.page-header.mobile {
  flex-direction: column;
  gap: 15px;
  align-items: stretch;
}

.header-actions.mobile {
  flex-direction: column;
  gap: 10px;
}

.header-actions.mobile .search-input {
  width: 100%;
}

.action-buttons {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.mobile-product-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.mobile-product-card {
  margin-bottom: 10px;
}

.mobile-product-header {
  padding: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #ebeef5;
}

.mobile-product-content {
  padding: 12px;
  display: flex;
  gap: 12px;
}

.mobile-product-image {
  width: 80px;
  height: 80px;
  border-radius: 4px;
  flex-shrink: 0;
}

.mobile-product-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

.mobile-product-name {
  margin: 0;
  font-size: 16px;
  font-weight: 500;
}

.mobile-product-desc {
  margin: 0;
  font-size: 13px;
  color: #606266;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.mobile-product-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.mobile-price {
  color: #f56c6c;
  font-weight: bold;
  font-size: 16px;
}

.mobile-product-actions {
  padding: 8px;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  border-top: 1px solid #ebeef5;
}

.pagination-container.mobile {
  justify-content: center;
}

@media (max-width: 768px) {
  .product-list {
    padding: 10px;
  }

  .page-container {
    border-radius: 0;
  }

  :deep(.el-dialog) {
    margin: 0 !important;
    width: 100% !important;
  }

  :deep(.el-dialog__body) {
    padding: 15px !important;
  }
}

.image-uploader {
  width: 200px;
  height: 200px;
  border: 1px dashed #d9d9d9;
  border-radius: 8px;
  overflow: hidden;
  transition: border-color 0.3s;
}

.image-uploader:hover {
  border-color: #409eff;
}

.image-upload-trigger {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  cursor: pointer;
  position: relative;
  transition: all 0.3s;
}

.image-upload-trigger:hover {
  border-color: #409eff;
  color: #409eff;
}

.file-input {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
}

.image-preview {
  width: 100%;
  height: 100%;
  position: relative;
}

.preview-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.image-actions {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: none;
  background: rgba(0, 0, 0, 0.6);
  border-radius: 50%;
}

.image-preview:hover .image-actions {
  display: block;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .image-uploader {
    width: 150px;
    height: 150px;
  }

  .image-actions {
    display: block;
  }
}

.image-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: #909399;
  font-size: 14px;
  background: #f5f7fa;
}

.image-error .el-icon {
  font-size: 48px;
  margin-bottom: 8px;
}
</style>



