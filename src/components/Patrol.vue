<template>
  <div class="page-container">
    <!-- 退出登录按钮 - 新增部分 -->
    <div class="logout-container">
      <button class="logout-btn" @click="handleLogout" v-if="isLoggedIn">
        <i class="fas fa-sign-out-alt"></i>
        退出登录
      </button>
      <button class="login-btn" @click="goToLogin" v-else>
        <i class="fas fa-sign-in-alt"></i>
        登录
      </button>
    </div>

    <div class="patrol-container">
      <img src="../assets/logo.png" alt="logo" class="logo" />
      <div class="header-content">
        <h1>{{ currentAreaConfig.title }}</h1>
        <h2 class="location-title">{{ currentAreaConfig.areaName }}</h2>
      </div>
    </div>
    <div class="search-container">
      <div class="search-fields">
        <div class="form-group hide-area-select" v-if="allAreaList.length > 0">
          <label for="areaKey">巡检区域:</label>
          <select v-model="selectedAreaKey" id="areaKey" @change="handleAreaChange">
            <option value="">请选择区域</option>
            <option v-for="area in allAreaList" :key="area.areaKey" :value="area.areaKey">
              {{ area.areaName }}
            </option>
          </select>
        </div>
        <div class="form-group">
          <label for="userType">巡检人类型:</label>
          <select v-model="selectedUserType" id="userType" @change="handleSearchChange">
            <option value="">全部类型</option>
            <option value="1">一线员工</option>
            <option value="2">项目管理员</option>
            <option value="3">合作方管理员</option>
          </select>
        </div>
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
      </div>
      <div class="patrol-status">
        <div class="status-item">
          <span class="status-label">今日巡检次数:</span>
          <span class="status-value">{{ todayPatrolCount }}</span>
        </div>
        <div class="status-item">
          <span class="status-label">巡检状态:</span>
          <span class="status-badge" :class="getPatrolStatusClass">
            {{ getPatrolStatusText }}
          </span>
        </div>
        <div class="status-item" v-if="!isLoggedIn">
          <span class="status-label">登录状态:</span>
          <span class="status-badge status-not-logged">
            未登录
          </span>
        </div>
      </div>
      <button class="reset-btn" @click="resetSearch">重置</button>
    </div>
    <div class="content-wrapper" ref="contentWrapper">
      <div class="content" ref="content">
        <table class="patrol-table" v-if="currentAreaConfig.items && currentAreaConfig.items.length">
          <thead>
          <tr>
            <th>时间</th>
            <th>发起人</th>
            <th>用户类型</th>
            <th v-for="(item, index) in currentAreaConfig.items" :key="index">
              <span v-html="formatHeaderText(item.label)"></span>
            </th>
          </tr>
          </thead>
          <tbody>
          <tr v-for="record in currentPageRecords" :key="record.id">
            <td>{{ record.time }}</td>
            <td>
              <div class="sponsor-cell">
                <span>{{ record.sponsor }}</span>
              </div>
            </td>
            <td>{{ getUserTypeText(record.userType) }}</td>
            <td v-for="(item, index) in currentAreaConfig.items" :key="index">
              {{ record[`task_${item.taskId}`] || '未填写' }}
            </td>
          </tr>
          <tr v-if="currentPageRecords.length === 0 && !isLoading">
            <td :colspan="currentAreaConfig.items.length + 3" class="no-data">没有找到匹配的记录</td>
          </tr>
          <tr v-if="isLoading && currentPageRecords.length === 0">
            <td :colspan="currentAreaConfig.items.length + 3" class="loading">加载中...</td>
          </tr>
          </tbody>
        </table>
        <div class="loading" v-else>
          {{ allAreaList.length === 0 ? '加载区域列表中...' : '请从上方选择巡检区域' }}
        </div>

        <!-- 加载中提示 -->
        <div class="loading" v-if="isLoading && currentPageRecords.length > 0">
          加载更多数据中...
        </div>

        <!-- 已加载全部数据提示 -->
        <div class="end-of-data" v-if="!isLoading && currentPage >= totalPages && currentPageRecords.length > 0">
          已加载全部数据
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
        @click="handleInspectionClick"
        :disabled="!currentAreaConfig.areaKey"
        :class="{ 'disabled-btn': !currentAreaConfig.areaKey }"
    >
      <span v-if="!currentAreaConfig.areaKey">请选择有效区域</span>
      <span v-else-if="!isLoggedIn">请先登录开始巡检</span>
      <span v-else>{{ getButtonText() }} (今日已{{ todayPatrolCount }}次)</span>
    </button>
  </div>
