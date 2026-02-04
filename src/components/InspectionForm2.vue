<template>
  <div class="repair-form-container">
    <div class="header">
      <img src="../assets/logo.png" alt="logo" class="logo" />
      <h1>维修处理</h1>
    </div>

    <div class="form-content" v-if="!isLoading">
      <!-- 登录提示 -->
      <div v-if="!currentUser" class="login-prompt">
        <p>请先登录以进行维修操作</p>
        <button @click="goToLogin" class="login-btn">前往登录</button>
      </div>

      <div v-else>
        <!-- 维修人姓名 -->
        <div class="form-item">
          <p>维修人姓名 <span class="required">*</span></p>
          <input
              type="text"
              v-model="repairForm.maintenanceName"
              class="form-input"
              :class="{ 'error-border': errors.maintenanceName }"
              placeholder="维修人姓名"
              @input="clearError('maintenanceName')"
          />
          <p class="error-text" v-if="errors.maintenanceName">{{ errors.maintenanceName }}</p>
        </div>

        <!-- 维修人手机号 -->
        <div class="form-item">
          <p>维修人手机号 <span class="required">*</span></p>
          <input
              type="tel"
              v-model="repairForm.maintenancePhone"
              class="form-input"
              :class="{ 'error-border': errors.maintenancePhone }"
              placeholder="维修人手机号"
              @input="clearError('maintenancePhone')"
          />
          <p class="error-text" v-if="errors.maintenancePhone">{{ errors.maintenancePhone }}</p>
        </div>

        <!-- 维修内容 -->
        <div class="form-item">
          <p>维修内容 <span class="required">*</span></p>
          <textarea
              v-model="repairForm.repairContent"
              class="form-textarea"
              :class="{ 'error-border': errors.repairContent }"
              placeholder="请详细描述维修过程和处理结果"
              rows="6"
              @input="clearError('repairContent')"
          ></textarea>
          <p class="error-text" v-if="errors.repairContent">{{ errors.repairContent }}</p>
        </div>

        <!-- 维修图片 -->
        <div class="form-item">
          <p>维修图片</p>
          <div class="image-upload-area">
            <input
                type="file"
                ref="fileInput"
                @change="handleFileUpload"
                accept="image/*"
                class="file-input"
                multiple
            />
            <div class="upload-placeholder" @click="triggerFileInput">
              <i class="fas fa-cloud-upload-alt"></i>
              <p>点击上传图片（最多5张）</p>
              <p class="upload-hint">系统会自动压缩图片以减小上传大小</p>
            </div>

            <!-- 上传进度 -->
            <div v-if="uploadProgress > 0 && uploadProgress < 100" class="upload-progress">
              <div class="progress-bar">
                <div class="progress-fill" :style="{ width: uploadProgress + '%' }"></div>
              </div>
              <p class="progress-text">正在上传: {{ uploadProgress }}%</p>
            </div>

            <!-- 图片预览 -->
            <div class="image-preview-container" v-if="imageFiles.length > 0">
              <div class="image-preview" v-for="(file, index) in imageFiles" :key="index">
                <img :src="file.preview" alt="预览" class="preview-image" />
                <button class="remove-image-btn" @click="removeImage(index)">
                  <i class="fas fa-times"></i>
                </button>
                <p class="image-name">{{ file.name }}</p>
                <p class="image-size">{{ formatFileSize(file.size) }}</p>
              </div>
            </div>

            <!-- 总大小显示 -->
            <div v-if="imageFiles.length > 0" class="total-size">
              总大小: {{ formatFileSize(totalFileSize) }}
            </div>

            <p class="field-desc">支持JPG、PNG格式，每张图片不超过5MB，系统会自动压缩</p>
          </div>
        </div>

        <!-- 提交按钮 -->
        <button
            class="submit-btn"
            @click="submitRepairForm"
            :disabled="isSubmitting"
            :class="{ 'disabled-btn': isSubmitting }"
        >
          <i class="fas fa-paper-plane"></i>
          {{ isSubmitting ? '提交中...' : '提交维修记录' }}
        </button>

        <!-- 返回按钮 -->
        <button class="back-btn" @click="goBack">
          <i class="fas fa-arrow-left"></i>
          返回
        </button>
      </div>
    </div>

    <!-- 加载中 -->
    <div class="loading" v-else>
      <i class="fas fa-spinner fa-spin"></i>
      加载中...
    </div>

    <!-- 提交成功弹窗 -->
    <div class="success-modal" v-if="showSuccessModal">
      <div class="modal-content">
        <i class="fas fa-check-circle success-icon"></i>
        <h3>维修记录提交成功！</h3>
        <p>维修记录已成功提交，系统将自动更新状态。</p>
        <button class="modal-btn" @click="handleSuccessClose">确定</button>
      </div>
    </div>

    <!-- 提交状态提示 -->
    <div v-if="submitStatus" class="status-toast" :class="submitStatusClass">
      <i :class="statusIcon"></i>
      <span>{{ submitStatus }}</span>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import request from '../utils/request'

