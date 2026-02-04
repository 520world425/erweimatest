<template>
  <div class="login-container">
    <div class="login-logo">
      <i class="fas fa-tools"></i>
      <h2>报修系统</h2>
      <div class="area-info" v-if="currentRepairArea.areaName">
        <span class="area-badge">{{ currentRepairArea.areaName }}</span>
      </div>
    </div>

    <!-- 登录方式切换 -->
    <div class="login-tabs">
      <button
          :class="['tab-btn', activeTab === 'wechat' ? 'active' : '']"
          @click="activeTab = 'wechat'"
      >
        微信登录
      </button>
      <button
          :class="['tab-btn', activeTab === 'phone' ? 'active' : '']"
          @click="activeTab = 'phone'"
      >
        手机号登录
      </button>
    </div>

    <!-- 微信登录 -->
    <div v-if="activeTab === 'wechat'" class="login-content">
      <button @click="handleWechatLogin" class="wechat-btn">
        <i class="fab fa-weixin mr-2"></i>
        {{ currentRepairArea.areaName ? `登录到${currentRepairArea.areaName}` : '微信登录' }}
      </button>
    </div>

    <!-- 手机号登录 -->
    <div v-if="activeTab === 'phone'" class="login-content">
      <div class="phone-form">
        <div class="form-group">
          <label for="phone">手机号</label>
          <input
              id="phone"
              v-model="phoneNumber"
              type="tel"
              placeholder="请输入手机号"
              maxlength="11"
              class="phone-input"
              @keyup.enter="handlePhoneLogin"
          />
        </div>
        <button
            @click="handlePhoneLogin"
            class="phone-btn"
            :disabled="!phoneNumber || phoneNumber.length !== 11"
        >
          <i class="fas fa-mobile-alt mr-2"></i>
          手机号登录
        </button>
      </div>
    </div>

    <!-- 登录状态提示 -->
    <div class="login-status" v-if="loginStatus">
      {{ loginStatus }}
    </div>

    <!-- 区域加载状态 -->
    <div class="loading-status" v-if="loadingRepairArea">
      正在验证报修区域信息...
    </div>

    <!-- 区域无效提示 -->
    <div class="error-status" v-if="areaError">
      {{ areaError }}
      <div class="available-areas" v-if="availableRepairAreas.length > 0">
        <p>可用报修区域：</p>
        <div class="area-links">
          <router-link v-for="area in availableRepairAreas"
                       :key="area.areaKey"
                       :to="`/login/${area.areaKey}`"
                       class="area-link">
            {{ area.areaName }}
          </router-link>
        </div>
      </div>
    </div>

    <!-- 调试信息（开发环境显示） -->
    <div class="debug-info" v-if="isDevelopment">
      <p>当前报修区域参数: {{ currentAreaKey }}</p>
      <p>完整路径: {{ currentPath }}</p>
      <p>重定向路径: {{ redirectPath }}</p>
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
const loginStatus = ref('')
const currentRepairArea = ref({})
const loadingRepairArea = ref(false)
const areaError = ref('')
const availableRepairAreas = ref([])
const activeTab = ref('wechat')
const phoneNumber = ref('')

// 计算属性
const currentAreaKey = computed(() => {
  return route.params.area || getAreaKeyFromPath()
})

const currentPath = computed(() => {
  return window.location.pathname
})

const redirectPath = computed(() => {
  return route.query.redirect || `/patrol1/${currentAreaKey.value}`
})

const isDevelopment = computed(() => {
  return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
})

/**
 * 从路径中提取报修区域key
 */
const getAreaKeyFromPath = () => {
  const path = window.location.pathname
  const segments = path.split('/').filter(segment => segment.trim() !== '')

  console.log('路径分段:', segments)

  // 查找login后面的参数
  const loginIndex = segments.indexOf('login')
  if (loginIndex !== -1 && loginIndex + 1 < segments.length) {
    const areaKey = segments[loginIndex + 1]
    console.log('从路径提取的报修区域key:', areaKey)
    return areaKey
  }

  return null
}

// 页面加载时获取报修区域信息
onMounted(() => {
  console.log('页面加载，路由参数:', route.params)
  console.log('完整路径:', window.location.pathname)

  const areaKey = currentAreaKey.value
  console.log('最终使用的报修区域key:', areaKey)

  if (areaKey) {
    validateRepairArea(areaKey)
  } else {
    // 如果没有区域参数，获取所有可用报修区域显示给用户
    fetchAvailableRepairAreas()
  }
})

// 监听路由参数变化
watch(() => route.params.area, (newAreaKey) => {
  console.log('路由参数变化:', newAreaKey)
  if (newAreaKey) {
    validateRepairArea(newAreaKey)
  } else {
    currentRepairArea.value = {}
    areaError.value = ''
    fetchAvailableRepairAreas()
  }
})