</template>

<script setup>
import { useRouter, useRoute } from 'vue-router'
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import request from '../utils/request'

// 路由与请求配置
const router = useRouter()
const route = useRoute()

// 分页配置
const pageSize = ref(10)
const currentPage = ref(1)
const totalItems = ref(0)

// 状态管理
const allAreaList = ref([])
const selectedAreaKey = ref('')
const currentAreaConfig = ref({
  areaName: '',
  areaKey: '',
  title: '',
  items: []
})
const records = ref([])
const filteredRecords = ref([]) // 新增：存储所有筛选后的记录
const selectedYear = ref('')
const selectedMonth = ref('')
const selectedUserType = ref('')
const isLoading = ref(false)

// 滚动容器引用
const contentWrapper = ref(null)
const content = ref(null)

// 获取当前登录用户信息
const currentUser = ref(JSON.parse(localStorage.getItem('currentUser') || '{}'))

// 计算是否已登录
const isLoggedIn = computed(() => {
  return currentUser.value && Object.keys(currentUser.value).length > 0
})

// 页面初始化
onMounted(() => {
  // 引入Font Awesome图标库
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
  document.head.appendChild(link)

  // 不再强制检查登录状态，允许未登录用户查看页面
  fetchAllAreasFromBackend()
      .then(() => {
        const routeAreaKey = route.params.area || selectedAreaKey.value
        if (routeAreaKey && allAreaList.value.length > 0) {
          selectedAreaKey.value = routeAreaKey
          handleAreaChange()
        }
      })
      .catch(error => {
        console.error('页面初始化失败:', error)
        alert('页面初始化失败，请刷新页面重试')
      })
})

// 组件卸载时移除滚动监听
onUnmounted(() => {
})

/**
 * 处理登录跳转
 */
const goToLogin = () => {
  // 获取当前区域key
  const currentAreaKey = currentAreaConfig.value.areaKey || route.params.area || ''

  // 根据是否有区域key跳转到对应的登录页面
  if (currentAreaKey) {
    router.push(`/login/${currentAreaKey}`)
  } else {
    router.push('/login')
  }
}

/**
 * 处理退出登录
 */
const handleLogout = () => {
  // 获取当前区域key
  const currentAreaKey = currentAreaConfig.value.areaKey || route.params.area || ''

  // 清除本地存储的用户信息
  localStorage.removeItem('currentUser')
  localStorage.removeItem('loginMethod')

  // 更新用户状态
  currentUser.value = {}

  // 刷新页面数据（保持当前视图）
  if (currentAreaKey) {
    // 重新加载当前区域的数据
    handleAreaChange()
  }
}

/**
 * 根据用户类型获取按钮文字
 */
const getButtonText = () => {
  if (!isLoggedIn.value) return '请先登录'

  const userType = currentUser.value.userType
  if (userType === '1') {
    return '开始工作'
  } else if (userType === '2' || userType === '3') {
    return '开始巡检'
  }
  return '开始操作'
}

/**
 * 根据用户类型值获取显示文本
 */
const getUserTypeText = (userType) => {
  const typeMap = {
    '1': '一线员工',
    '2': '项目管理员',
    '3': '合作方管理员'
  }
  return typeMap[userType] || '未知类型'
}

/**
 * 表头文本每10个字换一行的工具方法
 */
const formatHeaderText = (text) => {
  if (!text || typeof text !== 'string') return text
  const maxLength = 10
  let result = ''
  for (let i = 0; i < text.length; i += maxLength) {
    const segment = text.slice(i, i + maxLength)
    result += segment + (i + maxLength < text.length ? '<br>' : '')
  }
  return result
}

/**
 * 从后端获取所有区域列表
 */
const fetchAllAreasFromBackend = async () => {
  try {
    const response = await request.get('/areas')
    const areas = response.data || response
    if (Array.isArray(areas)) {
      allAreaList.value = areas.filter(area =>
          area.areaKey && area.areaName && area.title
      )
    } else {
      throw new Error('区域列表格式错误，预期数组')
    }
  } catch (error) {
    console.error('加载区域列表失败：', error)
    console.error('错误详情:', error.response?.data || error.message)
    // 使用模拟数据作为备选方案
    allAreaList.value = getMockAreas()
    console.log('使用模拟区域数据')
  }
}

/**
 * 模拟区域数据（当后端接口不可用时使用）
 */
