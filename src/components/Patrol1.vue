<template>
  <div class="page-container">
    <div class="patrol-container">
      <img src="../assets/logo.png" alt="logo" class="logo" />
      <div class="header-content">
        <h1>{{ currentRepairArea.areaName || '报修系统' }}</h1>
      </div>
    </div>

    <div class="search-container">
      <div class="search-fields">
        <div class="form-group">
          <label for="year">年份:</label>
          <select v-model="selectedYear" id="year" @change="handleSearchChange">
            <option value="">全部年份</option>
            <option v-for="year in availableYears" :key="year" :value="year">{{ year }}</option>
          </select>
        </div>
        <div class="form-group">
          <label for="month">月份:</label>
          <select v-model="selectedMonth" id="month" @change="handleSearchChange">
            <option value="">全部月份</option>
            <option v-for="month in 12" :key="month" :value="month">{{ month }}</option>
          </select>
        </div>
        <button class="reset-btn" @click="resetSearch">重置</button>
      </div>
    </div>

    <div class="content-wrapper" ref="contentWrapper">
      <div class="content" ref="content">
        <div class="no-data" v-if="!isLoading && currentPageRecords.length === 0">
          暂无报修记录
        </div>

        <table class="repair-table" v-if="currentPageRecords.length > 0">
          <thead>
          <tr>
            <th>报修时间</th>
            <th>报修人</th>
            <th>报修内容</th>
            <th>处理状态</th>
            <th>操作</th>
          </tr>
          </thead>
          <tbody>
          <tr v-for="record in currentPageRecords" :key="record.id">
            <td>{{ formatDateTime(record.datetime) }}</td>
            <td>{{ record.name }}</td>
            <td class="content-cell">{{ record.content }}</td>
            <td>
              <span class="status-badge" :class="getStatusClass(record.status)">
                {{ getStatusText(record.status) }}
              </span>
            </td>
            <td>
              <button
                  class="detail-btn"
                  @click="viewRecordDetail(record)"
                  :disabled="!hasImages(record)"
                  :class="{ 'disabled-btn': !hasImages(record) }"
              >
                <i class="fas fa-images"></i>
                查看详情
              </button>
            </td>
          </tr>
          </tbody>
        </table>

        <!-- 加载中提示 -->
        <div class="loading" v-if="isLoading">
          <i class="fas fa-spinner fa-spin"></i> 加载中...
        </div>
      </div>
    </div>

    <!-- 分页控件 -->
    <div class="pagination" v-if="totalPages > 1">
      <button
          class="pagination-btn"
          @click="changePage(1)"
          :disabled="currentPage === 1"
          aria-label="首页"
      >
        <i class="fas fa-angle-double-left"></i>
      </button>
      <button
          class="pagination-btn"
          @click="changePage(currentPage - 1)"
          :disabled="currentPage === 1"
          aria-label="上一页"
      >
        <i class="fas fa-angle-left"></i>
      </button>
      <template v-if="visiblePages[0] > 1">
        <button class="pagination-page" @click="changePage(1)">1</button>
        <span class="pagination-ellipsis" v-if="visiblePages[0] > 2">...</span>
      </template>
      <button
          v-for="page in visiblePages"
          :key="page"
          class="pagination-page"
          :class="{ 'pagination-page-active': page === currentPage }"
          @click="changePage(page)"
      >
        {{ page }}
      </button>
      <template v-if="visiblePages[visiblePages.length - 1] < totalPages">
        <span class="pagination-ellipsis" v-if="visiblePages[visiblePages.length - 1] < totalPages - 1">...</span>
        <button class="pagination-page" @click="changePage(totalPages)">{{ totalPages }}</button>
      </template>
      <button
          class="pagination-btn"
          @click="changePage(currentPage + 1)"
          :disabled="currentPage === totalPages"
          aria-label="下一页"
      >
        <i class="fas fa-angle-right"></i>
      </button>
      <button
          class="pagination-btn"
          @click="changePage(totalPages)"
          :disabled="currentPage === totalPages"
          aria-label="末页"
      >
        <i class="fas fa-angle-double-right"></i>
      </button>
      <div class="pagination-info">
        共 {{ totalItems }} 条，当前第 {{ currentPage }} / {{ totalPages }} 页
      </div>
    </div>

    <button
        class="inspection-btn"
        @click="handleRepairClick"
        :disabled="!currentRepairArea.areaKey"
        :class="{ 'disabled-btn': !currentRepairArea.areaKey }"
    >
      <span v-if="!currentRepairArea.areaKey">请选择有效区域</span>
      <span v-else>开始报修</span>
    </button>

    <!-- 多图查看模态框 -->
    <div v-if="showMultiImageModal" class="multi-image-modal" @click="closeMultiImageModal">
      <div class="modal-content" @click.stop>
        <button class="modal-close" @click="closeMultiImageModal">
          <i class="fas fa-times"></i>
        </button>

        <div class="multi-image-header">
          <h3>报修详情 ({{ currentMultiImageIndex + 1 }}/{{ currentMultiImages.length }})</h3>
          <!-- 移除图片导航按钮 -->
        </div>

        <div class="record-info">
          <h4>报修信息</h4>
          <p><strong>报修人:</strong> {{ currentMultiImageRecord.name }}</p>
          <p><strong>联系电话:</strong> {{ currentMultiImageRecord.phone || '未提供' }}</p>
          <p><strong>报修时间:</strong> {{ formatDateTime(currentMultiImageRecord.datetime) }}</p>
          <p><strong>报修内容:</strong> {{ currentMultiImageRecord.content }}</p>
          <p><strong>处理状态:</strong> <span class="status-badge" :class="getStatusClass(currentMultiImageRecord.status)">
            {{ getStatusText(currentMultiImageRecord.status) }}
          </span></p>
        </div>

        <div v-if="currentMultiImages.length > 0" class="multi-image-viewer">
          <div class="image-section">
            <h4>报修图片 ({{ currentMultiImages.length }}张) - <small>点击图片可全屏查看</small></h4>
            <div class="image-container">
              <img
                  :src="getImageUrl(currentMultiImages[currentMultiImageIndex])"
                  alt="报修图片详情"
                  class="modal-image"
                  @click="enterFullscreen"
              />
            </div>
          </div>
        </div>
        <div v-else class="no-images-section">
          <p class="no-images-text">该记录没有图片</p>
        </div>

        <div v-if="currentMultiImages.length > 0" class="thumbnail-container">
          <div
              v-for="(image, index) in currentMultiImages"
              :key="index"
              class="thumbnail"
              :class="{ 'thumbnail-active': index === currentMultiImageIndex }"
              @click="switchImage(index)"
          >
            <img
                :src="getImageUrl(image)"
                alt="缩略图"
                class="thumbnail-image"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- 全屏图片查看器 -->
    <div v-if="showFullscreenViewer" class="fullscreen-viewer" @click="exitFullscreen">
      <div class="fullscreen-content" @click.stop>
        <!-- 全屏模式下的导航按钮 -->
        <div class="fullscreen-navigation">
          <button class="nav-btn prev-btn" @click.stop="prevImage" :disabled="currentMultiImageIndex === 0">
            <i class="fas fa-chevron-left"></i>
          </button>
          <button class="nav-btn next-btn" @click.stop="nextImage" :disabled="currentMultiImageIndex === currentMultiImages.length - 1">
            <i class="fas fa-chevron-right"></i>
          </button>
        </div>

        <!-- 关闭按钮 -->
        <button class="fullscreen-close" @click="exitFullscreen">
          <i class="fas fa-times"></i>
        </button>

        <!-- 图片计数器 -->
        <div class="fullscreen-counter">
          {{ currentMultiImageIndex + 1 }} / {{ currentMultiImages.length }}
        </div>

        <!-- 全屏图片 -->
        <img
            :src="getImageUrl(currentMultiImages[currentMultiImageIndex])"
            alt="全屏报修图片"
            class="fullscreen-image"
            @click.stop
        />

        <!-- 缩略图导航（全屏模式下） -->
        <div v-if="currentMultiImages.length > 1" class="fullscreen-thumbnails">
          <div
              v-for="(image, index) in currentMultiImages"
              :key="index"
              class="fullscreen-thumbnail"
              :class="{ 'fullscreen-thumbnail-active': index === currentMultiImageIndex }"
              @click.stop="switchImage(index)"
          >
            <img
                :src="getImageUrl(image)"
                alt="缩略图"
                class="fullscreen-thumbnail-image"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useRouter, useRoute } from 'vue-router'
