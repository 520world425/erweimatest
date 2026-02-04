<template>
  <div class="repair-form-container">
    <div class="header">
      <img src="../assets/logo.png" alt="logo" class="logo" />
      <h1>{{ areaName }} - 报修信息填写</h1>
    </div>

    <div class="form-content" v-if="!isLoading">
      <!-- 报修单位（自动获取） -->
      <div class="form-item">
        <p>报修单位 <span class="required">*</span></p>
        <input
            type="text"
            v-model="formData.projectName"
            class="form-input disabled-input"
            disabled
            placeholder="自动获取报修单位"
        />
        <p class="field-desc">根据当前区域自动获取</p>
      </div>

      <!-- 报修区域（动态显示） -->
      <div class="form-item">
        <p>报修区域 <span class="required">*</span></p>

        <!-- 当项目名称和区域名称相同时，显示下拉选择框 -->
        <template v-if="showAreaSelect">
          <select
              v-model="selectedAreaKey"
              class="form-input"
              :class="{ 'error-border': errors.areaName }"
              @change="onAreaSelectChange"
          >
            <option value="" disabled>请选择报修区域</option>
            <option v-for="area in availableAreas"
                    :key="area.areaKey"
                    :value="area.areaKey">
              {{ area.areaName }}
            </option>
          </select>
          <p class="field-desc">当前报修单位下有多个区域，请选择具体区域</p>
        </template>

        <!-- 否则显示普通输入框 -->
        <template v-else>
          <input
              type="text"
              v-model="formData.areaName"
              class="form-input disabled-input"
              disabled
              placeholder="自动获取报修区域"
          />
          <p class="field-desc">当前报修区域</p>
        </template>

        <p class="error-text" v-if="errors.areaName">{{ errors.areaName }}</p>
      </div>

      <!-- 报修人姓名 -->
      <div class="form-item">
        <p>报修人姓名 <span class="required">*</span></p>
        <input
            type="text"
            v-model="formData.reporterName"
            class="form-input"
            :class="{ 'error-border': errors.reporterName }"
            placeholder="请输入报修人姓名"
            @input="clearError('reporterName')"
        />
        <p class="error-text" v-if="errors.reporterName">{{ errors.reporterName }}</p>
      </div>

      <!-- 报修人手机号 -->
      <div class="form-item">
        <p>报修人手机号 <span class="required">*</span></p>
        <input
            type="tel"
            v-model="formData.reporterPhone"
            class="form-input"
            :class="{ 'error-border': errors.reporterPhone }"
            placeholder="请输入手机号码"
            @input="clearError('reporterPhone')"
        />
        <p class="error-text" v-if="errors.reporterPhone">{{ errors.reporterPhone }}</p>
      </div>

      <!-- 报修内容 -->
      <div class="form-item">
        <p>报修内容 <span class="required">*</span></p>
        <textarea
            v-model="formData.description"
            class="form-textarea"
            :class="{ 'error-border': errors.description }"
            placeholder="请详细描述报修问题"
            rows="6"
            @input="clearError('description')"
        ></textarea>
        <p class="error-text" v-if="errors.description">{{ errors.description }}</p>
      </div>

      <!-- 报修图片 -->
      <div class="form-item">
        <p>报修图片 <span class="required">*</span></p>
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

          <p class="error-text" v-if="errors.images">{{ errors.images }}</p>
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
        {{ isSubmitting ? '提交中...' : '提交报修' }}
      </button>

      <!-- 返回按钮 -->
      <button class="back-btn" @click="goBack">
        <i class="fas fa-arrow-left"></i>
        返回
      </button>
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
        <h3>报修提交成功！</h3>
        <p>您的报修信息已成功提交，我们将尽快处理。</p>
        <button class="modal-btn" @click="handleSuccessClose">确定</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import request from '../utils/request'

// 路由配置
const router = useRouter()
const route = useRoute()

// 状态管理
const areaName = ref('')
const isLoading = ref(true)
const isSubmitting = ref(false)
const showSuccessModal = ref(false)
const fileInput = ref(null)
const uploadProgress = ref(0)

// 表单数据
const formData = ref({
  projectName: '',
  areaName: '',
  reporterName: '',
  reporterPhone: '',
  description: '',
  images: [],
  projectId: null,
  appKey: ''
})

// 新增状态
const showAreaSelect = ref(false)
const selectedAreaKey = ref('')
const availableAreas = ref([])

// 错误信息
const errors = ref({
  reporterName: '',
  reporterPhone: '',
  description: '',
  images: '',
  areaName: ''
})

// 图片文件
const imageFiles = ref([])

// 计算总文件大小
const totalFileSize = computed(() => {
  return imageFiles.value.reduce((total, file) => total + (file.size || 0), 0)
})

// 页面加载时初始化数据
onMounted(async () => {
  await initializeForm()
})

/**
 * 初始化表单数据
 */