const router = useRouter()
const route = useRoute()

// 状态管理
const currentUser = ref(null)
const isSubmitting = ref(false)
const isLoading = ref(false)
const showSuccessModal = ref(false)
const submitStatus = ref('')
const submitStatusClass = ref('')
const uploadProgress = ref(0)

// 错误信息
const errors = ref({
  maintenanceName: '',
  maintenancePhone: '',
  repairContent: ''
})

// 维修表单数据
const repairForm = ref({
  maintenanceName: '',
  maintenancePhone: '',
  repairContent: '',
})

// 图片上传相关
const imageFiles = ref([])
const fileInput = ref(null)

// 计算总文件大小
const totalFileSize = computed(() => {
  return imageFiles.value.reduce((total, file) => total + (file.size || 0), 0)
})

// 计算状态图标
const statusIcon = computed(() => {
  switch (submitStatusClass.value) {
    case 'error': return 'fas fa-exclamation-circle'
    case 'info': return 'fas fa-info-circle'
    case 'success': return 'fas fa-check-circle'
    default: return 'fas fa-info-circle'
  }
})

// 页面初始化
onMounted(async () => {
  // 检查用户登录状态
  checkLoginStatus()
})

// 监听当前用户变化，自动填充维修人信息
watch(currentUser, (newUser) => {
  if (newUser) {
    repairForm.value.maintenanceName = newUser.workerName || newUser.managerName || ''
    repairForm.value.maintenancePhone = newUser.phone || ''
  }
}, { immediate: true })

// 检查登录状态
const checkLoginStatus = () => {
  const user = localStorage.getItem('currentUser')
  if (user) {
    currentUser.value = JSON.parse(user)
  }
}

// 清除错误
const clearError = (field) => {
  if (errors.value[field]) {
    errors.value[field] = ''
  }
}