import { ref, computed, onMounted, watch } from 'vue'
import request from '../utils/request'

// 路由与请求配置
const router = useRouter()
const route = useRoute()

// 分页配置
const pageSize = ref(10)
const currentPage = ref(1)
const totalItems = ref(0)

// 状态管理
const currentRepairArea = ref({})
const records = ref([])
const filteredRecords = ref([])
const selectedYear = ref('')
const selectedMonth = ref('')
const isLoading = ref(false)
const statusFilter = ref('') // 从URL获取的状态筛选

// 多图查看相关
const showMultiImageModal = ref(false)
const currentMultiImages = ref([])
const currentMultiImageRecord = ref({})
const currentMultiImageIndex = ref(0)
const showFullscreenViewer = ref(false) // 全屏查看器状态

// 页面初始化
onMounted(() => {
  // 引入Font Awesome图标库
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
  document.head.appendChild(link)

  // 从URL提取状态参数
  extractStatusFromUrl()

  // 加载区域和数据
  loadRepairAreaAndData()
})

/**
 * 从URL路径中提取状态参数
 */
const extractStatusFromUrl = () => {
  const path = route.path
  // 匹配类似 /repair/pending 这样的路径
  const statusMatch = path.match(/\/repair\/([^\/]+)/)
  if (statusMatch && statusMatch[1]) {
    statusFilter.value = statusMatch[1]
  } else {
    // 默认显示所有状态
    statusFilter.value = ''
  }
  console.log('当前状态筛选:', statusFilter.value)
}