const initializeForm = async () => {
  try {
    isLoading.value = true

    const areaKey = route.params.area || 'zhulou'
    const repairAreaResponse = await request.get(`/repair-areas/areaKey/${areaKey}`)

    if (repairAreaResponse) {
      areaName.value = repairAreaResponse.areaName || '报修区域'
      formData.value.areaName = repairAreaResponse.areaName
      formData.value.appKey = areaKey

      const projectId = repairAreaResponse.projectId
      if (projectId) {
        const projectResponse = await request.get(`/projects/${projectId}`)
        if (projectResponse) {
          formData.value.projectName = projectResponse.project || '未知项目'
          formData.value.projectId = projectId

          // 获取当前项目下的所有区域
          await loadProjectAreas(projectId, areaKey)
        }
      }

      // 删除自动填充用户信息的代码
      formData.value.reporterName = ''
      formData.value.reporterPhone = ''
    }
  } catch (error) {
    console.error('初始化表单失败:', error)
    alert('加载页面信息失败，请刷新重试')
  } finally {
    isLoading.value = false
  }
}

/**
 * 加载项目下的所有区域
 */
const loadProjectAreas = async (projectId, currentAreaKey) => {
  try {
    // 获取项目下的所有报修区域
    const areasResponse = await request.get(`/repair-areas/project/${projectId}`)

    if (areasResponse && Array.isArray(areasResponse)) {
      // 检查项目名称和区域名称是否相同
      const currentArea = areasResponse.find(area => area.areaKey === currentAreaKey)
      if (currentArea && formData.value.projectName === currentArea.areaName) {
        // 名称相同，显示下拉选择框
        showAreaSelect.value = true

        // 获取除了当前区域外的其他区域
        availableAreas.value = areasResponse
            .filter(area => area.areaKey !== currentAreaKey)
            .map(area => ({
              areaKey: area.areaKey,
              areaName: area.areaName
            }))

        // 如果没有其他区域，则不显示下拉框
        if (availableAreas.value.length === 0) {
          showAreaSelect.value = false
        } else {
          // 默认选择第一个区域
          selectedAreaKey.value = availableAreas.value[0].areaKey
          formData.value.appKey = availableAreas.value[0].areaKey
          formData.value.areaName = availableAreas.value[0].areaName
        }
      }
    }
  } catch (error) {
    console.error('加载项目区域失败:', error)
    showAreaSelect.value = false
  }
}

/**
 * 区域选择变化事件
 */
const onAreaSelectChange = () => {
  const selectedArea = availableAreas.value.find(area => area.areaKey === selectedAreaKey.value)
  if (selectedArea) {
    formData.value.appKey = selectedArea.areaKey
    formData.value.areaName = selectedArea.areaName
  }
  clearError('areaName')
}

/**
 * 清除错误信息
 */
const clearError = (field) => {
  if (errors.value[field]) {
    errors.value[field] = ''
  }
}

/**
 * 触发文件输入
 */
const triggerFileInput = () => {
  fileInput.value.click()
}

/**
 * 格式化文件大小
 */
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * 压缩图片
 */
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

        // 压缩质量，根据原始大小调整
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

/**
 * 处理文件上传
 */
const handleFileUpload = async (event) => {
  const files = Array.from(event.target.files)

  // 检查文件数量
  if (imageFiles.value.length + files.length > 5) {
    alert('最多只能上传5张图片')
    return
  }

  for (const file of files) {
    // 检查文件类型
    if (!file.type.startsWith('image/')) {
      alert('只能上传图片文件')
      continue
    }

    // 检查文件大小（10MB限制）
    if (file.size > 10 * 1024 * 1024) {
      alert(`图片"${file.name}"太大（${formatFileSize(file.size)}），请选择小于10MB的图片`)
      continue
    }

    try {
      console.log(`开始压缩图片: ${file.name} (${formatFileSize(file.size)})`)

      // 压缩图片
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

        // 更新表单数据
        formData.value.images = imageFiles.value.map(item => item.file)
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
        formData.value.images = imageFiles.value.map(item => item.file)
      }
      reader.readAsDataURL(file)
    }
  }

  // 清空input值以便重复选择
  event.target.value = ''
}

/**
 * 移除图片
 */
const removeImage = (index) => {
  imageFiles.value.splice(index, 1)
  formData.value.images = imageFiles.value.map(item => item.file)
}

/**
 * 验证表单
 */
const validateForm = () => {
  let isValid = true
  const newErrors = {
    reporterName: '',
    reporterPhone: '',
    description: '',
    images: '',
    areaName: ''
  }

  if (!formData.value.reporterName?.trim()) {
    newErrors.reporterName = '请填写报修人姓名'
    isValid = false
  }

  const phoneRegex = /^1[3-9]\d{9}$/
  if (!formData.value.reporterPhone?.trim()) {
    newErrors.reporterPhone = '请填写手机号码'
    isValid = false
  } else if (!phoneRegex.test(formData.value.reporterPhone.trim())) {
    newErrors.reporterPhone = '请输入正确的手机号码'
    isValid = false
  }

  if (!formData.value.description?.trim()) {
    newErrors.description = '请填写报修内容'
    isValid = false
  } else if (formData.value.description.trim().length < 2) { // 修改为最低2个字符
    newErrors.description = '报修内容至少2个字符'
    isValid = false
  }

  if (imageFiles.value.length === 0) {
    newErrors.images = '请至少上传一张报修图片'
    isValid = false
  }

  // 新增：验证区域选择（当显示下拉框时）
  if (showAreaSelect.value && !selectedAreaKey.value) {
    newErrors.areaName = '请选择报修区域'
    isValid = false
  }

  errors.value = newErrors
  return isValid
}

