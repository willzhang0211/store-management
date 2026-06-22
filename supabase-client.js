// ========== Supabase 客户端 v3.0 ==========
// 替代 Express/SQLite 后端，直接连接 Supabase PostgreSQL
// 注意：PostgreSQL 存储列名为小写，客户端自动转换为 camelCase 供前端使用

const SUPABASE_URL = 'https://tervmpxzqdccfxlylvyd.supabase.co';
const SUPABASE_KEY = 'sb_publishable_2sRUyz4wEz1XD0aNOC-zQw_5OD0WqnK';

// PostgreSQL 小写列名 → 前端 camelCase 映射
const STORE_MAP = {
    id:'id', shopno:'shopNo', name:'name', category:'category', area:'area', areasize:'areaSize',
    managername:'managerName', managerphone:'managerPhone', basesales:'baseSales',
    basevisitors:'baseVisitors', basebuyers:'baseBuyers',
    created_at:'created_at', updated_at:'updated_at'
};
const CAT_MAP = {
    id:'id', name:'name', icon:'icon', color:'color', bgcolor:'bgColor',
    description:'desc', volatility:'volatility', created_at:'created_at', updated_at:'updated_at'
};
const USER_MAP = {
    id:'id', username:'username', phone:'phone', name:'name', store_id:'storeId',
    password:'password', role:'role', created_at:'created_at'
};
const DATA_MAP = {
    id:'id', date:'date', store_id:'storeId', sales:'sales', visitors:'visitors',
    buyers:'buyers', avgprice:'avgPrice', conversion:'conversion', notes:'notes',
    reported:'reported', created_at:'created_at', updated_at:'updated_at'
};

function mapRow(row, mapping) {
    const obj = {};
    if (row) Object.keys(row).forEach(k => { obj[mapping[k] || k] = row[k]; });
    return obj;
}
function mapArray(arr, mapping) { return (arr || []).map(r => mapRow(r, mapping)); }

// bcrypt 兼容
const _bc = typeof bcrypt !== 'undefined' ? bcrypt : (typeof bcryptjs !== 'undefined' ? bcryptjs : null);

