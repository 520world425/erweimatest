<template>
  <div class="form-container">
    <div class="header">
      <img src="../assets/logo.png" alt="logo" class="logo" />
      <h1>{{ currentAreaConfig.areaName }}巡检信息填写</h1>
    </div>
    <!-- 区域配置加载完成后显示表单 -->
    <div class="form-content" v-if="currentAreaConfig.items && currentAreaConfig.items.length">
      <!-- 巡检人姓名（可编辑，默认显示登录人姓名） -->
      <div class="form-item">
        <p>巡检人姓名 <span class="required">*</span></p>
        <!-- 改为可编辑的输入框显示姓名，移除隐藏input（直接通过v-model绑定） -->
        <input
            type="text"
            v-model="sponsor"
            class="name-input"
            placeholder="请输入巡检人姓名"
            @blur="validateSponsor"
        />
        <!-- 姓名为空时显示错误提示 -->
        <p class="error-text" v-if="showSponsorError">请填写巡检人姓名</p>
      </div>
      <!-- 巡检项（根据当前区域动态生成） -->
      <div class="form-item" v-for="(item, index) in currentAreaConfig.items" :key="index">
        <p>{{ item.label }} <span class="required">*</span></p>
        <div class="options">
          <label class="option">
            <input type="radio" v-model="formData[`task_${item.taskId}`]" value="是" /> 是
          </label>
          <label class="option">
            <input type="radio" v-model="formData[`task_${item.taskId}`]" value="否" /> 否
          </label>
        </div>
      </div>
      <!-- 提交按钮（姓名为空时禁用） -->
      <button class="submit-btn" @click="submitForm" :disabled="!String(sponsor).trim()">
        提交巡检结果
      </button>
    </div>
    <!-- 区域配置加载中 -->
    <div class="loading" v-else>加载区域配置中...</div>
  </div>
</template>
<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import request from '../utils/request'

// 路由配置
const router = useRouter()
const route = useRoute()

// 状态管理
const currentAreaConfig = ref({
  areaName: '',
  areaKey: '',
  projectId: null, // 新增：存储区域的project_id
  items: []
})
const sponsor = ref('') // 初始化为空字符串
const formData = ref({})
const isSubmitting = ref(false)
const showSponsorError = ref(false) // 新增：姓名为空的错误提示状态

// 获取当前登录用户信息（从本地存储读取）
const currentWorker = ref(JSON.parse(localStorage.getItem('currentUser') || '{}'))

// 页面加载时：获取登录人姓名 + 加载区域配置
onMounted(() => {
  // 1. 从登录信息中提取姓名，兼容manager和worker两种格式，增加类型兜底
  const userInfo = currentWorker.value || {} // 避免userInfo为undefined
  // 优先使用workerName，如果没有则使用managerName，最终兜底为空字符串
  sponsor.value = String(userInfo.workerName || userInfo.managerName || '')

  // 2. 无登录信息时，提示并跳转到对应区域的登录页
  if (!String(sponsor.value).trim()) {
    alert('请先登录后再填写巡检信息')
    router.push(`/login/${route.params.area || 'zhulou'}`)
    return
  }

  // 3. 加载区域配置（原有逻辑保留）
  const areaKey = route.params.area || 'zhulou'
  fetchAreaConfig(areaKey)
      .then(() => initFormData())
})

/**
 * 新增：姓名输入框失焦验证（为空时显示错误提示），增加类型处理
 */
const validateSponsor = () => {
  // 将sponsor转为字符串后再判断是否为空
  showSponsorError.value = !String(sponsor.value).trim()
}

/**
 * 从后端获取当前区域配置（修改：获取区域的project_id）
 */