/**
 * 格式化时间为 ISO 格式
 */
const formatLocalDateTime = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
}

/**
 * 提交报修表单
 */
const submitRepairForm = async () => {
  if (isSubmitting.value) return

  if (!validateForm()) {
    return
  }

  isSubmitting.value = true
  uploadProgress.value = 0

  try {
    // 创建 RepairData 对象，status改为2
    const repairData = {
      name: formData.value.reporterName.trim(),
      phone: formData.value.reporterPhone.trim(),
      content: formData.value.description.trim(),
      datetime: formatLocalDateTime(),
      appKey: formData.value.appKey, // 使用选择的appKey
      projectId: formData.value.projectId,
      status: '2' // 修改为2
    }

    console.log('创建 RepairData 对象:', repairData)
    console.log('报修区域:', formData.value.areaName, 'appKey:', formData.value.appKey)
    console.log('准备上传的图片数量:', imageFiles.value.length)
    console.log('压缩前总大小:', formatFileSize(imageFiles.value.reduce((sum, file) => sum + (file.originalSize || file.size), 0)))
    console.log('压缩后总大小:', formatFileSize(totalFileSize.value))

    // 检查总大小是否合理（不超过30MB）
    if (totalFileSize.value > 30 * 1024 * 1024) {
      alert('上传的图片总大小超过30MB，请减少图片数量或压缩图片')
      isSubmitting.value = false
      return
    }

    // 创建 FormData
    const formDataToSend = new FormData();

    // 添加 repairData 作为 JSON 字符串
    const repairDataBlob = new Blob([JSON.stringify(repairData)], { type: 'application/json' });
    formDataToSend.append('repairData', repairDataBlob);

    // 添加所有图片（支持多张图片上传）
    for (let i = 0; i < imageFiles.value.length; i++) {
      const imageFile = imageFiles.value[i];
      if (imageFile.file) {
        formDataToSend.append('images', imageFile.file);
        console.log(`图片 ${i + 1}: ${imageFile.name} (${formatFileSize(imageFile.size)})`);
      }
    }

    // 发送请求
    const response = await request.post('/repair-data', formDataToSend, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      timeout: 10000,
      // 上传进度回调
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          uploadProgress.value = percentCompleted;
          console.log(`上传进度: ${percentCompleted}% (${formatFileSize(progressEvent.loaded)}/${formatFileSize(progressEvent.total)})`);
        }
      }
    });

    console.log('提交成功，响应数据:', response)

    if (response && response.images) {
      console.log(`后端成功保存了 ${response.images.length} 张图片`);
    }

    // 显示成功弹窗
    showSuccessModal.value = true

    // 清空表单
    formData.value.reporterName = ''
    formData.value.reporterPhone = ''
    formData.value.description = ''
    imageFiles.value = []
    formData.value.images = []
    uploadProgress.value = 0
    selectedAreaKey.value = ''

  } catch (error) {
    console.error('提交报修失败:', error)

    let errorMessage = '提交失败: '

    if (error.response) {
      if (error.response.status === 413) {
        errorMessage = '上传的图片太大，系统已自动压缩但仍超过限制。请减少图片数量或压缩图片后再试。'
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

    alert(errorMessage)
  } finally {
    isSubmitting.value = false
    uploadProgress.value = 0
  }
}

/**
 * 处理成功弹窗关闭
 */
const handleSuccessClose = () => {
  showSuccessModal.value = false
  const areaKey = route.params.area || 'zhulou'
  router.push(`/patrol1/${areaKey}`)
}

/**
 * 返回上一页
 */
const goBack = () => {
  const areaKey = route.params.area || 'zhulou'
  router.push(`/patrol1/${areaKey}`)
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

/* 下拉框样式 */
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

select.form-input {
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='%23333' viewBox='0 0 16 16'%3E%3Cpath d='M7.247 11.14L2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 16px center;
  background-size: 16px;
  padding-right: 40px;
}

.form-input:focus,
.form-textarea:focus,
select.form-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.disabled-input {
  background-color: #f5f5f5;
  color: #666;
  cursor: not-allowed;
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

/* 修改textarea样式，增加高度 */
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
  min-height: 150px; /* 从100px增加到150px */
  line-height: 1.5;
  font-family: inherit;
}

.form-textarea:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

/* 图片上传样式 */
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

/* 按钮样式 */
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

/* 加载中样式 */
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

/* 成功弹窗样式 */
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

/* 响应式设计 */
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

  select.form-input {
    background-position: right 12px center;
    padding-right: 36px;
  }

  .form-textarea {
    min-height: 120px; /* 移动端稍小一点 */
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