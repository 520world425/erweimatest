<template>
  <div class="page-container">
    <div class="patrol-container">
      <img src="../assets/logo.png" alt="logo" class="logo" />
      <div class="header-content">
        <h1>{{ showAllProjectData ? currentProject.projectName : currentRepairArea.areaName || '报修系统' }}</h1>
        <!-- 显示提示信息 -->
        <p v-if="showAllProjectData" class="project-all-data-hint">
          <i class="fas fa-info-circle"></i>
          显示 {{ currentProject.projectName }} 项目所有区域数据
        </p>
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
            <th>维修时间</th>
            <th>维修人</th>
            <th>维修内容</th>
            <th>处理状态</th>
            <th>操作</th>
          </tr>
          </thead>
          <tbody>
          <tr v-for="record in currentPageRecords" :key="record.id">
            <td>{{ formatDateTime(record.datetime) }}</td>
            <td>{{ record.name }}</td>
            <td class="content-cell">{{ record.content }}</td>
            <td>{{ formatDateTime(record.datetime2) || '--' }}</td>
            <td>{{ record.name2 || '--' }}</td>
            <td class="content-cell">{{ record.content2 || '--' }}</td>
            <td>
              <span class="status-badge" :class="getStatusClass(record.status)">
                {{ getStatusText(record.status) }}
              </span>
            </td>
            <td>
              <div class="action-buttons">
                <button
                    class="detail-btn"
                    @click="viewRecordDetail(record)"
                    :disabled="!hasImages(record)"
                    :class="{ 'disabled-btn': !hasImages(record) }"
                >
                  <i class="fas fa-images"></i>
                  查看详情
                </button>
                <button
                    v-if="record.status === '2'"
                    class="accept-btn"
                    @click="handleAcceptOrder(record)"
                    :class="{ 'disabled-btn': !isLoggedIn }"
                    :title="!isLoggedIn ? '请先登录' : '接单'"
                >
                  <i class="fas fa-check-circle"></i>
                  接单
                </button>
                <button
                    v-else-if="record.status === '0' || record.status === '3'"
                    class="maintenance-btn-small"
                    @click="handleMaintenance(record)"
                    :class="{ 'disabled-btn': !isLoggedIn }"
                    :title="!isLoggedIn ? '请先登录' : '开始维修'"
                >
                  <i class="fas fa-wrench"></i>
                  开始维修
                </button>
              </div>
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

    <!-- 底部按钮容器 -->
    <div class="bottom-buttons">
      <button
          class="inspection-btn repair-btn"
          @click="handleRepairClick"
          :disabled="!currentRepairArea.areaKey"
          :class="{ 'disabled-btn': !currentRepairArea.areaKey }"
      >
        <i class="fas fa-wrench mr-2"></i>
        <span v-if="!currentRepairArea.areaKey">请选择有效区域</span>
        <span v-else>开始报修</span>
      </button>
    </div>

    <!-- 多图查看模态框 -->
    <div v-if="showMultiImageModal" class="modal-backdrop" @click="closeMultiImageModal">
      <div class="modal-container" @click.stop>
        <div class="modal-header">
          <h2>报修详情</h2>
          <button class="close-btn" @click="closeMultiImageModal">
            <i class="fas fa-times"></i>
          </button>
        </div>

        <div class="modal-body">
          <!-- 选项卡 -->
          <div class="detail-tabs">
            <button
                class="tab-button"
                :class="{ 'active': currentDetailType === 'repair' }"
                @click="switchDetailType('repair')"
            >
              报修详情
            </button>
            <button
                class="tab-button"
                :class="{ 'active': currentDetailType === 'maintenance' }"
                @click="switchDetailType('maintenance')"
                v-if="currentMultiImageRecord.name2 || currentMultiImageRecord.content2 || currentMultiImageRecord.datetime2 || maintenanceImages.length > 0"
            >
              维修详情
            </button>
          </div>

          <!-- 报修信息 -->
          <div v-if="currentDetailType === 'repair'" class="detail-info">
            <h3>报修信息</h3>
            <p><strong>报修人:</strong> {{ currentMultiImageRecord.name }}</p>
            <p><strong>联系电话:</strong> {{ currentMultiImageRecord.phone || '未提供' }}</p>
            <p><strong>报修时间:</strong> {{ formatDateTime(currentMultiImageRecord.datetime) }}</p>
            <p><strong>报修内容:</strong> {{ currentMultiImageRecord.content }}</p>
            <p><strong>处理状态:</strong>
              <span class="status-badge" :class="getStatusClass(currentMultiImageRecord.status)">
                {{ getStatusText(currentMultiImageRecord.status) }}
              </span>
            </p>
          </div>

          <!-- 维修信息 -->
          <div v-if="currentDetailType === 'maintenance'" class="detail-info">
            <h3>维修信息</h3>
            <p><strong>维修人:</strong> {{ currentMultiImageRecord.name2 || '未填写' }}</p>
            <p><strong>联系电话:</strong> {{ currentMultiImageRecord.phone2 || '未提供' }}</p>
            <p><strong>维修时间:</strong> {{ formatDateTime(currentMultiImageRecord.datetime2) || '未填写' }}</p>
            <p><strong>维修内容:</strong> {{ currentMultiImageRecord.content2 || '未填写' }}</p>
            <p><strong>处理状态:</strong>
              <span class="status-badge" :class="getStatusClass(currentMultiImageRecord.status)">
                {{ getStatusText(currentMultiImageRecord.status) }}
              </span>
            </p>
          </div>

          <!-- 图片区域 -->
          <div class="images-section">
            <h3 v-if="currentDetailType === 'repair'">报修图片 ({{ currentImages.length }}张)</h3>
            <h3 v-if="currentDetailType === 'maintenance'">维修图片 ({{ currentImages.length }}张)</h3>

            <!-- 图片计数器 -->
            <div class="image-counter" v-if="currentImages.length > 0">
              {{ currentMultiImageIndex + 1 }} / {{ currentImages.length }}
            </div>

            <!-- 图片加载状态 -->
            <div v-if="loadingImage" class="image-loading">
              <i class="fas fa-spinner fa-spin"></i> 加载图片中...
            </div>

            <!-- 图片显示区域 -->
            <div v-if="currentImages.length > 0" class="main-image-container" @click="enterFullscreen">
              <img
                  :src="currentImageUrl"
                  alt="图片详情"
                  class="modal-image"
                  @error="handleImageError"
              />
              <div v-if="imageLoadError" class="image-error">
                <i class="fas fa-exclamation-triangle"></i>
                图片加载失败
              </div>
              <!-- 全屏提示 -->
              <div class="fullscreen-hint" v-if="!showFullscreenViewer">
                <i class="fas fa-expand"></i> 点击图片全屏查看
              </div>
            </div>

            <!-- 无图片提示 -->
            <div v-if="currentImages.length === 0" class="no-images-section">
              <p class="no-images-text">该记录没有{{ currentDetailType === 'repair' ? '报修' : '维修' }}图片</p>
            </div>
          </div>

          <!-- 缩略图区域 -->
          <div v-if="currentImages.length > 1" class="thumbnail-container">
            <div
                v-for="(image, index) in currentImages"
                :key="index"
                class="thumbnail"
                :class="{ 'thumbnail-active': index === currentMultiImageIndex }"
                @click="switchImage(index)"
            >
              <div v-if="thumbnailLoading[index]" class="thumbnail-loading">
                <i class="fas fa-spinner fa-spin"></i>
              </div>
              <img
                  v-else
                  :src="thumbnailUrls[index] || getImageUrl(image)"
                  alt="缩略图"
                  class="thumbnail-image"
                  @load="onThumbnailLoad(index)"
                  @error="handleThumbnailError(index)"
              />
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button class="close-modal-btn" @click="closeMultiImageModal">关闭</button>
        </div>
      </div>
    </div>

    <!-- 全屏图片查看器 -->
    <div v-if="showFullscreenViewer" class="fullscreen-viewer" @click="exitFullscreen">
      <div class="fullscreen-content" @click.stop>
        <!-- 导航按钮 -->
        <div v-if="currentImages.length > 1" class="fullscreen-navigation">
          <button class="nav-btn prev-btn" @click.stop="prevImage" :disabled="currentMultiImageIndex === 0">
            <i class="fas fa-chevron-left"></i>
          </button>
          <button class="nav-btn next-btn" @click.stop="nextImage" :disabled="currentMultiImageIndex === currentImages.length - 1">
            <i class="fas fa-chevron-right"></i>
          </button>
        </div>
        <!-- 关闭按钮 -->
        <button class="fullscreen-close" @click="exitFullscreen">
          <i class="fas fa-times"></i>
        </button>
        <!-- 图片计数器 -->
        <div class="fullscreen-counter">
          {{ currentMultiImageIndex + 1 }} / {{ currentImages.length }}
        </div>
        <!-- 全屏图片 -->
        <img :src="currentImageUrl" alt="全屏图片" class="fullscreen-image" />
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
const currentProject = ref({}) // 新增：存储项目信息
const records = ref([])
const filteredRecords = ref([])
const selectedYear = ref('')
const selectedMonth = ref('')
const isLoading = ref(false)
const statusFilter = ref('') // 从URL获取的状态筛选