const fetchAreaConfig = async (areaKey) => {
  try {
    // 获取区域基础信息
    const areaData = await request.get(`/areas/areaKey/${areaKey}`)

    // 按areaKey获取关联的taskManage记录
    const taskManageResponse = await request.get('/task-manages/by-area', {
      params: { areaKey: areaKey }
    })
    const taskManageList = taskManageResponse.data || taskManageResponse
    if (!Array.isArray(taskManageList)) {
      throw new Error('任务关联列表格式错误')
    }

    // 提取taskId列表（去重）
    const taskIds = [...new Set(taskManageList.map(item => item.taskId).filter(Boolean))]
    if (taskIds.length === 0) {
      currentAreaConfig.value = {
        ...areaData,
        items: []
      }
      return
    }

    // 批量获取任务详情
    const tasksResponse = await request.post('/tasks/batch', { taskIds })
    const taskList = tasksResponse.data || tasksResponse
    if (!Array.isArray(taskList)) {
      throw new Error('任务列表格式错误')
    }

    // 构造巡检项配置
    const inspectionItems = taskList.map(task => ({
      taskId: task.taskId,
      label: task.taskName || `未命名任务(${task.taskId})`
    }))

    // 更新区域配置（包含区域的project_id）
    currentAreaConfig.value = {
      ...areaData,
      items: inspectionItems
    }
  } catch (error) {
    console.error(`加载${areaKey}区域配置失败：`, error)
    // 降级处理：使用预设配置
    currentAreaConfig.value = {
      areaName: getDefaultAreaName(areaKey),
      areaKey: areaKey,
      projectId: getDefaultProjectId(areaKey), // 降级时使用默认project_id
      items: getPresetInspectionItems(areaKey)
    }
  }
}

/**
 * 巡检项预设（后端接口异常时使用，原有逻辑不变）
 */
const getPresetInspectionItems = (areaKey) => {
  const itemMap = {
    zhulou: [
      { taskId: 1, label: '是否携带危险物品' },
      { taskId: 2, label: '是否有盗窃现象' },
      { taskId: 3, label: '是否有可疑人员' }
    ],
    jizhenlou: [
      { taskId: 4, label: '着装规范检查' },
      { taskId: 5, label: '路面状况检查' },
      { taskId: 6, label: '电梯运行检查' }
    ],
    zhuyuanbu: [
      { taskId: 7, label: '病房环境整洁度' },
      { taskId: 8, label: '陪护人员管理规范' }
    ],
    menzhenlou: [
      { taskId: 9, label: '排队秩序检查' },
      { taskId: 10, label: '自助设备运行检查' }
    ]
  }
  return itemMap[areaKey] || []
}

/**
 * 默认区域名称（降级处理用，原有逻辑不变）
 */
const getDefaultAreaName = (areaKey) => {
  const nameMap = {
    zhulou: '主楼',
    jizhenlou: '急诊楼',
    zhuyuanbu: '住院部',
    menzhenlou: '门诊楼'
  }
  return nameMap[areaKey] || '未知区域'
}

/**
 * 默认项目ID（降级处理用）
 */
const getDefaultProjectId = (areaKey) => {
  const projectIdMap = {
    zhulou: 1001,
    jizhenlou: 1002,
    zhuyuanbu: 1003,
    menzhenlou: 1004
  }
  return projectIdMap[areaKey] || 1001
}

/**
 * 初始化表单数据（去掉默认值，不预先选择"是"或"否"）
 */
const initFormData = () => {
  const defaultData = {}
  currentAreaConfig.value.items.forEach(item => {
    // 不设置默认值，保持未选择状态
    defaultData[`task_${item.taskId}`] = ''
  })
  formData.value = defaultData
}

/**
 * 格式化时间为 xx-xx-xx xx:xx 形式（原有逻辑不变）
 */