const getMockAreas = () => {
  return [
    {
      areaKey: 'area1',
      areaName: '区域一',
      title: '巡检区域一'
    },
    {
      areaKey: 'area2',
      areaName: '区域二',
      title: '巡检区域二'
    }
  ]
}

/**
 * 区域切换处理
 */
const handleAreaChange = async () => {
  if (!selectedAreaKey.value) {
    currentAreaConfig.value = {
      areaName: '',
      areaKey: '',
      title: '',
      items: []
    }
    resetPagination()
    return
  }

  isLoading.value = true
  try {
    const areaInfo = allAreaList.value.find(area => area.areaKey === selectedAreaKey.value)
    if (!areaInfo) {
      throw new Error(`未找到区域${selectedAreaKey.value}的基础信息`)
    }

    // 尝试获取任务关联信息
    let taskManageList = []
    try {
      const taskManageResponse = await request.get('/task-manages/by-area', {
        params: { areaKey: selectedAreaKey.value }
      })
      taskManageList = taskManageResponse.data || taskManageResponse
      if (!Array.isArray(taskManageList)) {
        throw new Error('任务关联列表格式错误，预期数组')
      }
    } catch (error) {
      console.warn('获取任务关联信息失败，使用空列表:', error)
      taskManageList = []
    }

    const taskIds = [...new Set(taskManageList.map(item => item.taskId).filter(Boolean))]
    if (taskIds.length === 0) {
      currentAreaConfig.value = {
        ...areaInfo,
        items: []
      }
      resetPagination()
      return
    }

    // 尝试获取任务列表
    let taskList = []
    try {
      const tasksResponse = await request.post('/tasks/batch', { taskIds })
      taskList = tasksResponse.data || tasksResponse
      if (!Array.isArray(taskList)) {
        throw new Error('任务列表格式错误，预期数组')
      }
    } catch (error) {
      console.warn('获取任务列表失败，使用模拟任务:', error)
      // 使用模拟任务数据
      taskList = taskIds.map(taskId => ({
        taskId: taskId,
        taskName: `任务${taskId}`
      }))
    }

    const inspectionItems = taskList.map(task => ({
      taskId: task.taskId,
      label: task.taskName || `未命名任务(${task.taskId})`
    }))

    currentAreaConfig.value = {
      ...areaInfo,
      items: inspectionItems
    }

    // 加载当前区域的巡检数据
    await loadPatrolDataByArea()

  } catch (error) {
    console.error(`加载区域${selectedAreaKey.value}任务失败：`, error)
    alert(`区域任务加载失败：${error.message}`)
    currentAreaConfig.value = {
      areaName: '',
      areaKey: '',
      title: '',
      items: []
    }
  } finally {
    isLoading.value = false
  }
}

/**
 * 根据区域加载巡检数据（分页）
 */