/**
 * 加载报修区域信息和数据
 */
const loadRepairAreaAndData = async () => {
  const routeAreaKey = route.params.area
  if (routeAreaKey) {
    await loadRepairArea(routeAreaKey)
  } else {
    // 如果没有区域参数，直接加载数据
    await loadRepairData()
  }
}

/**
 * 加载报修区域信息
 */
const loadRepairArea = async (areaKey) => {
  try {
    isLoading.value = true

    // 获取报修区域信息
    const response = await request.get(`/repair-areas/areaKey/${areaKey}`)
    const repairAreaData = response

    if (repairAreaData && repairAreaData.areaKey) {
      currentRepairArea.value = {
        areaKey: repairAreaData.areaKey,
        areaName: repairAreaData.areaName,
        projectId: repairAreaData.projectId
      }

      // 加载该区域的报修记录
      await loadRepairData()
    } else {
      throw new Error('报修区域数据格式错误')
    }
  } catch (error) {
    console.error('加载报修区域失败:', error)
    // 即使区域加载失败，也尝试加载数据
    await loadRepairData()
  } finally {
    isLoading.value = false
  }
}

/**
 * 加载报修数据
 */
const loadRepairData = async () => {
  try {
    isLoading.value = true

    const areaKey = currentRepairArea.value.areaKey
    let allRepairData = []

    console.log('开始加载报修数据，areaKey:', areaKey)

    // 如果有区域key，按区域查询
    if (areaKey) {
      console.log('按区域查询报修数据（不包含图片），areaKey:', areaKey)
      try {
        // 使用新接口，不获取图片数据
        const response = await request.get(`/repair-data/appKey/${areaKey}/without-images`)
        console.log('获取到响应数据（不包含图片）:', response)
        allRepairData = extractDataFromResponse(response)
      } catch (error) {
        console.error('按区域查询（不包含图片）失败:', error)
        // 回退到原接口
        const response = await request.get(`/repair-data/appKey/${areaKey}`)
        allRepairData = extractDataFromResponse(response)
      }
    }
    // 如果没有区域但有状态筛选，按状态查询
    else if (statusFilter.value) {
      console.log('按状态查询报修数据，status:', statusFilter.value)
      const response = await request.get(`/repair-data/status/${statusFilter.value}`)
      allRepairData = extractDataFromResponse(response)
    }
    // 否则查询所有数据
    else {
      console.log('查询所有报修数据')
      const response = await request.get('/repair-data')
      allRepairData = extractDataFromResponse(response)
    }

    console.log('获取到的报修数据数量:', allRepairData.length)

    // 处理图片数据，避免过大的 Base64 数据
    allRepairData = processRepairData(allRepairData)

    // 检查每条记录的图片数据
    allRepairData.forEach((record, index) => {
      console.log(`记录 ${index + 1}: ID=${record.id}, 图片数量=${record.images ? record.images.length : 0}, 单张图片=${record.image ? '有' : '无'}`)
      if (record.images && record.images.length > 0) {
        console.log(`  - 包含 ${record.images.length} 张图片`)
      }
    })

    // 应用筛选条件
    const filtered = applyFilters(allRepairData)
    filteredRecords.value = filtered

    // 更新总记录数和分页
    totalItems.value = filtered.length
    updateCurrentPageData()

  } catch (error) {
    console.error('加载报修数据失败:', error)
    console.error('错误详情:', error.message)
    console.error('错误堆栈:', error.stack)

    // 不再使用模拟数据，直接显示空数据
    console.log('加载数据失败，显示空数据')
    filteredRecords.value = []
    totalItems.value = 0
    updateCurrentPageData()
  } finally {
    isLoading.value = false
  }
}

/**
 * 处理报修数据，清理过大的图片数据
 */
const processRepairData = (data) => {
  if (!Array.isArray(data)) return []

  return data.map(record => {
    // 创建处理后的记录副本
    const processedRecord = { ...record }

    // 处理单张图片数据（如果有且过大）
    if (processedRecord.image && processedRecord.image.length > 10000) {
      // 如果图片数据过大，只保留标识
      processedRecord.image = 'LARGE_IMAGE_DATA'
    }

    // 处理多张图片
    if (processedRecord.images && Array.isArray(processedRecord.images)) {
      processedRecord.images = processedRecord.images.map((image, index) => {
        if (image && image.imageData && image.imageData.length > 10000) {
          // 如果图片数据过大，只保留基本信息
          return {
            ...image,
            imageData: 'LARGE_IMAGE_DATA',
            hasLargeData: true,
            id: image.id || index
          }
        }
        return image
      })
    }

    return processedRecord
  })
}