const formatDateTime = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day} ${hours}:${minutes}`
}

/**
 * 提交巡检结果到 patrol_data 表（核心修改：增加sponsor类型处理）
 */
const submitForm = async () => {
  if (isSubmitting.value) return

  // 1. 核心修改：将sponsor强制转为字符串，避免trim()类型错误
  const sponsorStr = String(sponsor.value)

  // 2. 验证姓名是否为空（使用处理后的字符串）
  if (!sponsorStr.trim()) {
    showSponsorError.value = true
    // 聚焦到姓名输入框（增加存在性判断，避免DOM查询失败）
    const nameInput = document.querySelector('.name-input')
    if (nameInput) nameInput.focus()
    return
  }

  // 3. 基础验证：所有巡检项已选择（保留原有逻辑）
  const unselectedItems = currentAreaConfig.value.items.filter(
      item => !formData.value[`task_${item.taskId}`]
  )
  if (unselectedItems.length > 0) {
    const itemLabels = unselectedItems.map(item => item.label).join('\n')
    alert(`请完成以下项目的填写：\n${itemLabels}`)
    return
  }

  // 4. 验证区域project_id是否存在
  if (!currentAreaConfig.value.projectId) {
    alert('区域项目信息不完整，无法提交')
    return
  }

  // 5. 验证登录人user_type是否存在（兼容manager和worker格式）
  const userInfo = currentWorker.value || {} // 增加兜底，避免undefined
  let userType = userInfo.userType

  // 如果userType不存在，根据用户来源设置默认值
  if (!userType) {
    if (userInfo.managerId) {
      userType = userInfo.userType || 'manager' // manager用户
    } else if (userInfo.id) {
      userType = userInfo.userType || '1' // worker用户，默认类型为"1"
    }
  }

  if (!userType) {
    alert('用户类型信息不完整，无法提交')
    return
  }

  isSubmitting.value = true

  try {
    const currentTime = new Date()
    const formattedTime = formatDateTime(currentTime)
    const appKey = currentAreaConfig.value.areaKey

    // 6. 为每个巡检任务创建一条记录（使用处理后的sponsor字符串）
    const patrolDataPromises = currentAreaConfig.value.items.map(async (item) => {
      const taskResult = formData.value[`task_${item.taskId}`]
      const status = taskResult === '是' ? '1' : '0' // 是为1，否为0

      const patrolData = {
        name: sponsorStr.trim(), // 核心修改：使用处理后的字符串
        datetime: formattedTime, // 格式化时间
        appKey: appKey, // 区域标识
        taskId: item.taskId, // 任务ID
        status: status, // 状态：1-是，0-否
        projectId: currentAreaConfig.value.projectId, // 使用区域的project_id
        userType: userType // 使用登录人的user_type
      }

      console.log('提交巡检数据:', patrolData) // 调试信息
      // 提交到后端 patrol-data 接口
      return request.post('/patrol-data', patrolData)
    })

    // 7. 并行提交所有巡检任务数据（原有逻辑不变）
    await Promise.all(patrolDataPromises)

    // 8. 本地存储备份（使用处理后的sponsor字符串）
    const newRecord = {
      id: Date.now(),
      area: appKey,
      time: currentTime.toLocaleString(),
      sponsor: sponsorStr.trim(), // 核心修改：使用处理后的字符串
      ...formData.value
    }

    const existingRecords = JSON.parse(localStorage.getItem('patrolRecords') || '[]')
    existingRecords.push(newRecord)
    localStorage.setItem('patrolRecords', JSON.stringify(existingRecords))

    // 9. 提交成功（原有逻辑不变）
    alert('巡检结果提交成功！')

    // 10. 返回对应区域的巡检列表页（原有逻辑不变）
    router.push(`/patrol/${appKey}`)

  } catch (error) {
    console.error('提交巡检结果失败：', error)
    const errorMessage = error.response?.data?.message || error.response?.data || '提交失败，请重试！'
    alert(`提交失败：${errorMessage}`)
  } finally {
    isSubmitting.value = false
  }
}
</script>
<style scoped>
/* 保留原有姓名输入框样式（无需新增） */
.name-input {
  width: 95%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
  margin-top: 8px;
}

/* 新增：姓名错误提示样式 */
.error-text {
  margin: 6px 0 0 0;
  color: #ef4444;
  font-size: 14px;
}

/* 原有样式保留，无修改 */
.form-container {
  min-height: 100vh;
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
  padding: 10px 20px;
  border-bottom: 1px solid #eee;
  position: relative;
}

.logo {
  width: 70px;
  height: 60px;
  position: absolute;
  left: 20px;
  top: 50%;
  transform: translateY(-50%);
}

h1 {
  margin: 0;
  font-size: 20px;
}

.form-content {
  padding: 20px;
  max-width: 600px;
  margin: 0 auto;
}

.form-item {
  margin-bottom: 30px;
  padding: 15px;
  border: 1px solid #eee;
  border-radius: 8px;
}

.form-item p {
  margin: 0 0 15px 0;
  font-size: 16px;
  color: #333;
}

/* 必填项红色标记 */
.required {
  color: #ef4444;
}

.options {
  display: flex;
  gap: 20px;
}

.option {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 16px;
}

input[type="radio"] {
  width: 18px;
  height: 18px;
}

.submit-btn {
  width: 100%;
  padding: 12px;
  font-size: 18px;
  background-color: #42b983;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  margin-top: 20px;
  transition: background-color 0.3s ease;
}

.submit-btn:hover:not(:disabled) {
  background-color: #359e6e;
}

.submit-btn:disabled {
  background-color: #94a3b8;
  cursor: not-allowed;
}

.loading {
  text-align: center;
  padding: 50px;
  color: #42b983;
  font-size: 16px;
}
</style>