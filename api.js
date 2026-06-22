// ========== 前端 API 客户端 v2.0 ==========
// JWT认证 + RESTful API，与后端 server.js 通信

const API = {
    _token: null,
    _saveTimer: null,

    // ===== 认证管理 =====
    setToken(token) {
        this._token = token;
        if (token) sessionStorage.setItem('sm_token', token);
        else sessionStorage.removeItem('sm_token');
    },

    getToken() {
        if (!this._token) {
            this._token = sessionStorage.getItem('sm_token') || null;
        }
        return this._token;
    },

    _headers() {
        const h = { 'Content-Type': 'application/json' };
        const token = this.getToken();
        if (token) h['Authorization'] = 'Bearer ' + token;
        return h;
    },

    async _fetch(url, options = {}) {
        const res = await fetch(url, { ...options, headers: { ...this._headers(), ...(options.headers || {}) } });
        if (res.status === 401) {
            this.setToken(null);
            // 触发重新登录
            if (typeof handleLogout === 'function') handleLogout();
            throw new Error('登录已过期，请重新登录');
        }
        return res;
    },

    // ===== 认证 API =====
    async login(role, credentials) {
        const body = { role, password: credentials.password };
        if (role === 'admin') body.username = credentials.username;
        else body.phone = credentials.phone;

        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || '登录失败');
        this.setToken(data.token);
        return data;
    },

    async changePassword(oldPassword, newPassword) {
        const res = await this._fetch('/api/auth/change-password', {
            method: 'POST',
            body: JSON.stringify({ oldPassword, newPassword })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        return data;
    },

    logout() {
        this._token = null;
        sessionStorage.removeItem('sm_token');
    },

    // ===== 兼容 API（全量数据交换） =====
    async init() {
        const res = await this._fetch('/api/init');
        if (!res.ok) throw new Error('API init failed: ' + res.status);
        return res.json();
    },

    async save(data) {
        return new Promise((resolve, reject) => {
            clearTimeout(this._saveTimer);
            this._saveTimer = setTimeout(async () => {
                try {
                    const res = await this._fetch('/api/save', {
                        method: 'POST',
                        body: JSON.stringify(data)
                    });
                    if (!res.ok) throw new Error('API save failed: ' + res.status);
                    resolve(await res.json());
                } catch (e) { reject(e); }
            }, 500);
        });
    },

    async saveNow(data) {
        const res = await this._fetch('/api/save', {
            method: 'POST',
            body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error('API save failed: ' + res.status);
        return res.json();
    },

    // ===== 精细 API =====

    // 业态
    async getCategories() {
        const res = await fetch('/api/categories');
        return res.json();
    },

    async createCategory(data) {
        const res = await this._fetch('/api/categories', { method: 'POST', body: JSON.stringify(data) });
        const d = await res.json();
        if (!res.ok) throw new Error(d.error);
        return d;
    },

    async updateCategory(id, data) {
        const res = await this._fetch('/api/categories/' + id, { method: 'PUT', body: JSON.stringify(data) });
        const d = await res.json();
        if (!res.ok) throw new Error(d.error);
        return d;
    },

    async deleteCategory(id) {
        const res = await this._fetch('/api/categories/' + id, { method: 'DELETE' });
        const d = await res.json();
        if (!res.ok) throw new Error(d.error);
        return d;
    },

    // 店铺
    async getStores(params = {}) {
        const qs = new URLSearchParams(params).toString();
        const res = await fetch('/api/stores' + (qs ? '?' + qs : ''));
        return res.json();
    },

    async getStore(id) {
        const res = await fetch('/api/stores/' + id);
        if (!res.ok) return null;
        return res.json();
    },

    async createStore(data) {
        const res = await this._fetch('/api/stores', { method: 'POST', body: JSON.stringify(data) });
        const d = await res.json();
        if (!res.ok) throw new Error(d.error);
        return d;
    },

    async updateStore(id, data) {
        const res = await this._fetch('/api/stores/' + id, { method: 'PUT', body: JSON.stringify(data) });
        const d = await res.json();
        if (!res.ok) throw new Error(d.error);
        return d;
    },

    async deleteStore(id) {
        const res = await this._fetch('/api/stores/' + id, { method: 'DELETE' });
        const d = await res.json();
        if (!res.ok) throw new Error(d.error);
        return d;
    },

    // 每日数据
    async submitDailyData(data) {
        const res = await this._fetch('/api/daily-data', { method: 'POST', body: JSON.stringify(data) });
        const d = await res.json();
        if (!res.ok) throw new Error(d.error);
        return d;
    },

    async updateDailyData(storeId, date, data) {
        const res = await this._fetch(`/api/daily-data/${storeId}/${date}`, { method: 'PUT', body: JSON.stringify(data) });
        const d = await res.json();
        if (!res.ok) throw new Error(d.error);
        return d;
    },

    async queryDailyData(params) {
        const qs = new URLSearchParams(params).toString();
        const res = await fetch('/api/daily-data/query?' + qs);
        return res.json();
    },

    // Dashboard
    async getDashboard(start, end) {
        const res = await fetch(`/api/dashboard?start=${start}&end=${end}`);
        return res.json();
    },

    // 异常预警
    async getAlerts() {
        const res = await fetch('/api/alerts');
        return res.json();
    },

    // 健康检查
    async health() {
        const res = await fetch('/api/health');
        return res.json();
    },

    // 一键清空所有店铺
    async resetAll() {
        const res = await this._fetch('/api/reset', { method: 'POST' });
        const d = await res.json();
        if (!res.ok) throw new Error(d.error);
        return d;
    }
};