/**
 * 从响应中提取数据 - 修复版本
 */
const extractDataFromResponse = (response) => {
  if (!response) {
    console.log('响应为空')
    return []
  }

  console.log('提取数据，响应类型:', typeof response)
  console.log('响应结构:', Object.keys(response).slice(0, 5))

  // 如果响应是字符串，尝试解析为JSON
  if (typeof response === 'string') {
    try {
      response = JSON.parse(response)
    } catch (error) {
      console.error('解析响应字符串失败:', error)
      return []
    }
  }

  try {
    // 情况1: response 本身就是数组
    if (Array.isArray(response)) {
      console.log('响应本身就是数组，长度:', response.length)
      return response.slice(0, 100) // 限制数量避免过大
    }

    // 情况2: response.data 是数组
    if (response.data && Array.isArray(response.data)) {
      console.log('从response.data获取数组，长度:', response.data.length)
      return response.data.slice(0, 100)
    }

    // 情况3: response 有 content 属性（分页响应）
    if (response.content && Array.isArray(response.content)) {
      console.log('从response.content获取数组，长度:', response.content.length)
      return response.content.slice(0, 100)
    }

    // 情况4: 检查是否只有一个大的Base64字符串（可能是图片数据）
    if (typeof response === 'object' && Object.keys(response).length === 1) {
      const firstKey = Object.keys(response)[0]
      if (typeof response[firstKey] === 'string' && response[firstKey].length > 1000) {
        console.log('检测到大Base64数据，可能不是报修数据')
        return []
      }
    }

    // 情况5: 尝试遍历 response 的所有属性寻找数组（限制遍历数量）
    let arrayFound = null
    const keys = Object.keys(response)
    for (let i = 0; i < Math.min(keys.length, 10); i++) {
      const key = keys[i]
      if (Array.isArray(response[key])) {
        console.log(`从属性 ${key} 找到数组，长度:`, response[key].length)
        arrayFound = response[key].slice(0, 100)
        break
      }
    }

    if (arrayFound) {
      return arrayFound
    }

    console.log('未找到数组数据，返回空数组')
    return []
  } catch (error) {
    console.error('提取数据时发生错误:', error)
    return []
  }
}

/**
 * 判断记录是否有图片
 */
const hasImages = (record) => {
  return (record.images && record.images.length > 0) ||
      (record.image && record.image !== 'LARGE_IMAGE_DATA')
}

/**
 * 应用筛选条件
 */
const applyFilters = (records) => {
  if (!records || records.length === 0) {
    return []
  }

  console.log('开始筛选，原始记录数量:', records.length)
  console.log('筛选条件 - 年份:', selectedYear.value, '月份:', selectedMonth.value, '状态:', statusFilter.value)

  // 首先按URL状态筛选
  let filteredByStatus = records
  if (statusFilter.value) {
    filteredByStatus = records.filter(record => {
      const recordStatus = record.status?.toString() // 转为字符串以便比较

      // 处理状态值为0、1、2的情况
      if (statusFilter.value === '0') {
        return recordStatus === '0'
      } else if (statusFilter.value === '1') {
        return recordStatus === '1'
      } else if (statusFilter.value === '2') {
        return recordStatus === '2'
      } else {
        // 对于其他状态值，直接比较
        return recordStatus === statusFilter.value
      }
    })
    console.log('状态筛选后数量:', filteredByStatus.length)
  }

  // 然后按时间筛选
  return filteredByStatus.filter(record => {
    if (!record.datetime) return false

    try {
      const date = new Date(record.datetime)
      const recordYear = date.getFullYear()
      const recordMonth = date.getMonth() + 1

      // 年份筛选
      if (selectedYear.value && recordYear !== Number(selectedYear.value)) {
        return false
      }
      // 月份筛选
      if (selectedMonth.value && recordMonth !== Number(selectedMonth.value)) {
        return false
      }

      return true
    } catch (error) {
      console.warn('解析时间失败:', record.datetime, error)
      return false
    }
  })
}

/**
 * 更新当前页数据
 */
const updateCurrentPageData = () => {
  const startIndex = (currentPage.value - 1) * pageSize.value
  const endIndex = startIndex + pageSize.value
  records.value = filteredRecords.value.slice(startIndex, endIndex)
  return records.value
}

/**
 * 当前页显示的数据
 */
const currentPageRecords = computed(() => {
  return records.value
})

/**
 * 格式化日期时间
 */
const formatDateTime = (datetime) => {
  if (!datetime) return ''

  try {
    const date = new Date(datetime)
    if (isNaN(date.getTime())) return datetime

    // 格式化为: YYYY-MM-DD HH:mm
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')

    return `${year}-${month}-${day} ${hours}:${minutes}`
  } catch (error) {
    console.warn('格式化日期时间失败:', datetime, error)
    return datetime
  }
}

