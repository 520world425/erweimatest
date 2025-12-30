import axios from 'axios'

// 根据环境设置baseURL
const getBaseURL = () => {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return 'http://localhost:8080/api'//http://localhost:8080/api
    } else {
        // 生产环境使用相对路径或完整域名
        return '/api' // 或者 'http://qrcode.gongdewuye.com/api'
    }
}

const request = axios.create({
    baseURL: getBaseURL(),
    timeout: 10000, // 增加超时时间
    headers: {
        'Content-Type': 'application/json;charset=UTF-8'
    }
})

// 请求拦截器
request.interceptors.request.use(
    config => {
        console.log(`发起请求: ${config.method?.toUpperCase()} ${config.url}`)
        // 添加token等认证信息
        const token = localStorage.getItem('token')
        if (token) {
            config.headers.Authorization = `Bearer ${token}`
        }
        return config
    },
    error => {
        console.error('请求配置错误:', error)
        return Promise.reject(error)
    }
)

// 响应拦截器
request.interceptors.response.use(
    response => {
        console.log(`请求成功: ${response.config.url}`, response.data)
        return response.data
    },
    error => {
        console.error('请求失败:', error)

        let errorMsg = '网络错误，请检查网络连接'

        if (error.response) {
            // 服务器返回错误状态码
            errorMsg = error.response.data?.message ||
                error.response.data?.error ||
                `服务器错误: ${error.response.status}`
        } else if (error.request) {
            // 请求发出但没有收到响应
            errorMsg = '无法连接到服务器，请检查网络连接'
        } else {
            // 其他错误
            errorMsg = error.message || '请求失败，请稍后重试'
        }

        // 只在非静默请求时显示错误
        if (!error.config?.silent) {
            alert(`操作失败：${errorMsg}`)
        }

        return Promise.reject(error)
    }
)

export default request