/**
 * 验证报修区域是否有效
 */
const validateRepairArea = async (areaKey) => {
  console.log('开始验证报修区域:', areaKey)
  loadingRepairArea.value = true
  areaError.value = ''

  try {
    // 调用报修区域接口
    const response = await request.get(`/repair-areas/areaKey/${areaKey}`)
    const repairAreaData = response

    if (repairAreaData && repairAreaData.areaKey) {
      currentRepairArea.value = {
        areaKey: repairAreaData.areaKey,
        areaName: repairAreaData.areaName,
        projectId: repairAreaData.projectId
      }
      console.log('报修区域验证成功:', currentRepairArea.value)
    } else {
      throw new Error('报修区域数据格式错误')
    }
  } catch (error) {
    console.error('报修区域验证失败：', error)
    areaError.value = `报修区域"${areaKey}"不存在或无法访问`
    currentRepairArea.value = {}
    // 同时获取可用报修区域显示给用户
    fetchAvailableRepairAreas()
  } finally {
    loadingRepairArea.value = false
  }
}

/**
 * 获取所有可用报修区域
 */
const fetchAvailableRepairAreas = async () => {
  try {
    const response = await request.get('/repair-areas')
    const areas = response
    if (Array.isArray(areas)) {
      availableRepairAreas.value = areas.filter(area =>
          area.areaKey && area.areaName
      )
      console.log('可用报修区域列表:', availableRepairAreas.value)
    }
  } catch (error) {
    console.error('获取报修区域列表失败：', error)
  }
}

// 检查用户是否已登录
const checkUserLoggedIn = () => {
  const user = localStorage.getItem('currentUser')
  return user ? JSON.parse(user) : null
}

// 微信登录逻辑
const handleWechatLogin = async () => {
  // 如果没有有效的报修区域信息，提示用户
  if (!currentRepairArea.value.areaKey) {
    loginStatus.value = '请通过有效的报修区域链接访问'
    setTimeout(() => {
      loginStatus.value = ''
    }, 2000)
    return
  }

  // 显示登录中状态
  loginStatus.value = `正在登录到${currentRepairArea.value.areaName}...`

  try {
    // 模拟微信登录后获取用户信息
    const wechatResponse = await request.get('/wechat/login')
    const worker = wechatResponse.data || wechatResponse

    // 存储用户信息到本地
    localStorage.setItem('currentUser', JSON.stringify(worker))
    localStorage.setItem('loginMethod', 'wechat')

    loginStatus.value = `登录成功，正在跳转...`

    // 跳转到重定向路径或默认巡检页面
    setTimeout(() => {
      if (redirectPath.value) {
        router.push(redirectPath.value)
      } else {
        router.push(`/patrol1/${currentRepairArea.value.areaKey}`)
      }
    }, 1500)
  } catch (error) {
    console.error('微信登录失败：', error)
    loginStatus.value = '微信授权失败，请重试'
    setTimeout(() => {
      loginStatus.value = ''
    }, 3000)
  }
}

// 手机号登录逻辑
const handlePhoneLogin = async () => {
  // 验证手机号格式
  if (!phoneNumber.value || phoneNumber.value.length !== 11) {
    loginStatus.value = '请输入11位有效手机号'
    setTimeout(() => {
      loginStatus.value = ''
    }, 2000)
    return
  }

  // 如果没有有效的报修区域信息，提示用户
  if (!currentRepairArea.value.areaKey) {
    loginStatus.value = '请通过有效的报修区域链接访问'
    setTimeout(() => {
      loginStatus.value = ''
    }, 2000)
    return
  }

  // 显示登录中状态
  loginStatus.value = '正在验证手机号...'

  try {
    let user = null;

    // 先查询工作人员表
    try {
      const workerResponse = await request.post('/workers/login-by-phone', {
        phone: phoneNumber.value,
        projectId: currentRepairArea.value.projectId || 1001
      });

      if (workerResponse && workerResponse.found === true) {
        user = workerResponse.data;
        user.userType = user.userType;
        user.userSource = 'worker';
      } else {
        console.log('工作人员表中未找到该手机号，继续查询管理人员表');
      }
    } catch (workerError) {
      console.log('工作人员表查询异常，尝试查询管理人员表');
    }

    // 如果工作人员表未找到，查询管理人员表
    if (!user) {
      try {
        const managerResponse = await request.get(`/managers/phone/${phoneNumber.value}`);
        if (managerResponse && (managerResponse.id || managerResponse.managerId)) {
          user = managerResponse;
          user.userType = user.userType;
          user.userSource = 'manager';
        }
      } catch (managerError) {
        console.log('管理人员表中也未找到该手机号');
      }
    }

    // 验证用户是否存在
    if (user) {
      loginStatus.value = `登录成功，欢迎 ${user.workerName || user.managerName || '用户'}！`;

      // 存储用户信息到本地
      localStorage.setItem('currentUser', JSON.stringify(user));
      localStorage.setItem('loginMethod', 'phone');

      // 跳转到重定向路径或默认巡检页面
      setTimeout(() => {
        if (redirectPath.value) {
          router.push(redirectPath.value)
        } else {
          router.push(`/patrol1/${currentRepairArea.value.areaKey}`);
        }
      }, 1500);
    } else {
      loginStatus.value = '手机号未注册或没有权限';
      setTimeout(() => {
        loginStatus.value = '';
      }, 3000);
    }
  } catch (error) {
    console.error('手机号登录失败：', error);
    loginStatus.value = error.response?.data?.message || '登录失败，请重试';
    setTimeout(() => {
      loginStatus.value = '';
    }, 3000);
  }
}
</script>