const loadPatrolDataByArea = async () => {
  if (!currentAreaConfig.value.areaKey) return

  try {
    isLoading.value = true

    const areaKey = currentAreaConfig.value.areaKey
    console.log('开始加载区域数据，areaKey:', areaKey)

    // 使用现有的接口获取该区域的所有数据，然后在前端进行分页和筛选
    const response = await request.get('/patrol-data/by-app-key', {
      params: { appKey: areaKey }
    })

    console.log('完整API响应对象:', response)
    console.log('response 类型:', typeof response)
    console.log('response 键:', Object.keys(response))

    let allPatrolData = []

    // 处理不同的响应格式
    if (response) {
      // 情况1: response 本身就是数组
      if (Array.isArray(response)) {
        allPatrolData = response
        console.log('response 本身是数组，直接使用')
      }
      // 情况2: response.data 是数组
      else if (response.data && Array.isArray(response.data)) {
        allPatrolData = response.data
        console.log('response.data 是数组')
      }
      // 情况3: response 有 content 属性（分页响应）
      else if (response.content && Array.isArray(response.content)) {
        allPatrolData = response.content
        console.log('response.content 是数组')
      }
      // 情况4: response 有 records 属性
      else if (response.records && Array.isArray(response.records)) {
        allPatrolData = response.records
        console.log('response.records 是数组')
      }
      // 情况5: response 有 result 属性
      else if (response.result && Array.isArray(response.result)) {
        allPatrolData = response.result
        console.log('response.result 是数组')
      }
      // 情况6: response 有 list 属性
      else if (response.list && Array.isArray(response.list)) {
        allPatrolData = response.list
        console.log('response.list 是数组')
      }
      // 情况7: 尝试遍历 response 的所有属性寻找数组
      else {
        console.log('尝试在 response 中寻找数组数据...')
        for (const key in response) {
          if (Array.isArray(response[key])) {
            console.log(`在 response.${key} 中找到数组数据`)
            allPatrolData = response[key]
            break
          }
        }

        // 如果还是没找到，检查 response 本身是否是可迭代对象
        if (allPatrolData.length === 0 && response[Symbol.iterator]) {
          console.log('response 是可迭代对象，尝试转换为数组')
          allPatrolData = Array.from(response)
        }
      }
    }

    console.log('最终获取的巡检数据:', allPatrolData)
    console.log('数据数量:', allPatrolData.length)

    if (allPatrolData.length > 0) {
      // 转换数据格式
      const allRecords = transformPatrolDataToRecords(allPatrolData)
      console.log('转换后的记录:', allRecords)
      console.log('转换后记录数量:', allRecords.length)

      // 按时间从新到旧排序
      const sortedRecords = [...allRecords].sort((a, b) => {
        return new Date(b.time) - new Date(a.time);
      });
      console.log('按时间排序后的记录:', sortedRecords)

      // 应用筛选条件
      const filtered = applyFilters(sortedRecords)
      filteredRecords.value = filtered // 保存所有筛选后的记录
      console.log('筛选后的记录:', filtered)
      console.log('筛选后记录数量:', filtered.length)

      // 更新总记录数
      totalItems.value = filtered.length
      console.log('总记录数:', totalItems.value)

      // 计算当前页数据
      const startIndex = (currentPage.value - 1) * pageSize.value
      const endIndex = startIndex + pageSize.value
      records.value = filtered.slice(startIndex, endIndex)
      console.log('当前页记录:', records.value)
      console.log('当前页记录数量:', records.value.length)
    } else {
      console.log('没有获取到有效数据，response 内容:', JSON.stringify(response, null, 2))
      records.value = []
      filteredRecords.value = []
      totalItems.value = 0
    }
  } catch (error) {
    console.error('加载巡检数据失败:', error)
    console.error('错误详情:', error.response?.data || error.message)
    records.value = []
    filteredRecords.value = []
    totalItems.value = 0
  } finally {
    isLoading.value = false
  }
}

/**
 * 应用筛选条件
 */
const applyFilters = (records) => {
  if (!records || records.length === 0) {
    console.log('applyFilters: 没有记录需要筛选')
    return []
  }

  console.log('开始筛选，原始记录数量:', records.length)
  console.log('筛选条件 - 年份:', selectedYear.value, '月份:', selectedMonth.value, '用户类型:', selectedUserType.value)

  const filtered = records.filter(record => {
    if (!record.time) {
      console.log('记录缺少时间字段，跳过:', record)
      return false
    }

    try {
      const date = parseTimeString(record.time)
      const recordYear = date.getFullYear()
      const recordMonth = date.getMonth() + 1

      console.log(`记录时间: ${record.time}, 解析为: 年份${recordYear}, 月份${recordMonth}`)

      // 年份筛选
      if (selectedYear.value && recordYear !== Number(selectedYear.value)) {
        console.log(`年份不匹配，跳过: ${recordYear} != ${selectedYear.value}`)
        return false
      }
      // 月份筛选
      if (selectedMonth.value && recordMonth !== Number(selectedMonth.value)) {
        console.log(`月份不匹配，跳过: ${recordMonth} != ${selectedMonth.value}`)
        return false
      }
      // 用户类型筛选
      if (selectedUserType.value && record.userType !== selectedUserType.value) {
        console.log(`用户类型不匹配，跳过: ${record.userType} != ${selectedUserType.value}`)
        return false
      }

      console.log('记录通过所有筛选条件')
      return true
    } catch (error) {
      console.warn('解析筛选时间失败:', record.time, error)
      return false
    }
  })

  console.log('筛选完成，剩余记录数量:', filtered.length)
  return filtered
}

/**
 * 解析时间字符串
 */