// 新增状态：是否显示项目所有数据
const showAllProjectData = ref(false)

// 多图查看相关
const showMultiImageModal = ref(false)
const repairImages = ref([]) // 报修图片（status=0）
const maintenanceImages = ref([]) // 维修图片（status=1）
const currentImages = ref([]) // 当前显示的图片
const currentMultiImageRecord = ref({})
const currentMultiImageIndex = ref(0)
const showFullscreenViewer = ref(false) // 全屏查看器状态
const currentDetailType = ref('repair') // 当前详情类型：repair或maintenance

// 新增状态：图片加载相关
const currentImageUrl = ref('')
const loadingImage = ref(false)
const imageLoadError = ref(false)
const thumbnailUrls = ref({})
const thumbnailLoading = ref({})
const thumbnailErrors = ref({})

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

// 监听当前图片索引变化
watch(currentMultiImageIndex, (newIndex) => {
  if (currentImages.value.length > 0) {
    loadCurrentImage()
  }
})

// 监听当前图片数组变化，加载缩略图
watch(currentImages, (newImages) => {
  if (newImages && newImages.length > 0) {
    loadAllThumbnails()
  }
}, { immediate: false })

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
 * 检查用户是否已登录
 */
const checkUserLoggedIn = () => {
  const user = localStorage.getItem('currentUser')
  return user ? JSON.parse(user) : null
}

// 计算属性：是否已登录
const isLoggedIn = computed(() => {
  return !!checkUserLoggedIn()
})

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

      // 加载项目信息
      await loadProjectInfo(repairAreaData.projectId)

      // 检查是否需要显示项目所有数据
      checkShowAllProjectData()

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
 * 加载项目信息
 */