/**
 * 获取状态文本 - 修改：当status为"0"时显示"待处理"
 */
const getStatusText = (status) => {
  const statusMap = {
    '0': '修理中',
    '1': '已完成',
    '2': '待接单'
  }
  // 如果有映射则返回映射值，否则返回状态本身或"未知"
  return statusMap[status] || status || '未知'
}

/**
 * 获取状态样式类
 */
const getStatusClass = (status) => {
  const classMap = {
    '0': 'status-in-progress',
    '1': 'status-completed',
    '2': 'status-pending'
  }
  return classMap[status] || ''
}

/**
 * 获取图片URL
 */
const getImageUrl = (imageData) => {
  if (!imageData) return ''

  // 情况1：如果是标记为大图片数据的对象
  if (typeof imageData === 'object' && imageData.hasLargeData) {
    // 尝试从图片ID获取图片
    if (imageData.id) {
      return `/api/repair-images/${imageData.id}/image`
    }
    return getPlaceholderImage()
  }

  // 情况2：如果是RepairImage对象，有ID但没有imageData
  if (imageData.imageData) {
    // 如果有实际的图片数据
    if (imageData.imageData !== 'LARGE_IMAGE_DATA' && !imageData.hasLargeData) {
      // 检查是否是有效的Base64数据
      if (typeof imageData.imageData === 'string') {
        if (imageData.imageData.startsWith('data:image')) {
          return imageData.imageData
        } else if (imageData.imageData.length < 10000) {
          return `data:image/jpeg;base64,${imageData.imageData}`
        }
      }
    }

    // 如果有ID，使用图片接口获取
    if (imageData.id) {
      return `/api/repair-images/${imageData.id}/image`
    }
  }

  // 情况3：如果只有图片ID
  if (imageData.id) {
    return `/api/repair-images/${imageData.id}/image`
  }

  // 情况4：检查是否是简单的图片对象，但没有imageData
  if (typeof imageData === 'object' && imageData.id && !imageData.imageData) {
    return `/api/repair-images/${imageData.id}/image`
  }

  // 情况5：直接就是Base64字符串（向后兼容）
  if (typeof imageData === 'string') {
    if (imageData.startsWith('data:image')) {
      return imageData
    } else if (imageData.length > 0 && imageData.length < 10000) {
      return `data:image/jpeg;base64,${imageData}`
    }
  }

  // 默认返回占位图
  return getPlaceholderImage()
}

/**
 * 获取占位图片
 */
const getPlaceholderImage = () => {
  return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIGZpbGw9IiVFNUU1RTUiLz48cGF0aCBkPSJNMzAgMzVMMjUgMzBIMzVMMzAgMzVaIiBmaWxsPSIjQjVCNUI1Ii8+PHBhdGggZD0iTTM1IDI1SDI1VjM1SDM1VjI1WiIgZmlsbD0iI0QxRDFEMSIvPjxwYXRoIGQ9Ik0yNy41IDI3LjVIMzIuNVYzMi41SDI3LjVWMjcuNVoiIGZpbGw9IiNGRkYiLz48L3N2Zz4='
}

/**
 * 查看记录详情（包括图片）
 */
const viewRecordDetail = async (record) => {
  try {
    let images = []

    // 如果有images字段，直接使用
    if (record.images && record.images.length > 0) {
      // 加载图片数据
      images = await loadImageData(record.images)
    }
    // 否则如果有image字段（向后兼容）
    else if (record.image && record.image !== 'LARGE_IMAGE_DATA') {
      // 将单张图片转换为图片对象格式
      const imageObj = {
        imageData: record.image,
        fileName: '报修图片',
        fileSize: null,
        order: 0
      }
      images = [imageObj]
    }

    // 设置当前查看的记录
    currentMultiImageRecord.value = record
    currentMultiImages.value = images
    currentMultiImageIndex.value = 0
    showMultiImageModal.value = true

    console.log(`查看记录详情，共 ${images.length} 张图片`)
  } catch (error) {
    console.error('加载记录详情失败:', error)
    alert('加载详情失败，请稍后重试')
  }
}

/**
 * 加载图片实际数据
 */
const loadImageData = async (images) => {
  const imagesWithData = []

  for (const image of images) {
    if (image.id && !image.imageData) {
      try {
        // 调用图片接口获取实际图片数据
        const response = await request.get(`/repair-images/${image.id}/image`, {
          responseType: 'arraybuffer' // 重要：指定响应类型
        })

        // 将ArrayBuffer转换为Base64
        const base64 = arrayBufferToBase64(response)
        const imageWithData = {
          ...image,
          imageData: `data:image/jpeg;base64,${base64}`
        }
        imagesWithData.push(imageWithData)
      } catch (error) {
        console.error(`加载图片 ${image.id} 失败:`, error)
        // 如果加载失败，保留基本信息
        imagesWithData.push(image)
      }
    } else {
      imagesWithData.push(image)
    }
  }

  return imagesWithData
}