const API = {
    _token: null,
    _currentUser: null,

    setToken(token) {
        this._token = token;
        if (token) sessionStorage.setItem('sm_token', token);
        else sessionStorage.removeItem('sm_token');
    },

    getToken() {
        if (!this._token) this._token = sessionStorage.getItem('sm_token') || null;
        return this._token;
    },

    _headers() {
        return { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY, 'Content-Type': 'application/json' };
    },

    async _fetch(path, options = {}) {
        const res = await fetch(SUPABASE_URL + '/rest/v1/' + path, { ...options, headers: { ...this._headers(), ...(options.headers || {}) } });
        if (!res.ok) throw new Error('Request failed: ' + res.status);
        const text = await res.text();
        return text ? JSON.parse(text) : null;
    },

    async _fetchRaw(path, options = {}) {
        const res = await fetch(SUPABASE_URL + '/rest/v1/' + path, { ...options, headers: { ...this._headers(), ...(options.headers || {}), 'Prefer': 'return=minimal' } });
        if (!res.ok && res.status !== 204) throw new Error('Request failed: ' + res.status);
        return true;
    },

    logout() {
        this._token = null; this._currentUser = null;
        sessionStorage.removeItem('sm_token');
        sessionStorage.removeItem('sm_user');
    },

    // ===== 认证 =====
    async login(role, credentials) {
        if (!_bc) throw new Error('bcrypt library not loaded');
        if (role === 'admin') {
            const users = await this._fetch(`app_users?username=eq.${encodeURIComponent(credentials.username)}&select=*`);
            const user = users && users[0];
            if (!user) throw new Error('账号不存在');
            if (!_bc.compareSync(credentials.password, user.password)) throw new Error('密码错误');
            this._currentUser = { userId: user.id, role: 'admin', name: user.name };
        } else {
            const phone = (credentials.phone || '').trim();
            const users = await this._fetch(`app_users?phone=eq.${encodeURIComponent(phone)}&select=*`);
            const user = users && users[0];
            if (!user) throw new Error('该手机号未绑定任何店铺');
            if (!_bc.compareSync(credentials.password, user.password)) throw new Error('密码错误');
            this._currentUser = { userId: user.id, role: 'store', storeId: user.store_id, phone: user.phone, name: user.name };
        }
        this.setToken('supabase_session');
        return { token: 'supabase_session', user: this._currentUser, message: '登录成功' };
    },

    async changePassword(oldPassword, newPassword) {
        if (!_bc) throw new Error('bcrypt library not loaded');
        const user = this._currentUser;
        const field = user.role === 'admin' ? 'username' : 'phone';
        const value = user.role === 'admin' ? 'admin' : user.phone;
        const users = await this._fetch(`app_users?${field}=eq.${encodeURIComponent(value)}&select=*`);
        const dbUser = users && users[0];
        if (!dbUser) throw new Error('用户不存在');
        if (!_bc.compareSync(oldPassword, dbUser.password)) throw new Error('当前密码错误');
        const hash = _bc.hashSync(newPassword, 10);
        await this._fetchRaw(`app_users?id=eq.${dbUser.id}`, { method: 'PATCH', body: JSON.stringify({ password: hash }) });
    },

    // ===== 全量加载 =====
    async init() {
        const [stores, categories, managers, rawData] = await Promise.all([
            this._fetch('stores?select=*&order=id'),
            this._fetch('categories?select=*&order=id'),
            this._fetch("app_users?role=eq.store&select=*"),
            this._fetch('daily_data?select=*&order=date')
        ]);
        const dailyData = {};
        (rawData || []).forEach(row => {
            const d = mapRow(row, DATA_MAP);
            if (!dailyData[d.date]) dailyData[d.date] = {};
            dailyData[d.date][d.storeId] = {
                sales: Number(d.sales), visitors: d.visitors, buyers: d.buyers,
                avgPrice: Number(d.avgPrice), conversion: Number(d.conversion),
                notes: d.notes || '', reported: d.reported
            };
        });
        return {
            stores: mapArray(stores, STORE_MAP),
            categories: mapArray(categories, CAT_MAP),
            managers: mapArray(managers, USER_MAP),
            dailyData, adminPassword: '', _lastUpdate: new Date().toISOString()
        };
    },

    async save(data) { return this.saveNow(data); },

    async saveNow(data) {
        return { success: true, stores: (data.stores || []).length };
    },

    // ===== 业态 CRUD =====
    async getCategories() { return mapArray(await this._fetch('categories?select=*&order=id'), CAT_MAP); },
    async createCategory(data) {
        const body = { id: data.id, name: data.name, icon: data.icon || '', color: data.color || '#1677ff', bgcolor: data.bgColor || '#e6f4ff', description: data.desc || '' };
        await this._fetch('categories', { method: 'POST', body: JSON.stringify(body) });
        return { success: true, id: data.id };
    },
    async updateCategory(id, data) {
        const body = {};
        if (data.name) body.name = data.name;
        if (data.icon !== undefined) body.icon = data.icon;
        if (data.color) body.color = data.color;
        if (data.bgColor) body.bgcolor = data.bgColor;
        if (data.desc !== undefined) body.description = data.desc;
        await this._fetchRaw(`categories?id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(body) });
        return { success: true };
    },
    async deleteCategory(id) {
        await this._fetchRaw(`categories?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' });
        return { success: true };
    },

    // ===== 店铺 CRUD =====
    async getStores() { return mapArray(await this._fetch('stores?select=*&order=id'), STORE_MAP); },
    async getStore(id) {
        const r = await this._fetch(`stores?id=eq.${encodeURIComponent(id)}&select=*`);
        return r ? mapRow(r[0], STORE_MAP) : null;
    },
    async createStore(data) {
        const max = await this._fetch('stores?select=id&order=id.desc&limit=1');
        const maxNum = (max && max[0]) ? parseInt(max[0].id.replace('S', '')) : 0;
        const newId = 'S' + String(maxNum + 1).padStart(3, '0');
        const body = {
            id: newId, shopno: data.shopNo, name: data.name, category: data.category,
            area: data.area || '', areasize: data.areaSize || 0,
            managername: data.managerName || '', managerphone: data.managerPhone || '',
            basesales: 10000, basevisitors: 100, basebuyers: 60
        };
        await this._fetch('stores', { method: 'POST', body: JSON.stringify(body) });
        if (data.managerPhone) {
            const hash = _bc ? _bc.hashSync('123456', 10) : '$2a$10$placeholder';
            await this._fetch('app_users', {
                method: 'POST',
                body: JSON.stringify({ phone: data.managerPhone, name: data.managerName || '', store_id: newId, password: hash, role: 'store' })
            }).catch(e => console.warn('创建店长账号失败:', e));
        }
        return { success: true, id: newId };
    },
    async updateStore(id, data) {
        const body = {};
        if (data.shopNo) body.shopno = data.shopNo;
        if (data.name) body.name = data.name;
        if (data.category) body.category = data.category;
        if (data.area !== undefined) body.area = data.area;
        if (data.areaSize !== undefined) body.areasize = data.areaSize;
        if (data.managerName !== undefined) body.managername = data.managerName;
        if (data.managerPhone !== undefined) body.managerphone = data.managerPhone;
        await this._fetchRaw(`stores?id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(body) });
        return { success: true };
    },
    async deleteStore(id) {
        await this._fetchRaw(`daily_data?store_id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' }).catch(() => {});
        await this._fetchRaw(`app_users?store_id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' }).catch(() => {});
        await this._fetchRaw(`stores?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' });
        return { success: true };
    },

    // ===== 每日数据 =====
    async submitDailyData(data) {
        const body = { date: data.date, store_id: this._currentUser.storeId, sales: data.sales, visitors: data.visitors, buyers: data.buyers, notes: data.notes || '', reported: true };
        await this._fetchRaw(`daily_data?date=eq.${data.date}&store_id=eq.${this._currentUser.storeId}`, { method: 'DELETE' }).catch(() => {});
        await this._fetch('daily_data', { method: 'POST', body: JSON.stringify(body) });
        return { success: true, message: '数据提交成功' };
    },
    async updateDailyData(storeId, date, data) {
        const body = { sales: data.sales, visitors: data.visitors, buyers: data.buyers, notes: data.notes || '' };
        // Patch if exists, else insert
        const existing = await this._fetch(`daily_data?date=eq.${date}&store_id=eq.${encodeURIComponent(storeId)}&select=id`);
        if (existing && existing.length > 0) {
            await this._fetchRaw(`daily_data?id=eq.${existing[0].id}`, { method: 'PATCH', body: JSON.stringify(body) });
        } else {
            body.date = date; body.store_id = storeId; body.reported = true;
            await this._fetch('daily_data', { method: 'POST', body: JSON.stringify(body) });
        }
        return { success: true };
    },

    // ===== 清空 =====
    async resetAll() {
        await this._fetchRaw('daily_data', { method: 'DELETE' });
        await this._fetchRaw("app_users?role=eq.store", { method: 'DELETE' });
        await this._fetchRaw('stores', { method: 'DELETE' });
        return { success: true, message: '已清空' };
    },

    async health() {
        const stores = await this._fetch('stores?select=id');
        return { status: 'ok', stores: (stores || []).length, days: 0, dbSize: 'Supabase', lastUpdate: new Date().toISOString() };
    }
};