// 格式化时间为 ISO 格式
const formatLocalDateTime = () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  const seconds = String(now.getSeconds()).padStart(2, '0')

  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`
}

// 压缩图片 - 与InspectionForm1.vue相同的压缩逻辑
const compressImage = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')

        // 计算新的尺寸（限制最大尺寸）
        let width = img.width
        let height = img.height
        const maxWidth = 1024
        const maxHeight = 1024

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width)
            width = maxWidth
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height)
            height = maxHeight
          }
        }

        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        // 设置背景色为白色
        ctx.fillStyle = '#FFFFFF'
        ctx.fillRect(0, 0, width, height)
        ctx.drawImage(img, 0, 0, width, height)

        // 压缩质量，根据原始大小调整 - 使用与InspectionForm1相同的质量设置
        let quality = 0.7 // 默认70%质量
        if (file.size > 2 * 1024 * 1024) { // 大于2MB，压缩更多
          quality = 0.5
        } else if (file.size > 1 * 1024 * 1024) { // 大于1MB
          quality = 0.6
        }

        canvas.toBlob((blob) => {
          const compressedFile = new File([blob], file.name, {
            type: 'image/jpeg',
            lastModified: Date.now()
          })
          resolve(compressedFile)
        }, 'image/jpeg', quality)
      }
      img.onerror = reject
      img.src = e.target.result
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

// 格式化文件大小
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 触发文件选择
const triggerFileInput = () => {
  fileInput.value.click()
}

// 处理文件上传 - 简化的处理方式
const handleFileUpload = async (event) => {
  const files = Array.from(event.target.files)

  // 检查文件数量
  if (imageFiles.value.length + files.length > 5) {
    showSubmitStatus('最多只能上传5张图片', 'error')
    return
  }

  for (const file of files) {
    // 检查文件类型
    if (!file.type.startsWith('image/')) {
      showSubmitStatus('只能上传图片文件', 'error')
      continue
    }

    // 检查文件大小（10MB限制）
    if (file.size > 10 * 1024 * 1024) {
      showSubmitStatus(`图片"${file.name}"太大（${formatFileSize(file.size)}），请选择小于10MB的图片`, 'error')
      continue
    }

    try {
      console.log(`开始压缩图片: ${file.name} (${formatFileSize(file.size)})`)

      // 压缩图片 - 使用与InspectionForm1相同的压缩函数
      const compressedFile = await compressImage(file)

      console.log(`压缩完成: ${file.name} → ${compressedFile.name} (${formatFileSize(file.size)} → ${formatFileSize(compressedFile.size)})`)

      // 创建预览URL
      const reader = new FileReader()
      reader.onload = (e) => {
        imageFiles.value.push({
          file: compressedFile,
          preview: e.target.result,
          name: compressedFile.name,
          size: compressedFile.size,
          type: compressedFile.type,
          originalSize: file.size
        })
      }
      reader.readAsDataURL(compressedFile)

    } catch (error) {
      console.error('图片压缩失败:', error)
      // 如果压缩失败，使用原文件
      const reader = new FileReader()
      reader.onload = (e) => {
        imageFiles.value.push({
          file: file,
          preview: e.target.result,
          name: file.name,
          size: file.size,
          type: file.type,
          originalSize: file.size
        })
      }
      reader.readAsDataURL(file)
    }
  }

  // 清空input值以便重复选择
  event.target.value = ''
}

// 移除图片
const removeImage = (index) => {
  imageFiles.value.splice(index, 1)
}

// 验证表单
const validateForm = () => {
  let isValid = true
  const newErrors = {
    maintenanceName: '',
    maintenancePhone: '',
    repairContent: ''
  }

  if (!repairForm.value.maintenanceName?.trim()) {
    newErrors.maintenanceName = '请填写维修人姓名'
    isValid = false
  }

  const phoneRegex = /^1[3-9]\d{9}$/
  if (!repairForm.value.maintenancePhone?.trim()) {
    newErrors.maintenancePhone = '请填写手机号码'
    isValid = false
  } else if (!phoneRegex.test(repairForm.value.maintenancePhone.trim())) {
    newErrors.maintenancePhone = '请输入正确的手机号码'
    isValid = false
  }

  if (!repairForm.value.repairContent?.trim()) {
    newErrors.repairContent = '请填写维修内容'
    isValid = false
  } else if (repairForm.value.repairContent.trim().length < 2) {
    newErrors.repairContent = '维修内容至少2个字符'
    isValid = false
  }

  errors.value = newErrors
  return isValid
}

// 提交维修表单 - 简化上传逻辑
const submitRepairForm = async () => {
  // 从路由参数或查询参数中获取维修记录ID
  const recordId = route.params.recordId || route.query.recordId
  if (!recordId) {
    showSubmitStatus('无法获取维修记录ID，请从报修列表进入', 'error')
    return
  }

  if (!validateForm()) {
    return
  }

  // 检查图片总大小（限制为30MB，与InspectionForm1一致）
  if (totalFileSize.value > 30 * 1024 * 1024) {
    showSubmitStatus('上传的图片总大小超过30MB，请减少图片数量或压缩图片', 'error')
    return
  }

  isSubmitting.value = true
  uploadProgress.value = 0
  showSubmitStatus('正在提交维修记录...', 'info')

  try {
    // 准备维修信息数据 - 使用与后端对应的字段名
    const maintenanceInfo = {
      name2: repairForm.value.maintenanceName.trim(),
      phone2: repairForm.value.maintenancePhone.trim(),
      content2: repairForm.value.repairContent.trim(),
      datetime2: formatLocalDateTime()
    }

    console.log('维修信息:', maintenanceInfo)
    console.log('压缩前总大小:', formatFileSize(imageFiles.value.reduce((sum, file) => sum + (file.originalSize || file.size), 0)))
    console.log('压缩后总大小:', formatFileSize(totalFileSize.value))

    // 创建 FormData - 简化上传逻辑
    const formDataToSend = new FormData()

    // 添加维修信息作为 JSON 字符串
    const maintenanceInfoBlob = new Blob([JSON.stringify(maintenanceInfo)], {
      type: 'application/json'
    })
    formDataToSend.append('maintenanceInfo', maintenanceInfoBlob)

    // 添加所有图片（如果有）
    if (imageFiles.value.length > 0) {
      imageFiles.value.forEach((imageFile, index) => {
        if (imageFile.file) {
          formDataToSend.append('images', imageFile.file)
          console.log(`图片 ${index + 1}: ${imageFile.name} (${formatFileSize(imageFile.size)})`)
        }
      })
    }

    // 使用一次性提交接口
    console.log('开始提交维修记录...')
    const startTime = Date.now()

    const response = await request.post(
        `/repair-data/${recordId}/complete-maintenance`,
        formDataToSend,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          },
          timeout: 10000, // 保持10秒超时
          // 添加上传进度回调
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total)
              uploadProgress.value = percentCompleted
              console.log(`上传进度: ${percentCompleted}% (${formatFileSize(progressEvent.loaded)}/${formatFileSize(progressEvent.total)})`)
            }
          }
        }
    )

    uploadProgress.value = 100
    const endTime = Date.now()
    console.log(`维修记录提交成功，耗时: ${endTime - startTime}ms`, response)

    // 显示成功弹窗
    showSuccessModal.value = true
    showSubmitStatus('维修记录提交成功！', 'success')

    // 清空表单
    resetForm()

  } catch (error) {
    console.error('提交维修记录失败:', error)
    uploadProgress.value = 0

    let errorMessage = '提交失败: '
    if (error.response) {
      if (error.response.status === 413) {
        errorMessage = '上传的图片太大，系统已自动压缩但仍超过限制。请减少图片数量或压缩图片后再试。'
      } else if (error.response.status === 404) {
        errorMessage = '未找到对应的维修记录，请检查记录ID是否正确'
      } else if (error.response.data && error.response.data.message) {
        errorMessage += error.response.data.message
      } else if (error.response.data && typeof error.response.data === 'string') {
        errorMessage += error.response.data
      } else {
        errorMessage += '服务器错误 (' + error.response.status + ')'
      }
    } else if (error.request) {
      if (error.code === 'ECONNABORTED') {
        errorMessage = '请求超时，可能是图片太大导致上传时间过长，请减少图片数量或压缩图片'
      } else {
        errorMessage = '网络错误，请检查网络连接或服务器是否正常'
      }
    } else {
      errorMessage = `提交失败: ${error.message}`
    }

    showSubmitStatus(errorMessage, 'error')
  } finally {
    isSubmitting.value = false
    setTimeout(() => {
      uploadProgress.value = 0
    }, 1000)
  }
}

// 显示提交状态
const showSubmitStatus = (message, type) => {
  submitStatus.value = message
  submitStatusClass.value = type

  // 如果是错误信息，显示时间长一些
  const duration = type === 'error' ? 8000 : 5000
  setTimeout(() => {
    if (submitStatus.value === message) {
      submitStatus.value = ''
      submitStatusClass.value = ''
    }
  }, duration)
}

// 处理成功弹窗关闭
const handleSuccessClose = () => {
  showSuccessModal.value = false
  router.back()
}

// 重置表单
const resetForm = () => {
  repairForm.value = {
    maintenanceName: currentUser.value?.workerName || currentUser.value?.managerName || '',
    maintenancePhone: currentUser.value?.phone || '',
    repairContent: '',
  }
  imageFiles.value = []
  uploadProgress.value = 0
}

// 返回上一页
const goBack = () => {
  router.back()
}

// 前往登录页面
const goToLogin = () => {
  router.push('/login1')
}
</script>

<style scoped>
.repair-form-container {
  min-height: 100vh;
  background-color: #f5f7fa;
  padding-bottom: 40px;
}

.header {
  position: sticky;
  top: 0;
  z-index: 100;
  background-color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 15px 20px;
  border-bottom: 1px solid #eee;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  position: relative;
}

.logo {
  width: 60px;
  height: 50px;
  position: absolute;
  left: 20px;
  top: 50%;
  transform: translateY(-50%);
}

h1 {
  margin: 0;
  font-size: 20px;
  color: #333;
  text-align: center;
}

.form-content {
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
}

.login-prompt {
  text-align: center;
  padding: 40px 20px;
  background-color: white;
  border-radius: 12px;
  margin-bottom: 25px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  border: 1px solid #e8e8e8;
}

.login-prompt p {
  font-size: 18px;
  color: #666;
  margin-bottom: 20px;
}

.login-btn {
  padding: 12px 30px;
  background-color: #3b82f6;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.login-btn:hover {
  background-color: #2563eb;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
}

.form-item {
  margin-bottom: 25px;
  padding: 20px;
  background-color: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  border: 1px solid #e8e8e8;
}

.form-item p:first-child {
  margin: 0 0 12px 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.required {
  color: #ff4d4f;
  margin-left: 4px;
}

.form-input[type="text"],
.form-input[type="tel"],
.form-input[type="date"],
.form-input[type="time"],
select.form-input {
  width: 100%;
  padding: 12px 16px;
  border: 2px solid #e8e8e8;
  border-radius: 8px;
  font-size: 16px;
  transition: all 0.3s ease;
  box-sizing: border-box;
  background-color: white;
}

.form-input:focus,
.form-textarea:focus,
select.form-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.error-border {
  border-color: #ff4d4f !important;
}

.error-border:focus {
  border-color: #ff4d4f !important;
  box-shadow: 0 0 0 3px rgba(255, 77, 79, 0.1) !important;
}

.error-text {
  margin: 8px 0 0 0;
  color: #ff4d4f;
  font-size: 14px;
  min-height: 20px;
}

.field-desc {
  margin: 8px 0 0 0;
  color: #999;
  font-size: 14px;
}

.form-textarea {
  width: 100%;
  padding: 16px;
  border: 2px solid #e8e8e8;
  border-radius: 8px;
  font-size: 16px;
  transition: all 0.3s ease;
  box-sizing: border-box;
  background-color: white;
  resize: vertical;
  min-height: 150px;
  line-height: 1.5;
  font-family: inherit;
}

.form-textarea:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.image-upload-area {
  margin-top: 10px;
}

.file-input {
  display: none;
}

.upload-placeholder {
  border: 2px dashed #d9d9d9;
  border-radius: 8px;
  padding: 30px 20px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  background-color: #fafafa;
}

.upload-placeholder:hover {
  border-color: #3b82f6;
  background-color: #f0f7ff;
}

.upload-placeholder i {
  font-size: 48px;
  color: #999;
  margin-bottom: 12px;
}

.upload-placeholder p {
  margin: 0;
  color: #999;
  font-size: 16px;
}

.upload-hint {
  margin-top: 8px !important;
  font-size: 14px !important;
  color: #666;
  font-style: italic;
}

/* 上传进度 */
.upload-progress {
  margin-top: 20px;
  padding: 15px;
  background-color: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background-color: #e9ecef;
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background-color: #3b82f6;
  border-radius: 4px;
  transition: width 0.3s ease;
}

.progress-text {
  margin: 8px 0 0 0;
  text-align: center;
  color: #666;
  font-size: 14px;
}

.image-preview-container {
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
  margin-top: 20px;
}

.image-preview {
  position: relative;
  width: 140px;
  height: 160px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #e8e8e8;
  background-color: #f8f9fa;
}

.preview-image {
  width: 100%;
  height: 100px;
  object-fit: cover;
  background-color: #fff;
}

.remove-image-btn {
  position: absolute;
  top: 5px;
  right: 5px;
  width: 24px;
  height: 24px;
  background-color: rgba(255, 77, 79, 0.9);
  border: none;
  border-radius: 50%;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  transition: all 0.2s;
}

.remove-image-btn:hover {
  background-color: #ff4d4f;
  transform: scale(1.1);
}

.image-name {
  position: absolute;
  bottom: 40px;
  left: 0;
  right: 0;
  background-color: rgba(0, 0, 0, 0.7);
  color: white;
  font-size: 12px;
  padding: 4px 6px;
  margin: 0;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.image-size {
  position: absolute;
  bottom: 20px;
  left: 0;
  right: 0;
  color: #666;
  font-size: 11px;
  padding: 2px 6px;
  margin: 0;
  text-align: center;
  background-color: rgba(255, 255, 255, 0.9);
}

.total-size {
  margin-top: 15px;
  padding: 10px;
  background-color: #f8f9fa;
  border-radius: 6px;
  text-align: center;
  color: #666;
  font-size: 14px;
  border: 1px solid #e9ecef;
}

.submit-btn, .back-btn {
  width: 100%;
  padding: 16px;
  font-size: 18px;
  font-weight: 600;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  margin-top: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  transition: all 0.3s ease;
}

.submit-btn {
  background-color: #3b82f6;
  color: white;
}

.submit-btn:hover:not(.disabled-btn) {
  background-color: #2563eb;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
}

.disabled-btn {
  background-color: #94a3b8 !important;
  cursor: not-allowed;
  transform: none !important;
  box-shadow: none !important;
}

.back-btn {
  background-color: #f5f5f5;
  color: #666;
}

.back-btn:hover {
  background-color: #e8e8e8;
}

.loading {
  text-align: center;
  padding: 100px 20px;
  color: #3b82f6;
  font-size: 18px;
}

.loading i {
  margin-right: 10px;
  font-size: 24px;
}

.success-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.modal-content {
  background-color: white;
  padding: 40px 30px;
  border-radius: 16px;
  text-align: center;
  max-width: 400px;
  width: 90%;
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

.success-icon {
  font-size: 60px;
  color: #52c41a;
  margin-bottom: 20px;
}

.modal-content h3 {
  margin: 0 0 10px 0;
  font-size: 24px;
  color: #333;
}

.modal-content p {
  margin: 0 0 30px 0;
  color: #666;
  font-size: 16px;
}

.modal-btn {
  padding: 12px 40px;
  background-color: #3b82f6;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.modal-btn:hover {
  background-color: #2563eb;
}

/* 状态提示 */
.status-toast {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  padding: 12px 20px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 10px;
  z-index: 1001;
  animation: slideUpToast 0.3s ease;
  max-width: 80%;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

@keyframes slideUpToast {
  from {
    transform: translateX(-50%) translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateX(-50%) translateY(0);
    opacity: 1;
  }
}

.status-toast.error {
  background-color: #fee;
  color: #c53030;
  border: 1px solid #feb2b2;
}

.status-toast.info {
  background-color: #ebf8ff;
  color: #2b6cb0;
  border: 1px solid #bee3f8;
}

.status-toast.success {
  background-color: #f0fff4;
  color: #2f855a;
  border: 1px solid #c6f6d5;
}

@media (max-width: 768px) {
  .header {
    padding: 12px 15px;
  }

  .logo {
    width: 50px;
    height: 40px;
    left: 15px;
  }

  h1 {
    font-size: 18px;
  }

  .form-content {
    padding: 15px;
  }

  .form-item {
    padding: 15px;
    margin-bottom: 20px;
  }

  .form-textarea {
    min-height: 120px;
  }

  .image-preview {
    width: calc(50% - 10px);
    height: 140px;
  }

  .preview-image {
    height: 80px;
  }

  .image-name {
    bottom: 30px;
    font-size: 11px;
  }

  .image-size {
    bottom: 15px;
    font-size: 10px;
  }

  .submit-btn, .back-btn {
    padding: 14px;
    font-size: 16px;
  }

  .status-toast {
    bottom: 10px;
    padding: 10px 15px;
    font-size: 14px;
  }
}

@media (max-width: 480px) {
  .image-preview {
    width: 100%;
    height: 150px;
  }

  .preview-image {
    height: 90px;
  }
}
</style>