/**
 * 将ArrayBuffer转换为Base64
 */
const arrayBufferToBase64 = (buffer) => {
  let binary = ''
  const bytes = new Uint8Array(buffer)
  const len = bytes.byteLength
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

/**
 * 进入全屏查看模式
 */
const enterFullscreen = () => {
  showFullscreenViewer.value = true
}

/**
 * 退出全屏查看模式
 */
const exitFullscreen = () => {
  showFullscreenViewer.value = false
}

/**
 * 切换到上一张图片
 */
const prevImage = () => {
  if (currentMultiImageIndex.value > 0) {
    currentMultiImageIndex.value--
  }
}

/**
 * 切换到下一张图片
 */
const nextImage = () => {
  if (currentMultiImageIndex.value < currentMultiImages.value.length - 1) {
    currentMultiImageIndex.value++
  }
}

/**
 * 切换到指定图片
 */
const switchImage = (index) => {
  if (index >= 0 && index < currentMultiImages.value.length) {
    currentMultiImageIndex.value = index
  }
}

/**
 * 关闭多图模态框
 */
const closeMultiImageModal = () => {
  showMultiImageModal.value = false
  showFullscreenViewer.value = false // 同时关闭全屏查看器
  currentMultiImages.value = []
  currentMultiImageRecord.value = {}
  currentMultiImageIndex.value = 0
}

/**
 * 可选年份
 */
const availableYears = computed(() => {
  const years = new Set()
  const currentYear = new Date().getFullYear()
  for (let year = currentYear - 2; year <= currentYear; year++) {
    years.add(year)
  }
  return Array.from(years).sort((a, b) => b - a)
})

/**
 * 总页数计算
 */
const totalPages = computed(() => {
  return Math.ceil(totalItems.value / pageSize.value)
})

/**
 * 可见页码计算
 */
const visiblePages = computed(() => {
  const pages = []
  const total = totalPages.value

  if (total <= 5) {
    for (let i = 1; i <= total; i++) pages.push(i)
    return pages
  }

  if (currentPage.value <= 3) return [1, 2, 3, 4, 5]
  if (currentPage.value >= total - 2) {
    return [total - 4, total - 3, total - 2, total - 1, total]
  }

  return [
    currentPage.value - 2,
    currentPage.value - 1,
    currentPage.value,
    currentPage.value + 1,
    currentPage.value + 2
  ]
})

/**
 * 筛选条件变化时重新加载数据
 */
const handleSearchChange = () => {
  currentPage.value = 1
  loadRepairData()
}

/**
 * 重置筛选条件
 */
const resetSearch = () => {
  selectedYear.value = ''
  selectedMonth.value = ''
  currentPage.value = 1
  loadRepairData()
}

/**
 * 改变页码
 */
const changePage = (newPage) => {
  if (newPage < 1 || newPage > totalPages.value) return
  currentPage.value = newPage
  updateCurrentPageData()
}

/**
 * 处理报修按钮点击
 */
const handleRepairClick = () => {
  if (!currentRepairArea.value.areaKey) {
    alert('请先选择有效区域')
    return
  }

  // 直接跳转到报修表单页面（无需登录）
  router.push(`/inspection-form1/${currentRepairArea.value.areaKey}`)
}
</script>

<style scoped>
/* 引入Font Awesome图标库 */
@import url('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css');

.page-container {
  padding-top: 0;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.patrol-container {
  position: sticky;
  top: 0;
  z-index: 100;
  background-color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px 20px;
  border-bottom: 1px solid #eee;
  height: 80px; /* 调整高度 */
}

.logo {
  width: 70px;
  height: 60px;
  position: absolute;
  left: 20px;
  top: 50%;
  transform: translateY(-50%);
}

.header-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
}

h1 {
  margin: 0;
  font-size: 24px;
  color: #333;
}

.search-container {
  position: sticky;
  top: 80px; /* 调整top值 */
  z-index: 99;
  padding: 15px 20px;
  background-color: #f9f9f9;
  border-bottom: 1px solid #eee;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

.search-fields {
  display: flex;
  gap: 20px;
  align-items: center;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.form-group label {
  font-size: 14px;
  color: #666;
}

.form-group select {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  min-width: 120px;
}

.reset-btn {
  padding: 8px 16px;
  background-color: #f0f0f0;
  color: #333;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.reset-btn:hover {
  background-color: #e0e0e0;
}

.content-wrapper {
  flex: 1;
  padding: 20px;
  box-sizing: border-box;
  overflow-y: auto;
  max-height: calc(100vh - 260px); /* 调整高度 */
}

.content {
  width: 100%;
  overflow-x: auto;
}

.repair-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 0;
}

.repair-table th,
.repair-table td {
  border: 1px solid #ddd;
  padding: 12px 15px;
  text-align: left;
  font-size: 14px;
}

.repair-table th {
  font-weight: bold;
  background-color: #f9f9f9;
  position: sticky;
  top: 0;
  z-index: 10;
}

.repair-table tr:hover {
  background-color: #f5f5f5;
}

.content-cell {
  max-width: 300px;
  word-wrap: break-word;
  overflow-wrap: break-word;
}

.no-data, .loading {
  color: #666;
  padding: 30px;
  text-align: center;
}

.loading {
  color: #3b82f6;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.loading i {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* 状态标签样式 */
.status-badge {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 500;
  display: inline-block;
}

.status-pending {
  background-color: #fef3c7;
  color: #d97706;
}

.status-in-progress {
  background-color: #dbeafe;
  color: #2563eb;
}

.status-completed {
  background-color: #dcfce7;
  color: #16a34a;
}

.status-cancelled {
  background-color: #f3f4f6;
  color: #6b7280;
}

/* 详情按钮样式 */
.detail-btn {
  padding: 6px 12px;
  background-color: #3b82f6;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 5px;
  transition: all 0.2s;
}

.detail-btn:hover:not(.disabled-btn) {
  background-color: #2563eb;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.detail-btn.disabled-btn {
  background-color: #94a3b8;
  cursor: not-allowed;
  opacity: 0.7;
}

.detail-btn i {
  font-size: 14px;
}

/* 图片容器样式 */
.image-container {
  cursor: pointer;
  transition: transform 0.3s ease;
}

.image-container:hover .modal-image {
  transform: scale(1.02);
}

/* 图片模态框样式 */
.multi-image-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.modal-content {
  position: relative;
  background-color: white;
  border-radius: 8px;
  padding: 20px;
  max-width: 90%;
  max-height: 90%;
  overflow: auto;
  width: 600px;
}

.modal-close {
  position: absolute;
  top: 10px;
  right: 10px;
  background: none;
  border: none;
  font-size: 24px;
  color: #666;
  cursor: pointer;
  padding: 5px;
  z-index: 2001;
}

.modal-close:hover {
  color: #333;
}

.modal-image {
  max-width: 100%;
  max-height: 400px;
  object-fit: contain;
  border: 1px solid #eee;
  border-radius: 4px;
  margin-top: 10px;
  cursor: zoom-in;
  transition: transform 0.3s ease;
}

/* 多图查看特有样式 */
.multi-image-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 1px solid #eee;
}

.multi-image-header h3 {
  margin: 0;
  font-size: 18px;
  color: #333;
}

/* 记录信息样式 */
.record-info {
  margin-bottom: 20px;
  padding: 15px;
  background-color: #f9f9f9;
  border-radius: 6px;
  border-left: 4px solid #3b82f6;
}

.record-info h4 {
  margin-top: 0;
  margin-bottom: 10px;
  color: #333;
}

.record-info p {
  margin: 5px 0;
  color: #555;
}

.record-info strong {
  color: #333;
  min-width: 80px;
  display: inline-block;
}

/* 图片区域样式 */
.image-section {
  margin-bottom: 20px;
}

.image-section h4 {
  margin-bottom: 10px;
  color: #333;
}

.image-section small {
  color: #666;
  font-size: 12px;
}

.no-images-section {
  text-align: center;
  padding: 40px 20px;
  background-color: #f9f9f9;
  border-radius: 6px;
  margin-bottom: 20px;
}

.no-images-text {
  color: #666;
  font-style: italic;
}

/* 缩略图容器样式 */
.thumbnail-container {
  display: flex;
  gap: 10px;
  margin-top: 15px;
  padding-top: 15px;
  border-top: 1px solid #eee;
  overflow-x: auto;
  justify-content: center;
}

.thumbnail {
  width: 60px;
  height: 60px;
  cursor: pointer;
  border: 2px solid transparent;
  border-radius: 4px;
  overflow: hidden;
  flex-shrink: 0;
  transition: all 0.2s;
}

.thumbnail:hover {
  border-color: #3b82f6;
  transform: scale(1.05);
}

.thumbnail-active {
  border-color: #3b82f6;
  box-shadow: 0 0 5px rgba(59, 130, 246, 0.5);
}

.thumbnail-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* 分页控件样式 */
.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 16px;
  flex-wrap: wrap;
  background-color: white;
  border-top: 1px solid #e2e8f0;
  margin-bottom: 80px;
}

.pagination-btn {
  background-color: white;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  padding: 4px 8px;
  cursor: pointer;
  color: #64748b;
  transition: all 0.2s;
}

.pagination-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pagination-btn:hover:not(:disabled) {
  background-color: #f1f5f9;
  color: #334155;
}

.pagination-page {
  background-color: white;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #64748b;
  transition: all 0.2s;
}

.pagination-page:hover:not(.pagination-page-active) {
  background-color: #f1f5f9;
  color: #334155;
}

.pagination-page-active {
  background-color: #3b82f6;
  color: white;
  border-color: #3b82f6;
}

.pagination-ellipsis {
  color: #94a3b8;
  padding: 0 4px;
}

.pagination-info {
  margin-left: 16px;
  font-size: 13px;
  color: #64748b;
}

.inspection-btn {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  padding: 12px 30px;
  font-size: 18px;
  background-color: #3b82f6;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  z-index: 90;
  transition: all 0.3s ease;
}

.inspection-btn:hover:not(.disabled-btn) {
  background-color: #2563eb;
  transform: translateX(-50%) translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.disabled-btn {
  background-color: #94a3b8;
  cursor: not-allowed;
  transform: translateX(-50%);
}

.disabled-btn:hover {
  background-color: #94a3b8;
  transform: translateX(-50%);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

/* 全屏查看器样式 */
.fullscreen-viewer {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.95);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 3000;
}

.fullscreen-content {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.fullscreen-image {
  max-width: 90%;
  max-height: 70vh;
  object-fit: contain;
  border-radius: 4px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
}

.fullscreen-close {
  position: absolute;
  top: 20px;
  right: 20px;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  font-size: 24px;
  color: white;
  cursor: pointer;
  padding: 10px;
  border-radius: 50%;
  width: 50px;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  z-index: 3001;
}

.fullscreen-close:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: rotate(90deg);
}

.fullscreen-counter {
  position: absolute;
  top: 20px;
  left: 20px;
  background: rgba(0, 0, 0, 0.5);
  color: white;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 14px;
  z-index: 3001;
}

.fullscreen-navigation {
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-between;
  padding: 0 20px;
  transform: translateY(-50%);
  z-index: 3001;
}

.nav-btn {
  background: rgba(255, 255, 255, 0.1);
  border: none;
  color: white;
  cursor: pointer;
  padding: 15px;
  border-radius: 50%;
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  transition: all 0.3s ease;
}

.nav-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.2);
  transform: scale(1.1);
}