const parseTimeString = (timeStr) => {
  if (!timeStr) return new Date()

  let normalizedTime = timeStr.toString().replace(/\//g, '-')

  if (normalizedTime.match(/^\d{4}-\d{1,2}-\d{1,2}$/)) {
    normalizedTime += ' 00:00'
  }

  const date = new Date(normalizedTime)

  if (isNaN(date.getTime())) {
    const parts = normalizedTime.split(' ')
    if (parts.length >= 2) {
      return new Date(parts[0] + ' 00:00')
    }
    return new Date()
  }

  return date
}

/**
 * 将 patrol_data 表的数据转换为前端需要的记录格式
 */
const transformPatrolDataToRecords = (patrolDataList) => {
  if (!Array.isArray(patrolDataList)) {
    console.warn('patrolDataList 不是数组:', patrolDataList)
    return []
  }

  console.log('开始转换数据，输入数据数量:', patrolDataList.length)

  const groupedRecords = {}

  patrolDataList.forEach((patrolData, index) => {
    console.log(`处理第${index + 1}条数据:`, patrolData)

    // 使用更灵活的方式获取字段
    const id = patrolData.id || patrolData.ID
    const sponsor = patrolData.name || patrolData.sponsor || patrolData.NAME
    const datetime = patrolData.datetime || patrolData.time || patrolData.DATETIME
    const area = patrolData.appKey || patrolData.area || patrolData.app_key || patrolData.AREA_KEY
    const taskId = patrolData.taskId || patrolData.task_id || patrolData.TASK_ID
    const status = patrolData.status || patrolData.STATUS
    const userType = patrolData.userType || patrolData.user_type || patrolData.USER_TYPE

    console.log(`解析字段 - id:${id}, sponsor:${sponsor}, datetime:${datetime}, area:${area}, taskId:${taskId}, status:${status}, userType:${userType}`)

    // 放宽验证条件，只检查必要字段
    if (!sponsor || !datetime || !area || !taskId || status === undefined || status === null) {
      console.warn('跳过无效巡检数据（缺少必要字段）：', patrolData)
      return
    }

    const groupKey = `${datetime}_${sponsor}_${area}_${userType || '1'}`
    console.log(`分组键: ${groupKey}`)

    if (!groupedRecords[groupKey]) {
      groupedRecords[groupKey] = {
        id: groupKey,
        time: datetime,
        sponsor: sponsor,
        area: area,
        userType: userType || '1'
      }
      console.log(`创建新分组:`, groupedRecords[groupKey])
    }

    // 处理状态值的各种可能格式
    let taskResult = '未知'
    if (status === '1' || status === 1 || status === true || status === 'true' || status === '是') {
      taskResult = '是'
    } else if (status === '0' || status === 0 || status === false || status === 'false' || status === '否') {
      taskResult = '否'
    }

    console.log(`任务${taskId}状态: ${taskResult} (原始状态: ${status})`)
    groupedRecords[groupKey][`task_${taskId}`] = taskResult
  })

  const result = Object.values(groupedRecords)
  console.log('最终转换结果数量:', result.length)
  console.log('最终转换结果:', result)
  return result
}

/**
 * 计算今日巡检次数 - 修改为基于所有筛选后的记录计算
 */
const todayPatrolCount = computed(() => {
  if (!currentAreaConfig.value.areaKey) return 0

  const today = new Date().toDateString()

  return filteredRecords.value.filter(record => {
    if (!record.time) return false

    try {
      const recordDate = new Date(record.time).toDateString()
      return recordDate === today &&
          record.area === currentAreaConfig.value.areaKey
    } catch (error) {
      console.warn('解析时间失败:', record.time, error)
      return false
    }
  }).length
})

/**
 * 巡检状态文本
 */
const getPatrolStatusText = computed(() => {
  if (todayPatrolCount.value > 0) return `进行中（${todayPatrolCount.value}次）`
  else return `未开始（0次）`
})

/**
 * 巡检状态样式
 */
const getPatrolStatusClass = computed(() => {
  if (todayPatrolCount.value > 0) return 'status-in-progress'
  else return 'status-not-started'
})

/**
 * 可选年份
 */
const availableYears = computed(() => {
  const years = new Set()
  const currentYear = new Date().getFullYear()
  for (let year = currentYear - 5; year <= currentYear + 1; year++) {
    years.add(year)
  }
  return Array.from(years).sort((a, b) => b - a)
})

/**
 * 当前页显示的数据
 */
const currentPageRecords = computed(() => {
  return records.value
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
  loadPatrolDataByArea()
}

/**
 * 重置筛选条件
 */
const resetSearch = () => {
  selectedYear.value = ''
  selectedMonth.value = ''
  selectedUserType.value = ''
  currentPage.value = 1
  loadPatrolDataByArea()
}

/**
 * 重置分页状态
 */
const resetPagination = () => {
  currentPage.value = 1
  totalItems.value = 0
  records.value = []
  filteredRecords.value = []
}

/**
 * 改变页码
 */
const changePage = (newPage) => {
  if (newPage < 1 || newPage > totalPages.value) return
  currentPage.value = newPage
  loadPatrolDataByArea()
}

/**
 * 处理巡检按钮点击
 */
const handleInspectionClick = () => {
  if (!currentAreaConfig.value.areaKey) {
    alert('请先选择巡检区域')
    return
  }

  if (!isLoggedIn.value) {
    // 未登录时提示登录
    if (confirm('需要登录才能开始巡检，是否立即登录？')) {
      goToLogin()
    }
    return
  }

  // 已登录时跳转到巡检表单
  router.push(`/inspection-form/${currentAreaConfig.value.areaKey}`)
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

/* 退出登录按钮样式 - 新增部分 */
.logout-container {
  position: fixed;
  top: 10px;
  right: 20px;
  z-index: 1000;
}

.logout-btn, .login-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.3s ease;
}

.logout-btn {
  background-color: #f44336;
  color: white;
}

.logout-btn:hover {
  background-color: #d32f2f;
  transform: translateY(-2px);
  box-shadow: 0 2px 8px rgba(244, 67, 54, 0.3);
}

.login-btn {
  background-color: #42b983;
  color: white;
}

.login-btn:hover {
  background-color: #359e6e;
  transform: translateY(-2px);
  box-shadow: 0 2px 8px rgba(66, 185, 131, 0.3);
}

.logout-btn i, .login-btn i {
  font-size: 16px;
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
  height: 100px;
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

.location-title {
  margin: 0;
  font-size: 18px;
  color: #42b983;
  font-weight: 600;
  background-color: #f0f9f4;
  padding: 4px 12px;
  border-radius: 20px;
  border: 1px solid #42b983;
}

.search-container {
  position: sticky;
  top: 100px;
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
  flex-wrap: wrap;
}

.patrol-status {
  display: flex;
  gap: 20px;
  align-items: center;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-label {
  font-size: 14px;
  color: #666;
}

.status-value {
  font-size: 16px;
  font-weight: 600;
  color: #42b983;
}

.status-badge {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 500;
}

.status-in-progress {
  background-color: #fef3c7;
  color: #d97706;
}

.status-not-started {
  background-color: #fecdd3;
  color: #dc2626;
}

.status-not-logged {
  background-color: #e5e7eb;
  color: #4b5563;
}

.form-group {
  margin-top: 5px;
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

.hide-area-select {
  display: none !important;
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
  max-height: calc(100vh - 280px);
}

.content {
  width: 100%;
  overflow-x: auto;
}

.patrol-table {
  width: 100%;
  min-width: 1600px;
  border-collapse: collapse;
  margin-top: 0;
}

.patrol-table th,
.patrol-table td {
  border: 1px solid #999;
  padding: 8px 5px;
  text-align: center;
  font-size: 14px;
}

.patrol-table th {
  font-weight: bold;
  white-space: nowrap;
  position: sticky;
  top: 0;
  z-index: 10;
  background-color: #f9f9f9;
  padding: 12px 5px;
}

.patrol-table tr:hover {
  background-color: #f1f1f1;
}

.sponsor-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.no-data, .loading, .end-of-data {
  color: #666;
  padding: 30px;
  text-align: center;
}

.loading {
  color: #42b983;
}

.end-of-data {
  color: #999;
  font-style: italic;
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
  margin-bottom: 80px; /* 增加底部边距，避免被固定按钮遮挡 */
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
  background-color: #42b983;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  z-index: 90;
  transition: all 0.3s ease;
}

.inspection-btn:hover:not(.disabled-btn) {
  background-color: #359e6e;
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

@media (max-width: 768px) {
  .logout-container {
    top: 5px;
    right: 10px;
  }

  .logout-btn, .login-btn {
    padding: 6px 12px;
    font-size: 12px;
  }

  .search-container {
    flex-direction: column;
    align-items: stretch;
    padding: 15px;
  }

  .patrol-status {
    margin-top: 10px;
    justify-content: space-between;
  }

  .content-wrapper {
    max-height: calc(100vh - 360px);
  }

  .pagination {
    gap: 4px;
    margin-bottom: 70px; /* 移动端适当减少底部边距 */
  }

  .pagination-info {
    margin-left: 0;
    margin-top: 8px;
    width: 100%;
    text-align: center;
  }
}
</style>