const loadProjectInfo = async (projectId) => {
  try {
    const projectResponse = await request.get(`/projects/${projectId}`)
    if (projectResponse) {
      currentProject.value = {
        projectId: projectResponse.projectId,
        projectName: projectResponse.project,
        companyId: projectResponse.companyId,
        companyName: projectResponse.company
      }
    }
  } catch (error) {
    console.error('加载项目信息失败:', error)
  }
}

/**
 * 检查是否需要显示项目所有数据
 */
const checkShowAllProjectData = () => {
  if (currentProject.value.projectName && currentRepairArea.value.areaName) {
    // 当项目名称和区域名称相同时，显示项目所有数据
    showAllProjectData.value = currentProject.value.projectName === currentRepairArea.value.areaName

    if (showAllProjectData.value) {
      console.log('项目名称与区域名称相同，将显示项目所有数据')
    }
  }
}

/**
 * 加载报修数据
 */
const loadRepairData = async () => {
  try {
    isLoading.value = true

    const areaKey = currentRepairArea.value.areaKey
    const projectId = currentRepairArea.value.projectId
    let allRepairData = []

    console.log('开始加载报修数据，areaKey:', areaKey, 'projectId:', projectId)

    // 如果显示项目所有数据，则按项目查询
    if (showAllProjectData.value && projectId) {
      console.log('按项目查询所有报修数据，projectId:', projectId)
      try {
        // 使用项目接口查询（不包含图片）
        const response = await request.get(`/repair-data/project/${projectId}/without-images`)
        console.log('获取到项目响应数据:', response)
        allRepairData = extractDataFromResponse(response)

        // 如果没有数据，尝试使用带图片的接口（但需要处理可能的图片数据）
        if (allRepairData.length === 0) {
          console.log('无数据，尝试使用带图片的接口')
          const responseWithImages = await request.get(`/repair-data/project/${projectId}`)
          allRepairData = extractDataFromResponse(responseWithImages)
        }
      } catch (error) {
        console.error('按项目查询失败:', error)
        // 最后尝试使用appKey查询
        if (areaKey) {
          const response = await request.get(`/repair-data/appKey/${areaKey}/without-images`)
          allRepairData = extractDataFromResponse(response)
        }
      }
    }
    // 否则按区域查询
    else if (areaKey) {
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
      const response = await request.get('/repair-data/without-images')
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
 * 修复了处理大Base64字符串时的RangeError问题
 */
const extractDataFromResponse = (response) => {
  if (!response) {
    console.log('响应为空')
    return []
  }

  console.log('提取数据，响应类型:', typeof response)

  // 如果响应是字符串，尝试解析为JSON
  if (typeof response === 'string') {
    try {
      response = JSON.parse(response)
      console.log('解析字符串为JSON成功')
    } catch (error) {
      console.error('解析响应字符串失败:', error)
      return []
    }
  }

  // 检查是否为字符串类型（Base64图片数据）
  if (typeof response === 'string') {
    console.log('响应为字符串，可能是Base64图片数据，返回空数组')
    return []
  }

  // 检查是否为非对象类型（数字、布尔值等）
  if (response !== null && typeof response !== 'object') {
    console.log('响应为非对象类型，返回空数组')
    return []
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

    // 情况4: 尝试安全地获取对象属性
    // 避免使用Object.keys枚举可能包含大量属性的对象
    const safeKeys = []
    if (response && typeof response === 'object') {
      // 只检查常见的可能包含数组的属性
      const possibleArrayKeys = ['records', 'list', 'items', 'data', 'content', 'result']
      for (const key of possibleArrayKeys) {
        if (response[key] && Array.isArray(response[key])) {
          console.log(`从属性 ${key} 找到数组，长度:`, response[key].length)
          return response[key].slice(0, 100)
        }
      }

      // 如果不是常见的属性，安全地检查前几个属性
      try {
        // 限制检查的属性数量
        const keys = Object.keys(response).slice(0, 5)
        for (let i = 0; i < keys.length; i++) {
          const key = keys[i]
          if (Array.isArray(response[key])) {
            console.log(`从属性 ${key} 找到数组，长度:`, response[key].length)
            return response[key].slice(0, 100)
          }
        }
      } catch (keysError) {
        console.warn('安全枚举属性失败:', keysError.message)
        // 继续尝试其他方法
      }
    }

    // 情况5: 检查响应是否包含id等报修数据的字段（单个对象）
    if (response.id && response.name && response.content) {
      console.log('响应为单个报修记录对象，转换为数组')
      return [response]
    }

    console.log('未找到数组数据，响应结构:', typeof response === 'object' ?
        `对象，属性数量: ${Object.keys(response).length}` : '非对象')
    return []
  } catch (error) {
    console.error('提取数据时发生错误:', error.message)
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

      // 处理状态值为0、1、2、3的情况
      if (statusFilter.value === '0') {
        return recordStatus === '0'
      } else if (statusFilter.value === '1') {
        return recordStatus === '1'
      } else if (statusFilter.value === '2') {
        return recordStatus === '2'
      } else if (statusFilter.value === '3') {
        return recordStatus === '3'
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
    if (isNaN(date.getTime())) return ''

    // 格式化为: YYYY-MM-DD HH:mm
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')

    return `${year}-${month}-${day} ${hours}:${minutes}`
  } catch (error) {
    console.warn('格式化日期时间失败:', datetime, error)
    return ''
  }
}

/**
 * 获取状态文本 - 修改：添加状态2为"待接单"，状态3为"检验中"
 */
const getStatusText = (status) => {
  const statusMap = {
    '0': '修理中',
    '1': '已完成',
    '2': '待接单',
    '3': '检验中'
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
    '2': 'status-pending',
    '3': 'status-inspection'
  }
  return classMap[status] || ''
}

/**
 * 获取图片URL - 修改：修复图片显示问题
 */
const getImageUrl = (imageData) => {
  if (!imageData) return getPlaceholderImage()

  // 情况1：如果是标记为大图片数据的对象
  if (typeof imageData === 'object' && imageData.hasLargeData) {
    // 尝试从图片ID获取图片
    if (imageData.id) {
      return `/repair-images/${imageData.id}/image`
    }
    return getPlaceholderImage()
  }

  // 情况2：如果是RepairImage对象，有imageData字段
  if (imageData.imageData) {
    // 如果有实际的图片数据
    if (imageData.imageData !== 'LARGE_IMAGE_DATA' && !imageData.hasLargeData) {
      // 检查是否是有效的Base64数据
      if (typeof imageData.imageData === 'string') {
        if (imageData.imageData.startsWith('data:image')) {
          return fixBase64Format(imageData.imageData)
        } else if (imageData.imageData.length > 0) {
          return `data:image/jpeg;base64,${imageData.imageData}`
        }
      }
    }

    // 如果有ID，使用图片接口获取
    if (imageData.id) {
      return `/repair-images/${imageData.id}/image`
    }
  }

  // 情况3：如果只有图片ID
  if (imageData.id) {
    return `/repair-images/${imageData.id}/image`
  }

  // 情况4：检查是否是简单的图片对象，但没有imageData
  if (typeof imageData === 'object' && imageData.id && !imageData.imageData) {
    return `/repair-images/${imageData.id}/image`
  }

  // 情况5：直接就是Base64字符串（向后兼容）
  if (typeof imageData === 'string') {
    if (imageData.startsWith('data:image')) {
      return fixBase64Format(imageData)
    } else if (imageData.length > 0) {
      return `data:image/jpeg;base64,${imageData}`
    }
  }

  // 默认返回占位图
  return getPlaceholderImage()
}

/**
 * 修复 Base64 数据格式
 */
const fixBase64Format = (imageData) => {
  if (typeof imageData !== 'string') {
    return imageData
  }

  // 修复常见的格式错误：data:image/jpeg:base64. 替换为 data:image/jpeg;base64,
  if (imageData.includes('data:image/jpeg:base64.')) {
    imageData = imageData.replace('data:image/jpeg:base64.', 'data:image/jpeg;base64,')
  }
  // 修复其他可能的格式错误
  else if (imageData.includes('data:image/jpeg:base64,')) {
    // 已经是正确的，不需要修改
  }
  // 如果没有正确的 data URL 前缀，添加它
  else if (!imageData.startsWith('data:')) {
    imageData = `data:image/jpeg;base64,${imageData}`
  }
  // 如果有分号错误，修正
  else if (imageData.includes('data:image/jpeg:')) {
    imageData = imageData.replace('data:image/jpeg:', 'data:image/jpeg;')
  }

  return imageData
}

/**
 * 获取占位图片
 */
const getPlaceholderImage = () => {
  return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIGZpbGw9IiVFNUU1RTUiLz48cGF0aCBkPSJNMzAgMzVMMjUgMzBIMzVMMzAgMzVaIiBmaWxsPSIjQjVCNUI1Ii8+PHBhdGggZD0iTTM1IDI1SDI1VjM1SDM1VjI1WiIgZmlsbD0iI0QxRDFEMSIvPjxwYXRoIGQ9Ik0yNy41IDI3LjVIMzIuNVYzMi41SDI3LjVWMjcuNVoiIGZpbGw9IiNGRkYiLz48L3N2Zz4='
}

/**
 * 查看记录详情
 */
const viewRecordDetail = async (record) => {
  try {
    console.log('=== 开始查看记录详情 ===')
    console.log('记录ID:', record.id)
    console.log('记录状态:', record.status)
    console.log('原始图片数据:', record.images)

    // 重置状态
    currentDetailType.value = 'repair'
    repairImages.value = []
    maintenanceImages.value = []
    currentImageUrl.value = ''
    loadingImage.value = false
    imageLoadError.value = false
    thumbnailUrls.value = {}
    thumbnailLoading.value = {}
    thumbnailErrors.value = {}

    // 同时加载报修图片（status=0）和维修图片（status=1）
    console.log('=== 开始加载图片 ===')
    await Promise.all([
      loadImagesByStatus(record.id, '0', 'repair'),
      loadImagesByStatus(record.id, '1', 'maintenance')
    ])

    // 设置当前查看的记录
    currentMultiImageRecord.value = record
    currentImages.value = repairImages.value
    currentMultiImageIndex.value = 0
    showMultiImageModal.value = true

    // 加载当前图片
    if (currentImages.value.length > 0) {
      await loadCurrentImage()
    }

    console.log(`=== 图片加载完成 ===`)
    console.log(`报修图片: ${repairImages.value.length} 张`)
    console.log(`维修图片: ${maintenanceImages.value.length} 张`)
    console.log(`当前显示: ${currentImages.value.length} 张`)

  } catch (error) {
    console.error('加载记录详情失败:', error)
    alert('加载详情失败，请稍后重试')
  }
}

/**
 * 根据状态加载图片
 */
const loadImagesByStatus = async (repairDataId, status, type) => {
  try {
    console.log(`加载${type === 'repair' ? '报修' : '维修'}图片，repairDataId: ${repairDataId}, status: ${status}`)

    // 调用接口获取图片基本信息（不包含图片数据）
    const response = await request.get(`/repair-data/${repairDataId}/images/status/${status}`)
    let images = Array.isArray(response) ? response : []

    console.log(`从接口获取到 ${images.length} 张${type === 'repair' ? '报修' : '维修'}图片基本信息`)

    // 如果接口返回为空，尝试使用旧接口
    if (images.length === 0) {
      console.log('主接口无数据，尝试使用repair-images接口')
      const backupResponse = await request.get(`/repair-images/repair-data/${repairDataId}/status/${status}`)
      images = Array.isArray(backupResponse) ? backupResponse : []
      console.log(`备用接口获取到 ${images.length} 张图片`)
    }

    // 加载图片的实际数据
    const imagesWithData = await loadImageData(images)

    if (type === 'repair') {
      repairImages.value = imagesWithData
    } else {
      maintenanceImages.value = imagesWithData
    }

    console.log(`处理后的 ${type === 'repair' ? '报修' : '维修'}图片数量: ${imagesWithData.length}`)
  } catch (error) {
    console.error(`加载${type === 'repair' ? '报修' : '维修'}图片失败:`, error)
    // 如果失败，尝试使用备用方法加载
    await loadImagesByBackupMethod(repairDataId, status, type)
  }
}

/**
 * 备用方法加载图片
 */
const loadImagesByBackupMethod = async (repairDataId, status, type) => {
  try {
    console.log(`使用备用方法加载${type === 'repair' ? '报修' : '维修'}图片`)

    // 尝试通过报修数据接口获取
    const repairDataResponse = await request.get(`/repair-data/${repairDataId}`)
    if (repairDataResponse && repairDataResponse.images) {
      const images = repairDataResponse.images.filter(img => img.status === status)
      const imagesWithData = await loadImageData(images)

      if (type === 'repair') {
        repairImages.value = imagesWithData
      } else {
        maintenanceImages.value = imagesWithData
      }

      console.log(`通过备用方法加载到 ${imagesWithData.length} 张${type === 'repair' ? '报修' : '维修'}图片`)
    }
  } catch (error) {
    console.error(`备用方法加载${type === 'repair' ? '报修' : '维修'}图片失败:`, error)
    // 如果都失败，设置空数组
    if (type === 'repair') {
      repairImages.value = []
    } else {
      maintenanceImages.value = []
    }
  }
}

/**
 * 加载图片实际数据
 */
const loadImageData = async (images) => {
  if (!images || images.length === 0) {
    return []
  }

  const imagesWithData = []
  const loadPromises = []

  for (const image of images) {
    // 如果有图片ID，通过图片接口获取实际数据
    if (image.id) {
      const promise = loadSingleImageData(image)
          .then(imageWithData => {
            if (imageWithData) {
              imagesWithData.push(imageWithData)
            }
          })
          .catch(error => {
            console.error(`加载图片 ${image.id} 失败:`, error)
            // 即使加载失败，也保留基本信息
            imagesWithData.push(image)
          })

      loadPromises.push(promise)
    } else {
      // 如果没有ID但有图片数据，直接使用
      if (image.imageData) {
        // 检查是否是有效的Base64数据
        if (typeof image.imageData === 'string') {
          if (!image.imageData.startsWith('data:image')) {
            // 添加Base64前缀
            const imageWithData = {
              ...image,
              imageData: `data:image/jpeg;base64,${image.imageData}`
            }
            imagesWithData.push(imageWithData)
          } else {
            imagesWithData.push(image)
          }
        } else {
          // 如果不是字符串，跳过
          console.warn('跳过无效的图片数据格式')
        }
      } else {
        // 既没有ID也没有图片数据，跳过
        console.warn('跳过无效的图片对象')
      }
    }
  }

  // 等待所有图片加载完成
  await Promise.all(loadPromises)

  // 按order排序
  imagesWithData.sort((a, b) => (a.order || 0) - (b.order || 0))

  console.log(`成功处理 ${imagesWithData.length} 张图片`)
  return imagesWithData
}


/**
 * 加载单张图片数据
 */
const loadSingleImageData = async (image) => {
  if (!image.id) return image

  try {
    // 调用图片接口获取实际图片数据
    const response = await request.get(`/repair-images/${image.id}/image`, {
      responseType: 'arraybuffer'
    })

    // 将ArrayBuffer转换为Base64
    const base64 = arrayBufferToBase64(response)
    const imageWithData = {
      ...image,
      imageData: `data:image/jpeg;base64,${base64}`
    }

    console.log(`成功加载图片 ${image.id}`)
    return imageWithData
  } catch (error) {
    console.error(`加载图片 ${image.id} 失败:`, error)
    // 如果加载失败，尝试使用其他方法
    try {
      // 尝试直接获取图片信息
      const imageInfo = await request.get(`/repair-images/${image.id}`)
      return {
        ...image,
        ...imageInfo
      }
    } catch (infoError) {
      console.error(`获取图片信息 ${image.id} 失败:`, infoError)
      // 返回原始图片对象
      return image
    }
  }
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
 * 切换详情类型
 */
const switchDetailType = async (type) => {
  if (currentDetailType.value === type) return

  currentDetailType.value = type

  // 根据类型切换显示的图片
  if (type === 'repair') {
    // 如果报修图片未加载，则加载
    if (repairImages.value.length === 0) {
      await loadImagesByStatus(currentMultiImageRecord.value.id, '0', 'repair')
    }
    currentImages.value = repairImages.value
  } else {
    // 如果维修图片未加载，则加载
    if (maintenanceImages.value.length === 0) {
      await loadImagesByStatus(currentMultiImageRecord.value.id, '1', 'maintenance')
    }
    currentImages.value = maintenanceImages.value
  }

  // 重置图片索引
  currentMultiImageIndex.value = 0

  // 加载当前图片
  if (currentImages.value.length > 0) {
    await loadCurrentImage()
  }

  console.log(`切换到${type === 'repair' ? '报修' : '维修'}详情，显示 ${currentImages.value.length} 张图片`)
}

/**
 * 加载所有缩略图
 */
const loadAllThumbnails = async () => {
  if (!currentImages.value || currentImages.value.length === 0) {
    return
  }

  // 初始化缩略图状态
  thumbnailUrls.value = {}
  thumbnailLoading.value = {}
  thumbnailErrors.value = {}

  for (let i = 0; i < currentImages.value.length; i++) {
    await loadThumbnail(i)
  }
}

/**
 * 加载单个缩略图
 */
const loadThumbnail = async (index) => {
  if (!currentImages.value || index >= currentImages.value.length) {
    return
  }

  const imageData = currentImages.value[index]

  // 标记为加载中
  thumbnailLoading.value[index] = true
  thumbnailErrors.value[index] = false

  try {
    // 优先使用已有的 imageData
    if (imageData.imageData && imageData.imageData !== 'LARGE_IMAGE_DATA') {
      // 修复格式错误的 Base64 数据
      let fixedUrl = fixBase64Format(imageData.imageData)
      thumbnailUrls.value[index] = fixedUrl
    } else if (imageData.id) {
      // 如果有 ID 但没有数据，尝试通过 API 获取缩略图
      try {
        const response = await request.get(`/repair-images/${imageData.id}/image`, {
          responseType: 'blob'
        })

        if (response.data && response.data instanceof Blob) {
          const dataUrl = await blobToDataUrl(response.data)
          thumbnailUrls.value[index] = dataUrl
        } else {
          throw new Error('获取的图片数据格式不正确')
        }
      } catch (apiError) {
        console.warn(`通过API获取缩略图 ${index} 失败:`, apiError)
        thumbnailUrls.value[index] = getPlaceholderImage()
        thumbnailErrors.value[index] = true
      }
    } else {
      // 没有可用数据，使用占位图
      thumbnailUrls.value[index] = getPlaceholderImage()
    }
  } catch (error) {
    console.error(`加载缩略图 ${index} 失败:`, error)
    thumbnailUrls.value[index] = getPlaceholderImage()
    thumbnailErrors.value[index] = true
  } finally {
    thumbnailLoading.value[index] = false
  }
}

/**
 * 将Blob转换为Data URL
 */
const blobToDataUrl = (blob) => {
  return new Promise((resolve, reject) => {
    if (!blob || !(blob instanceof Blob)) {
      console.error('blobToDataUrl: 参数不是有效的Blob对象:', blob)
      reject(new Error('参数不是有效的Blob对象'))
      return
    }

    const reader = new FileReader()
    reader.onloadend = () => {
      if (reader.result) {
        resolve(reader.result)
      } else {
        reject(new Error('读取Blob数据失败'))
      }
    }
    reader.onerror = () => {
      console.error('FileReader错误:', reader.error)
      reject(reader.error)
    }

    try {
      reader.readAsDataURL(blob)
    } catch (error) {
      console.error('调用readAsDataURL失败:', error)
      reject(error)
    }
  })
}

/**
 * 加载当前图片
 */
const loadCurrentImage = async () => {
  if (currentImages.value.length === 0 || currentMultiImageIndex.value < 0) {
    currentImageUrl.value = ''
    return
  }

  const currentImage = currentImages.value[currentMultiImageIndex.value]
  loadingImage.value = true
  imageLoadError.value = false

  try {
    const url = await getImageUrl(currentImage)
    currentImageUrl.value = url
    console.log('当前图片URL（前100字符）:', url.substring(0, 100) + '...')
  } catch (error) {
    console.error('加载图片失败:', error)
    imageLoadError.value = true
    currentImageUrl.value = getPlaceholderImage()
  } finally {
    loadingImage.value = false
  }
}

/**
 * 缩略图加载成功处理
 */
const onThumbnailLoad = (index) => {
  thumbnailErrors.value[index] = false
  console.log(`缩略图 ${index} 加载成功`)
}

/**
 * 缩略图加载错误处理
 */
const handleThumbnailError = (index) => {
  console.warn(`缩略图 ${index} 加载失败`)
  thumbnailErrors.value[index] = true
  thumbnailUrls.value[index] = getPlaceholderImage()
}

/**
 * 图片加载错误处理
 */
const handleImageError = (event) => {
  console.error('图片加载错误:', event)
  imageLoadError.value = true
  currentImageUrl.value = getPlaceholderImage()
}

/**
 * 进入全屏查看模式
 */
const enterFullscreen = () => {
  if (currentImages.value.length > 0 && currentImageUrl.value) {
    showFullscreenViewer.value = true
  }
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
  if (currentMultiImageIndex.value < currentImages.value.length - 1) {
    currentMultiImageIndex.value++
  }
}

/**
 * 切换到指定图片
 */
const switchImage = (index) => {
  if (index >= 0 && index < currentImages.value.length) {
    currentMultiImageIndex.value = index
  }
}

/**
 * 关闭多图模态框
 */
const closeMultiImageModal = () => {
  showMultiImageModal.value = false
  showFullscreenViewer.value = false // 同时关闭全屏查看器
  repairImages.value = []
  maintenanceImages.value = []
  currentImages.value = []
  currentMultiImageRecord.value = {}
  currentMultiImageIndex.value = 0
  currentDetailType.value = 'repair'
  currentImageUrl.value = ''
  loadingImage.value = false
  imageLoadError.value = false
  thumbnailUrls.value = {}
  thumbnailLoading.value = {}
  thumbnailErrors.value = {}
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

/**
 * 处理接单操作
 */
const handleAcceptOrder = async (record) => {
  // 检查用户是否已登录
  if (!isLoggedIn.value) {
    // 未登录，跳转到登录页面
    const redirectPath = `/patrol1/${currentRepairArea.value.areaKey}`
    router.push({
      path: `/login1/${currentRepairArea.value.areaKey}`,
      query: { redirect: redirectPath }
    })
    return
  }

  if (!confirm('确定要接单吗？')) {
    return
  }

  try {
    isLoading.value = true

    // 调用API更新状态为0（修理中）
    const response = await request.patch(`/repair-data/${record.id}/status`, {
      status: '0'
    })

    if (response) {
      alert('接单成功！状态已更新为修理中')
      // 重新加载数据
      await loadRepairData()
    } else {
      throw new Error('更新状态失败')
    }
  } catch (error) {
    console.error('接单失败:', error)
    alert('接单失败，请重试')
  } finally {
    isLoading.value = false
  }
}

/**
 * 处理开始维修操作
 */
const handleMaintenance = (record) => {
  // 检查用户是否已登录
  if (!isLoggedIn.value) {
    // 未登录，跳转到登录页面
    const redirectPath = `/inspection-form2/${currentRepairArea.value.areaKey}?recordId=${record.id}`
    router.push({
      path: `/login1/${currentRepairArea.value.areaKey}`,
      query: { redirect: redirectPath }
    })
    return
  }

  // 已登录，跳转到维修表单页面
  router.push(`/inspection-form2/${currentRepairArea.value.areaKey}?recordId=${record.id}`)
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

/* 项目所有数据提示样式 */
.project-all-data-hint {
  margin: 5px 0 0 0;
  color: #3b82f6;
  font-size: 14px;
  background-color: #f0f7ff;
  padding: 4px 8px;
  border-radius: 4px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.project-all-data-hint i {
  font-size: 12px;
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

/* 修改：为内容容器添加水平滚动 */
.content {
  width: 100%;
  overflow-x: auto;
  overflow-y: visible;
}

/* 修改：为表格添加最小宽度以确保水平滚动 */
.repair-table {
  width: 100%;
  min-width: 1200px; /* 设置最小宽度，确保表格可以水平滚动 */
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

.status-inspection {
  background-color: #f3e8ff;
  color: #9333ea;
}

.status-cancelled {
  background-color: #f3f4f6;
  color: #6b7280;
}

/* 修改：操作按钮容器 - 改为行内布局 */
.action-buttons {
  display: flex;
  flex-direction: row; /* 改为行内布局 */
  gap: 8px;
  min-width: 180px; /* 增加最小宽度以适应水平布局 */
  flex-wrap: wrap; /* 在小屏幕上允许换行 */
  justify-content: flex-start;
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
  justify-content: center;
  gap: 5px;
  transition: all 0.2s;
  white-space: nowrap;
  flex-shrink: 0; /* 防止按钮缩小 */
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

/* 接单按钮样式 */
.accept-btn {
  padding: 6px 12px;
  background-color: #10b981;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  transition: all 0.2s;
  white-space: nowrap;
  flex-shrink: 0; /* 防止按钮缩小 */
}

.accept-btn:hover:not(.disabled-btn) {
  background-color: #0da271;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.accept-btn.disabled-btn {
  background-color: #94a3b8;
  cursor: not-allowed;
  opacity: 0.7;
}

.accept-btn i {
  font-size: 14px;
}

/* 开始维修按钮样式（小） */
.maintenance-btn-small {
  padding: 6px 12px;
  background-color: #f59e0b;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  transition: all 0.2s;
  white-space: nowrap;
  flex-shrink: 0; /* 防止按钮缩小 */
}

.maintenance-btn-small:hover:not(.disabled-btn) {
  background-color: #d97706;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.maintenance-btn-small.disabled-btn {
  background-color: #94a3b8;
  cursor: not-allowed;
  opacity: 0.7;
}

.maintenance-btn-small i {
  font-size: 14px;
}

/* 底部按钮容器 */
.bottom-buttons {
  position: fixed;
  bottom: 20px;
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  gap: 15px;
  padding: 0 20px;
  z-index: 90;
}

/* 报修按钮样式 */
.inspection-btn {
  padding: 12px 30px;
  font-size: 18px;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 160px;
}

.repair-btn {
  background-color: #3b82f6;
}

.repair-btn:hover:not(.disabled-btn) {
  background-color: #2563eb;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.disabled-btn {
  background-color: #94a3b8;
  cursor: not-allowed;
  transform: none;
}

.disabled-btn:hover {
  background-color: #94a3b8;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.inspection-btn i {
  font-size: 18px;
  margin-right: 8px;
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
  margin-bottom: 100px; /* 增加底部间距，避免与按钮重叠 */
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

/* 详情弹窗样式 - 模仿RepairTaskManagement.vue */
.modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal-container {
  background-color: white;
  border-radius: 8px;
  width: 100%;
  max-width: 800px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.modal-header {
  padding: 16px 20px;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h2 {
  margin: 0;
  font-size: 18px;
  color: #1e293b;
}

.close-btn {
  background: none;
  border: none;
  font-size: 18px;
  color: #94a3b8;
  cursor: pointer;
  transition: color 0.2s;
}

.close-btn:hover {
  color: #334155;
}

.modal-body {
  padding: 20px;
}

/* 选项卡样式 */
.detail-tabs {
  display: flex;
  border-bottom: 1px solid #e2e8f0;
  margin-bottom: 20px;
}

.tab-button {
  padding: 10px 20px;
  background: none;
  border: none;
  border-bottom: 3px solid transparent;
  cursor: pointer;
  font-size: 14px;
  color: #64748b;
  transition: all 0.2s;
}

.tab-button:hover {
  color: #3b82f6;
}

.tab-button.active {
  color: #3b82f6;
  border-bottom-color: #3b82f6;
  font-weight: 600;
}

.detail-info {
  margin-bottom: 20px;
  line-height: 1.6;
}

.detail-info h3 {
  margin: 0 0 15px 0;
  color: #1e293b;
  font-size: 16px;
  border-bottom: 1px solid #e2e8f0;
  padding-bottom: 8px;
}

.detail-info p {
  margin: 8px 0;
}

.detail-info strong {
  color: #334155;
  min-width: 100px;
  display: inline-block;
}

/* 图片区域样式 */
.images-section {
  margin-bottom: 20px;
}

.images-section h3 {
  margin: 0 0 10px 0;
  font-size: 16px;
  color: #334155;
}

.image-counter {
  text-align: center;
  color: #64748b;
  font-size: 14px;
  margin-bottom: 10px;
}

.main-image-container {
  position: relative;
  margin-bottom: 15px;
  cursor: pointer;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  overflow: hidden;
  background-color: #f8fafc;
  padding: 10px;
}

.modal-image {
  max-width: 100%;
  max-height: 400px;
  object-fit: contain;
  display: block;
  margin: 0 auto;
}

.fullscreen-hint {
  position: absolute;
  bottom: 10px;
  right: 10px;
  background-color: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 5px;
}

.image-loading {
  padding: 40px;
  text-align: center;
  color: #3b82f6;
  font-size: 14px;
}

.image-error {
  padding: 20px;
  text-align: center;
  background-color: #fee;
  border: 1px solid #f99;
  border-radius: 4px;
  color: #c00;
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
  min-height: 80px;
  align-items: center;
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
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f5f5f5;
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

.thumbnail-loading {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #3b82f6;
  font-size: 16px;
}

.thumbnail-loading i {
  animation: spin 1s linear infinite;
}

.modal-footer {
  padding: 16px 20px;
  border-top: 1px solid #e2e8f0;
  display: flex;
  justify-content: flex-end;
}

.close-modal-btn {
  padding: 8px 16px;
  background-color: #3b82f6;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.2s;
}

.close-modal-btn:hover {
  background-color: #2563eb;
}

/* 全屏查看器样式 */
.fullscreen-viewer {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
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
  max-height: 80vh;
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
  z-index: 2001;
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
  z-index: 2001;
}

/* 全屏导航按钮 */
.fullscreen-navigation {
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-between;
  padding: 0 20px;
  transform: translateY(-50%);
  z-index: 2001;
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

@media (max-width: 768px) {
  .header-content {
    align-items: flex-start;
  }

  .project-all-data-hint {
    font-size: 12px;
    padding: 3px 6px;
  }

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

  /* 移动端操作按钮调整 */
  .action-buttons {
    flex-direction: column; /* 移动端恢复垂直布局 */
    gap: 5px;
    min-width: 100px;
  }

  .detail-btn,
  .accept-btn,
  .maintenance-btn-small {
    padding: 4px 8px;
    font-size: 11px;
    width: 100%; /* 移动端全宽 */
  }

  .modal-container {
    width: 95%;
    padding: 15px;
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
    margin-bottom: 120px; /* 移动端增加更多间距 */
  }

  .pagination-info {
    margin-left: 0;
    margin-top: 8px;
    width: 100%;
    text-align: center;
  }

  /* 移动端底部按钮调整 */
  .bottom-buttons {
    flex-direction: column;
    gap: 10px;
    padding: 0 15px;
  }

  .inspection-btn {
    width: 100%;
    padding: 10px 20px;
    font-size: 16px;
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

  .detail-tabs {
    flex-direction: column;
  }

  .tab-button {
    text-align: left;
    border-bottom: none;
    border-left: 3px solid transparent;
    border-radius: 0;
  }

  .tab-button.active {
    border-left-color: #3b82f6;
    border-bottom-color: transparent;
  }
}

/* 触摸设备优化 */
@media (hover: none) and (pointer: coarse) {
  .thumbnail:hover,
  .nav-btn:hover:not(:disabled) {
    transform: none;
  }

  .nav-btn {
    padding: 12px;
    min-width: 44px;
    min-height: 44px;
  }
}
</style>