.nav-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.fullscreen-thumbnails {
  position: absolute;
  bottom: 20px;
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  gap: 10px;
  padding: 10px;
  overflow-x: auto;
  z-index: 3001;
}

.fullscreen-thumbnail {
  width: 60px;
  height: 60px;
  cursor: pointer;
  border: 2px solid transparent;
  border-radius: 4px;
  overflow: hidden;
  flex-shrink: 0;
  transition: all 0.2s;
  opacity: 0.7;
}

.fullscreen-thumbnail:hover {
  opacity: 1;
  transform: scale(1.05);
}

.fullscreen-thumbnail-active {
  border-color: #3b82f6;
  opacity: 1;
  box-shadow: 0 0 8px rgba(59, 130, 246, 0.8);
}

.fullscreen-thumbnail-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

@media (max-width: 768px) {
  .search-container {
    flex-direction: column;
    align-items: stretch;
    padding: 15px;
  }

  .search-fields {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
  }

  .reset-btn {
    margin-top: 10px;
    width: 100%;
  }

  .content-wrapper {
    max-height: calc(100vh - 340px); /* 调整移动端高度 */
  }

  .repair-table {
    font-size: 12px;
  }

  .repair-table th,
  .repair-table td {
    padding: 8px 10px;
  }

  .detail-btn {
    padding: 4px 8px;
    font-size: 11px;
  }

  .modal-content {
    width: 95%;
    padding: 15px;
  }

  .multi-image-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }

  .modal-image {
    max-height: 300px;
  }

  .thumbnail {
    width: 40px;
    height: 40px;
  }

  .pagination {
    gap: 4px;
    margin-bottom: 70px;
  }

  .pagination-info {
    margin-left: 0;
    margin-top: 8px;
    width: 100%;
    text-align: center;
  }

  /* 移动端全屏查看器调整 */
  .fullscreen-image {
    max-width: 95%;
    max-height: 60vh;
  }

  .fullscreen-close {
    top: 10px;
    right: 10px;
    width: 40px;
    height: 40px;
    font-size: 20px;
  }

  .fullscreen-counter {
    top: 10px;
    left: 10px;
    font-size: 12px;
  }

  .nav-btn {
    width: 50px;
    height: 50px;
    font-size: 20px;
  }

  .fullscreen-thumbnail {
    width: 50px;
    height: 50px;
  }
}

/* 触摸设备优化 */
@media (hover: none) and (pointer: coarse) {
  .thumbnail:hover,
  .fullscreen-thumbnail:hover {
    transform: none;
  }

  .nav-btn {
    padding: 12px;
    min-width: 44px;
    min-height: 44px;
  }
}
</style>