<style scoped>
/* 引入Font Awesome图标库 */
@import url('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css');

.login-container {
  width: 350px;
  margin: 80px auto;
  padding: 30px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  text-align: center;
  background-color: white;
}

.login-logo {
  margin-bottom: 25px;
}

.login-logo i {
  font-size: 50px;
  color: #3b82f6;
  margin-bottom: 15px;
}

.login-logo h2 {
  margin: 0 0 15px 0;
  color: #1f2937;
  font-size: 1.5rem;
  font-weight: 600;
}

.area-info {
  margin-top: 10px;
}

.area-badge {
  display: inline-block;
  padding: 6px 12px;
  background-color: #eff6ff;
  color: #3b82f6;
  border: 1px solid #3b82f6;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
}

/* 登录方式切换 */
.login-tabs {
  display: flex;
  margin-bottom: 20px;
  border-radius: 6px;
  background-color: #f8f9fa;
  padding: 4px;
}

.tab-btn {
  flex: 1;
  padding: 8px 12px;
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: 4px;
  font-size: 0.9rem;
  font-weight: 500;
  transition: all 0.2s ease;
}

.tab-btn.active {
  background-color: white;
  color: #3b82f6;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.login-content {
  margin-bottom: 20px;
}

.wechat-btn {
  width: 100%;
  padding: 12px;
  background-color: #42b983;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.wechat-btn:hover {
  background-color: #359e6e;
  transform: translateY(-2px);
  box-shadow: 0 4px 6px -1px rgba(66, 185, 131, 0.3);
}

.phone-form {
  width: 100%;
}

.form-group {
  margin-bottom: 15px;
  text-align: left;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  color: #4b5563;
  font-size: 0.9rem;
  font-weight: 500;
}

.phone-input {
  width: 95%;
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 1rem;
  transition: border-color 0.2s ease;
}

.phone-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
}

.phone-btn {
  width: 100%;
  padding: 12px;
  background-color: #3b82f6;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.phone-btn:hover:not(:disabled) {
  background-color: #2563eb;
  transform: translateY(-2px);
  box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.3);
}

.phone-btn:disabled {
  background-color: #94a3b8;
  cursor: not-allowed;
}

/* 状态提示样式 */
.login-status {
  margin-top: 15px;
  padding: 10px;
  border-radius: 6px;
  color: #059669;
  background-color: #ecfdf5;
  border: 1px solid #d1fae5;
  font-size: 0.9rem;
}

.loading-status {
  margin-top: 15px;
  padding: 10px;
  color: #6b7280;
  font-size: 0.9rem;
}

.error-status {
  margin-top: 20px;
  padding: 15px;
  border-radius: 6px;
  color: #dc2626;
  font-size: 0.9rem;
  background-color: #fef2f2;
  border: 1px solid #fecaca;
}

.available-areas {
  margin-top: 10px;
  text-align: left;
}

.available-areas p {
  margin: 0 0 8px 0;
  color: #374151;
  font-weight: 500;
}

.area-links {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.area-link {
  color: #3b82f6;
  text-decoration: none;
  padding: 4px 8px;
  border-radius: 4px;
  transition: background-color 0.2s ease;
}

.area-link:hover {
  background-color: #eff6ff;
  text-decoration: underline;
}

/* 调试信息 */
.debug-info {
  margin-top: 20px;
  padding: 10px;
  background-color: #f3f4f6;
  border-radius: 4px;
  font-size: 12px;
  text-align: left;
  color: #6b7280;
}

.debug-info p {
  margin: 2px 0;
}

/* 响应式设计 */
@media (max-width: 480px) {
  .login-container {
    width: 90%;
    margin: 40px auto;
    padding: 20px;
  }

  .login-logo i {
    font-size: 40px;
  }

  .login-logo h2 {
    font-size: 1.3rem;
  }
}
</style>