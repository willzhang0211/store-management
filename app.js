// ========== 应用核心逻辑 ==========

let currentUser = null;
let charts = {};
const todayStr = formatDate(new Date());

// ========== 通用工具 ==========

function formatNumber(num) {
    if (num >= 100000000) return (num / 100000000).toFixed(2) + '亿';
    if (num >= 10000) return (num / 10000).toFixed(1) + '万';
    return num.toLocaleString('zh-CN');
}

// 货币格式化：保留完整数值 + 2位小数，不缩写
function formatCurrency(n) {
    if (n == null || isNaN(n)) return '0.00';
    return Number(n).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// 万元格式化（用于看板总销售额汇总显示）
function formatWan(n) {
    if (n == null || isNaN(n)) return '0.00万元';
    return (n / 10000).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '万元';
}

function catKey(name) {
    const map = {};
    categoryList.forEach(c => { map[c.name] = 'cat-' + c.id; });
    return map[name] || 'cat-other';
}

function getDateRange(start, end) {
    const dates = [];
    const cur = new Date(start);
    const endDate = new Date(end);
    while (cur <= endDate) { dates.push(formatDate(cur)); cur.setDate(cur.getDate() + 1); }
    return dates;
}

function getPeriodRange(period) {
    const today = new Date();
    const dow = today.getDay();
    let start, end;
    switch (period) {
        case 'today': start = new Date(today); end = new Date(today); break;
        case 'week': start = new Date(today); start.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1)); end = new Date(today); break;
        case 'month': start = new Date(today.getFullYear(), today.getMonth(), 1); end = new Date(today); break;
        default: return null;
    }
    return { start, end };
}

function getPrevPeriodRange(start, end) {
    const diff = Math.ceil((end - start) / 86400000) + 1;
    const ps = new Date(start); ps.setDate(ps.getDate() - diff);
    const pe = new Date(end); pe.setDate(pe.getDate() - diff);
    return { start: ps, end: pe };
}

function getMetricSum(date, storeIdOrCat, metric) {
    const dayData = dailyData[date];
    if (!dayData) return 0;
    let stores;
    if (storeIdOrCat === 'all') stores = storeList;
    else if (categoryList.some(c => c.name === storeIdOrCat)) stores = storeList.filter(s => s.category === storeIdOrCat);
    else stores = [getStoreById(storeIdOrCat)];

    if (metric === 'efficiency') {
        let totalSales = 0, totalArea = 0;
        stores.forEach(s => {
            const d = dayData[s.id];
            if (d && d.reported) { totalSales += d.sales; totalArea += (s.areaSize || 0); }
        });
        return totalArea > 0 ? Math.round(totalSales / totalArea) : 0;
    }

    return stores.reduce((sum, s) => {
        const d = dayData[s.id];
        return d && d.reported ? sum + d[metric] : sum;
    }, 0);
}

function showToast(msg, type = 'info') {
    const c = document.getElementById('toast-container');
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    const icon = type === 'success' ? '✓' : type === 'error' ? '✗' : 'ℹ';
    t.innerHTML = `<span>${icon}</span> ${msg}`;
    c.appendChild(t);
    setTimeout(() => { t.style.animation = 'toast-out 0.3s ease forwards'; setTimeout(() => t.remove(), 300); }, 3000);
}

// ========== 动态填充下拉框 ==========

function buildCategoryOptions(selectEl, includeAll) {
    if (!selectEl) return;
    selectEl.innerHTML = '';
    if (includeAll) selectEl.innerHTML += '<option value="all">全部业态</option>';
    categoryList.forEach(cat => {
        selectEl.innerHTML += `<option value="${cat.name}">${cat.icon} ${cat.name}</option>`;
    });
}

function populateStoreSelects() {
    ['analysis-store', 'trend-store'].forEach(id => {
        const sel = document.getElementById(id);
        if (!sel) return;
        sel.innerHTML = '<option value="all">全部店铺</option>';
        categoryList.forEach(cat => {
            sel.innerHTML += `<option value="${cat.name}">${cat.icon} ${cat.name}汇总</option>`;
        });
        storeList.forEach(s => { sel.innerHTML += `<option value="${s.id}">${s.name}</option>`; });
    });
}

function populateAllCategorySelects() {
    buildCategoryOptions(document.getElementById('store-category-filter'), true);
    buildCategoryOptions(document.getElementById('edit-store-category'), false);
    buildCategoryOptions(document.getElementById('compare-category'), true);
}

// ========== 时间筛选器组件 ==========

function createTimeFilterBar(containerId, onChange) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const uid = containerId;
    container.innerHTML = `
        <select id="${uid}-preset" onchange="handleTimeFilterChange('${uid}', '${onChange}')">
            <option value="today">当日</option>
            <option value="week" selected>本周</option>
            <option value="month">本月</option>
            <option value="custom">自定义</option>
        </select>
        <div class="custom-range" id="${uid}-custom">
            <input type="date" id="${uid}-start" max="${todayStr}" onchange="${onChange}()">
            <span class="separator">至</span>
            <input type="date" id="${uid}-end" max="${todayStr}" onchange="${onChange}()">
        </div>
    `;
    const today = new Date();
    document.getElementById(`${uid}-start`).value = formatDate(new Date(today.getFullYear(), today.getMonth(), 1));
    document.getElementById(`${uid}-end`).value = todayStr;
}

function handleTimeFilterChange(uid, onChangeFn) {
    const preset = document.getElementById(`${uid}-preset`).value;
    const customEl = document.getElementById(`${uid}-custom`);
    if (preset === 'custom') {
        customEl.classList.add('visible');
    } else {
        customEl.classList.remove('visible');
    }
    window[onChangeFn]();
}

function getTimeFilterRange(uid) {
    const preset = document.getElementById(`${uid}-preset`).value;
    if (preset === 'custom') {
        const s = document.getElementById(`${uid}-start`).value;
        const e = document.getElementById(`${uid}-end`).value;
        if (!s || !e) return getPeriodRange('week');
        return { start: new Date(s), end: new Date(e) };
    }
    return getPeriodRange(preset);
}

function getTimeFilterLabel(uid) {
    const preset = document.getElementById(`${uid}-preset`).value;
    const labels = { today: '当日', week: '本周', month: '本月', custom: '自定义' };
    if (preset === 'custom') {
        const s = document.getElementById(`${uid}-start`).value;
        const e = document.getElementById(`${uid}-end`).value;
        return `${s} ~ ${e}`;
    }
    return labels[preset];
}

// ========== 登录 ==========

function switchLoginTab(role) {
    document.querySelectorAll('.login-tab').forEach(t => t.classList.remove('active'));
    document.querySelector(`.login-tab[data-role="${role}"]`).classList.add('active');
    document.getElementById('admin-login-form').classList.toggle('hidden', role !== 'admin');
    document.getElementById('store-login-form').classList.toggle('hidden', role !== 'store');
}

async function handleLogin(role) {
    let credentials;
    if (role === 'admin') {
        credentials = {
            username: document.getElementById('admin-user').value,
            password: document.getElementById('admin-pass').value
        };
    } else {
        credentials = {
            phone: document.getElementById('store-phone').value.trim(),
            password: document.getElementById('store-pass').value
        };
    }

    // 优先尝试 API 登录
    const apiResult = await apiLogin(role, credentials);
    if (apiResult.success) {
        currentUser = apiResult.user;
        if (role === 'admin') {
            sessionStorage.setItem('sm_user', JSON.stringify(currentUser));
            sessionStorage.setItem('sm_page', 'page-admin');
            showPage('page-admin');
            const savedSection = sessionStorage.getItem('sm_section') || 'dashboard';
            initAdminPage();
            switchSection(savedSection);
            showToast('欢迎进入管理后台', 'success');
        } else {
            // 店长登录：处理多店铺管理
            const phone = apiResult.user.phone || credentials.phone;
            const userStores = getManagerStores(phone) || [];
            if (userStores.length > 1) {
                currentUser = { role: 'store', phone, storeIds: userStores.map(s => s.id), storeId: userStores[0].id };
            }
            sessionStorage.setItem('sm_user', JSON.stringify(currentUser));
            sessionStorage.setItem('sm_page', 'page-store');
            showPage('page-store');
            initStorePage();
            showToast('欢迎进入数据填报', 'success');
        }
        return;
    }

    // API失败，回退本地登录
    const localResult = localLogin(role, credentials);
    if (localResult.success) {
        currentUser = localResult.user;
        sessionStorage.setItem('sm_user', JSON.stringify(currentUser));
        sessionStorage.setItem('sm_page', role === 'admin' ? 'page-admin' : 'page-store');
        if (role === 'admin') {
            showPage('page-admin');
            const savedSection = sessionStorage.getItem('sm_section') || 'dashboard';
            initAdminPage();
            switchSection(savedSection);
            showToast('欢迎进入管理后台（离线模式）', 'success');
        } else {
            showPage('page-store');
            initStorePage();
            showToast('欢迎进入数据填报（离线模式）', 'success');
        }
    } else {
        showToast(localResult.error || '登录失败', 'error');
    }
}

function handleLogout() {
    currentUser = null;
    if (typeof API !== 'undefined') API.logout();
    // 清除sessionStorage中的登录状态
    sessionStorage.removeItem('sm_user');
    sessionStorage.removeItem('sm_page');
    sessionStorage.removeItem('sm_section');
    Object.values(charts).forEach(c => { if (c) c.destroy(); });
    charts = {};
    showPage('page-login');
}

function showPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
}

// ========== 店长端 ==========

function initStorePage() {
    const userStores = getManagerStores(currentUser.phone);
    if (userStores.length === 0) {
        showToast('店铺信息异常，请联系管理员', 'error');
        return;
    }
    const store = getStoreById(currentUser.storeId) || userStores[0];
    const mgr = getManagerByPhone(currentUser.phone);
    const catObj = getCategoryByName(store.category);
    const catIcon = catObj ? catObj.icon : '';
    document.getElementById('store-name-badge').textContent = `${catIcon} ${store.category} · ${store.name}`;
    document.getElementById('store-manager-info').textContent = `店长：${mgr.name} (${mgr.phone})`;
    document.getElementById('report-date').value = todayStr;

    // 多店铺管理：显示店铺选择下拉框
    const storeSelectContainer = document.getElementById('store-select-container');
    const storeSelect = document.getElementById('store-select');
    if (userStores.length > 1) {
        storeSelectContainer.classList.remove('hidden');
        storeSelect.innerHTML = '';
        userStores.forEach(s => {
            storeSelect.innerHTML += `<option value="${s.id}" ${s.id === currentUser.storeId ? 'selected' : ''}>${s.shopNo} · ${s.name}</option>`;
        });
    } else {
        storeSelectContainer.classList.add('hidden');
    }

    const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
    document.getElementById('store-query-start').value = formatDate(weekAgo);
    document.getElementById('store-query-end').value = todayStr;

    switchStoreTab('report');
}

// 切换当前管理的店铺
function switchCurrentStore() {
    const newStoreId = document.getElementById('store-select').value;
    if (newStoreId && newStoreId !== currentUser.storeId) {
        currentUser.storeId = newStoreId;
        sessionStorage.setItem('sm_user', JSON.stringify(currentUser));
        initStorePage();
    }
}

function switchStoreTab(tab) {
    document.querySelectorAll('.store-nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelector(`.store-nav-btn[data-tab="${tab}"]`).classList.add('active');
    document.querySelectorAll('.store-tab-content').forEach(c => c.classList.remove('active'));
    document.getElementById(`store-tab-${tab}`).classList.add('active');
    if (tab === 'query') loadStoreHistory();
}

function calcAutoFields() {
    const sales = parseFloat(document.getElementById('report-sales').value) || 0;
    const visitors = parseInt(document.getElementById('report-visitors').value) || 0;
    const buyers = parseInt(document.getElementById('report-buyers').value) || 0;
    const avgEl = document.getElementById('report-avg-price');
    const convEl = document.getElementById('report-conversion');
    avgEl.value = (sales > 0 && buyers > 0) ? Math.round(sales / buyers * 100) / 100 : '';
    avgEl.classList.toggle('has-value', sales > 0 && buyers > 0);
    convEl.value = (visitors > 0 && buyers > 0) ? Math.round(buyers / visitors * 10000) / 100 : '';
    convEl.classList.toggle('has-value', visitors > 0 && buyers > 0);
}

async function submitDailyReport(e) {
    e.preventDefault();
    const date = document.getElementById('report-date').value;
    const sales = parseFloat(document.getElementById('report-sales').value);
    const visitors = parseInt(document.getElementById('report-visitors').value);
    const buyers = parseInt(document.getElementById('report-buyers').value);
    const notes = document.getElementById('report-notes').value.trim();

    // 必填校验
    if (!date) { showToast('请选择上报日期', 'error'); return; }
    if (!sales || sales <= 0) { showToast('销售额为必填项，且必须大于0', 'error'); return; }
    if (!visitors || visitors <= 0) { showToast('客流量为必填项，且必须大于0', 'error'); return; }
    if (!buyers || buyers <= 0) { showToast('购买人次为必填项，且必须大于0', 'error'); return; }
    if (buyers > visitors) { showToast('购买人次不能大于客流量', 'error'); return; }

    if (!dailyData[date]) dailyData[date] = {};
    dailyData[date][currentUser.storeId] = {
        sales, visitors, buyers,
        avgPrice: Math.round(sales / buyers * 100) / 100,
        conversion: Math.round(buyers / visitors * 10000) / 100,
        notes, reported: true  // 提交即确认，无需待确认
    };

    // 调用精细API立即入库
    if (typeof API !== 'undefined' && API.getToken()) {
        try {
            await API.submitDailyData({ date, sales, visitors, buyers, notes });
        } catch (e) {
            showToast('服务器保存失败，数据仅保存在本地', 'error');
            console.error('API提交数据失败:', e);
        }
    }
    saveAllData();
    showToast('数据提交成功，已自动确认！', 'success');
    clearForm();
}

function clearForm() {
    document.getElementById('report-sales').value = '';
    document.getElementById('report-visitors').value = '';
    document.getElementById('report-buyers').value = '';
    document.getElementById('report-notes').value = '';
    const avgEl = document.getElementById('report-avg-price');
    const convEl = document.getElementById('report-conversion');
    avgEl.value = ''; avgEl.classList.remove('has-value');
    convEl.value = ''; convEl.classList.remove('has-value');
}

// 查询历史数据
function loadStoreHistory() {
    const start = document.getElementById('store-query-start').value;
    const end = document.getElementById('store-query-end').value;
    if (!start || !end) { showToast('请选择查询日期范围', 'error'); return; }
    const dates = getDateRange(new Date(start), new Date(end));
    const tbody = document.querySelector('#store-history-table tbody');
    tbody.innerHTML = '';
    const sid = currentUser.storeId;

    dates.reverse().forEach(date => {
        const d = dailyData[date]?.[sid];
        if (!d) return;
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${date}</td>
            <td>¥${formatCurrency(d.sales)}</td>
            <td>${d.visitors}</td>
            <td>${d.buyers}</td>
            <td>¥${d.avgPrice}</td>
            <td>${d.conversion}%</td>
            <td><span class="status-tag success">已确认</span></td>
            <td><button class="btn-table" onclick="showEditDataModal('${date}')">修改</button></td>
        `;
        tbody.appendChild(tr);
    });
}

function showEditDataModal(date) {
    const d = dailyData[date]?.[currentUser.storeId];
    if (!d) return;
    document.getElementById('edit-data-date').value = date;
    document.getElementById('edit-data-title').textContent = `修改 ${date} 的数据`;
    document.getElementById('edit-sales').value = d.sales;
    document.getElementById('edit-visitors').value = d.visitors;
    document.getElementById('edit-buyers').value = d.buyers;
    document.getElementById('edit-notes').value = d.notes || '';
    calcEditAutoFields();
    document.getElementById('modal-edit-data').classList.remove('hidden');
}

function calcEditAutoFields() {
    const s = parseFloat(document.getElementById('edit-sales').value) || 0;
    const v = parseInt(document.getElementById('edit-visitors').value) || 0;
    const b = parseInt(document.getElementById('edit-buyers').value) || 0;
    document.getElementById('edit-avg-price').value = (s > 0 && b > 0) ? Math.round(s / b * 100) / 100 : '';
    document.getElementById('edit-conversion').value = (v > 0 && b > 0) ? Math.round(b / v * 10000) / 100 : '';
}

async function saveEditData() {
    const date = document.getElementById('edit-data-date').value;
    const sales = parseFloat(document.getElementById('edit-sales').value) || 0;
    const visitors = parseInt(document.getElementById('edit-visitors').value) || 0;
    const buyers = parseInt(document.getElementById('edit-buyers').value) || 0;
    const notes = document.getElementById('edit-notes').value.trim();

    if (!sales || sales <= 0) { showToast('销售额必须大于0', 'error'); return; }
    if (!visitors || visitors <= 0) { showToast('客流量必须大于0', 'error'); return; }
    if (!buyers || buyers <= 0) { showToast('购买人次必须大于0', 'error'); return; }
    if (buyers > visitors) { showToast('购买人次不能大于客流量', 'error'); return; }

    dailyData[date][currentUser.storeId] = {
        sales, visitors, buyers,
        avgPrice: Math.round(sales / buyers * 100) / 100,
        conversion: Math.round(buyers / visitors * 10000) / 100,
        notes, reported: true
    };

    // 调用精细API更新数据
    if (typeof API !== 'undefined' && API.getToken()) {
        try {
            await API.updateDailyData(currentUser.storeId, date, { sales, visitors, buyers, notes });
        } catch (e) { console.error('API更新数据失败:', e); }
    }
    saveAllData();
    hideEditDataModal();
    loadStoreHistory();
    showToast('数据修改成功', 'success');
}

function hideEditDataModal() { document.getElementById('modal-edit-data').classList.add('hidden'); }

// 修改密码
function showChangePassword() { document.getElementById('modal-change-password').classList.remove('hidden'); }
function hideChangePassword() { document.getElementById('modal-change-password').classList.add('hidden'); }

async function changePassword() {
    const oldPwd = document.getElementById('old-password').value;
    const newPwd = document.getElementById('new-password').value;
    const confirmPwd = document.getElementById('confirm-password').value;

    if (newPwd.length < 6) { showToast('新密码至少6位', 'error'); return; }
    if (newPwd !== confirmPwd) { showToast('两次输入的新密码不一致', 'error'); return; }

    // 优先尝试 API
    if (typeof API !== 'undefined' && API.getToken()) {
        try {
            await API.changePassword(oldPwd, newPwd);
            hideChangePassword();
            showToast('密码修改成功', 'success');
            return;
        } catch (e) {
            showToast(e.message || '修改失败', 'error');
            return;
        }
    }

    // 离线回退
    const mgr = getManagerByPhone(currentUser.phone);
    if (oldPwd !== mgr.password) { showToast('当前密码错误', 'error'); return; }
    mgr.password = newPwd;
    saveAllData();
    hideChangePassword();
    showToast('密码修改成功', 'success');
    document.getElementById('old-password').value = '';
    document.getElementById('new-password').value = '';
    document.getElementById('confirm-password').value = '';
}

// ========== 管理后台 ==========

function initAdminPage() {
    populateStoreSelects();
    populateAllCategorySelects();
    createTimeFilterBar('dashboard-time-filter', 'refreshDashboard');
    createTimeFilterBar('analysis-time-filter', 'refreshAnalysis');
    createTimeFilterBar('compare-time-filter', 'refreshCompare');
    createTimeFilterBar('trend-time-filter', 'refreshTrend');
    refreshDashboard();
}

function switchSection(section) {
    // 保存当前栏目，刷新后可恢复
    sessionStorage.setItem('sm_section', section);

    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.getElementById(`section-${section}`).classList.add('active');
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const navItem = document.querySelector(`.nav-item[data-section="${section}"]`);
    if (navItem) navItem.classList.add('active');

    // 更新手机端标题
    const titleMap = { dashboard: '数据总看板', dataquery: '数据查询', stores: '店铺管理', categories: '业态管理', analysis: '数据分析', compare: '对比排名', trend: '趋势追踪', alerts: '异常预警' };
    const mTitle = document.getElementById('mobile-title');
    if (mTitle) mTitle.textContent = titleMap[section] || section;

    // 关闭手机端侧边栏
    closeMobileSidebar();

    switch (section) {
        case 'dashboard': refreshDashboard(); break;
        case 'dataquery': initDataQuery(); break;
        case 'stores': refreshStoreGrid(); break;
        case 'categories': refreshCategoryManage(); break;
        case 'analysis': refreshAnalysis(); break;
        case 'compare': refreshCompare(); break;
        case 'trend': refreshTrend(); break;
        case 'alerts': refreshAlerts(); break;
    }
}

// 手机端侧边栏切换
function toggleMobileSidebar() {
    const sb = document.querySelector('.sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (sb) sb.classList.toggle('open');
    if (overlay) overlay.classList.toggle('show');
}
function closeMobileSidebar() {
    const sb = document.querySelector('.sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (sb) sb.classList.remove('open');
    if (overlay) overlay.classList.remove('show');
}

// ========== 业态管理 ==========

function refreshCategoryManage() {
    const container = document.getElementById('category-manage-grid');
    container.innerHTML = '';

    categoryList.forEach(cat => {
        const storeCount = storeList.filter(s => s.category === cat.name).length;
        const card = document.createElement('div');
        card.className = `category-manage-card`;
        card.style.borderTopColor = cat.color;
        card.innerHTML = `
            <div class="cat-manage-header">
                <span class="cat-manage-icon" style="background:${cat.bgColor || hexToLight(cat.color)};color:${cat.color}">${cat.icon || '🏷'}</span>
                <div class="cat-manage-info">
                    <h4 style="color:${cat.color}">${cat.name}</h4>
                    <span class="cat-manage-desc">${cat.desc || ''}</span>
                    <span class="cat-manage-count">${storeCount}家店铺</span>
                </div>
                <span class="cat-color-dot" style="background:${cat.color}"></span>
            </div>
            <div class="cat-manage-actions">
                <button class="btn-table" onclick="showEditCategoryModal('${cat.id}')">编辑</button>
                <button class="btn-table btn-danger" onclick="deleteCategory('${cat.id}')" ${storeCount > 0 ? 'disabled title="该业态下有店铺，无法删除"' : ''}>删除</button>
            </div>`;
        container.appendChild(card);
    });
}

function hexToLight(hex) {
    if (!hex) return '#f0f0f0';
    const r = parseInt(hex.slice(1,3), 16);
    const g = parseInt(hex.slice(3,5), 16);
    const b = parseInt(hex.slice(5,7), 16);
    return `rgb(${Math.min(255, r+180)},${Math.min(255, g+180)},${Math.min(255, b+180)})`;
}

function showAddCategoryModal() {
    document.getElementById('edit-category-id').value = '';
    document.getElementById('category-edit-title').textContent = '新增业态';
    document.getElementById('edit-category-name').value = '';
    document.getElementById('edit-category-icon').value = '';
    document.getElementById('edit-category-color').value = '#1677ff';
    document.getElementById('edit-category-desc').value = '';
    document.getElementById('modal-category-edit').classList.remove('hidden');
}

function showEditCategoryModal(catId) {
    const cat = getCategoryById(catId);
    if (!cat) return;
    document.getElementById('edit-category-id').value = catId;
    document.getElementById('category-edit-title').textContent = `编辑业态 · ${cat.name}`;
    document.getElementById('edit-category-name').value = cat.name;
    document.getElementById('edit-category-icon').value = cat.icon || '';
    document.getElementById('edit-category-color').value = cat.color || '#1677ff';
    document.getElementById('edit-category-desc').value = cat.desc || '';
    document.getElementById('modal-category-edit').classList.remove('hidden');
}

function hideCategoryEditModal() { document.getElementById('modal-category-edit').classList.add('hidden'); }

async function saveCategoryEdit() {
    const id = document.getElementById('edit-category-id').value;
    const name = document.getElementById('edit-category-name').value.trim();
    const icon = document.getElementById('edit-category-icon').value.trim() || '🏷';
    const color = document.getElementById('edit-category-color').value;
    const desc = document.getElementById('edit-category-desc').value.trim();

    if (!name) { showToast('业态名称必填', 'error'); return; }

    const dup = categoryList.find(c => c.name === name && c.id !== id);
    if (dup) { showToast('业态名称已存在', 'error'); return; }

    if (id) {
        const cat = getCategoryById(id);
        const oldName = cat.name;
        cat.name = name;
        cat.icon = icon;
        cat.color = color;
        cat.bgColor = hexToLight(color);
        cat.desc = desc;
        if (oldName !== name) {
            storeList.forEach(s => { if (s.category === oldName) s.category = name; });
        }
        // 调用精细API更新业态
        if (typeof API !== 'undefined' && API.getToken()) {
            API.updateCategory(id, { name, icon, color, desc }).catch(e => console.warn('API更新业态失败:', e));
        }
    } else {
        let newId;
        if (typeof API !== 'undefined' && API.getToken()) {
            try {
                const result = await API.createCategory({ name, icon, color, desc });
                newId = result.id;
            } catch (e) {
                console.warn('API创建业态失败:', e);
                newId = generateCategoryId();
            }
        } else {
            newId = generateCategoryId();
        }
        categoryList.push({ id: newId, name, icon, color, bgColor: hexToLight(color), desc });
    }

    saveAllData();
    hideCategoryEditModal();
    populateAllCategorySelects();
    populateStoreSelects();
    refreshCategoryManage();
    showToast(id ? '业态修改成功' : '业态新增成功', 'success');
}

async function deleteCategory(catId) {
    const cat = getCategoryById(catId);
    if (!cat) return;
    const storeCount = storeList.filter(s => s.category === cat.name).length;
    if (storeCount > 0) { showToast(`该业态下有${storeCount}家店铺，请先转移店铺业态后再删除`, 'error'); return; }

    if (!confirm(`确定删除业态「${cat.name}」？`)) return;

    // 调用精细API从服务器删除
    if (typeof API !== 'undefined' && API.getToken()) {
        try {
            await API.deleteCategory(catId);
        } catch (e) {
            showToast('服务器删除失败: ' + e.message, 'error');
            return;
        }
    }

    categoryList = categoryList.filter(c => c.id !== catId);
    saveAllData();
    populateAllCategorySelects();
    populateStoreSelects();
    refreshCategoryManage();
    showToast('业态删除成功', 'success');
}

// ========== 数据总看板（合并经营概览） ==========

function refreshDashboard() {
    const range = getTimeFilterRange('dashboard-time-filter');
    const dates = getDateRange(range.start, range.end);

    let totalSales = 0, totalVisitors = 0, totalBuyers = 0;
    dates.forEach(date => { storeList.forEach(s => { const d = dailyData[date]?.[s.id]; if (d?.reported) { totalSales += d.sales; totalVisitors += d.visitors; totalBuyers += d.buyers; } }); });
    const avgConv = totalVisitors > 0 ? Math.round(totalBuyers / totalVisitors * 10000) / 100 : 0;

    const totalArea = storeList.reduce((s, st) => s + (st.areaSize || 0), 0);
    document.getElementById('dash-total-area').textContent = formatNumber(totalArea);
    document.getElementById('dash-total-stores').textContent = storeList.length;
    document.getElementById('dash-total-sales').textContent = formatWan(totalSales);
    document.getElementById('dash-total-visitors').textContent = formatNumber(totalVisitors);
    document.getElementById('dash-total-buyers').textContent = formatNumber(totalBuyers);
    document.getElementById('dash-avg-conversion').textContent = `${avgConv}%`;

    // 环比
    const prev = getPrevPeriodRange(range.start, range.end);
    const prevDates = getDateRange(prev.start, prev.end);
    let prevSales = 0;
    prevDates.forEach(date => { storeList.forEach(s => { const d = dailyData[date]?.[s.id]; if (d?.reported) prevSales += d.sales; }); });
    const change = prevSales > 0 ? ((totalSales - prevSales) / prevSales * 100).toFixed(1) : '--';
    const changeEl = document.getElementById('dash-sales-change');
    if (change !== '--') {
        const isUp = parseFloat(change) >= 0;
        changeEl.textContent = `${isUp ? '↑' : '↓'} ${Math.abs(parseFloat(change))}% 环比`;
        changeEl.className = `dash-change ${isUp ? '' : 'down'}`;
    } else { changeEl.textContent = '--'; }

    // 业态汇总卡片
    const row = document.getElementById('dashboard-category-row');
    row.innerHTML = '';
    categoryList.forEach(cat => {
        const catStores = storeList.filter(s => s.category === cat.name);
        let catSales = 0, catVisitors = 0, catBuyers = 0;
        dates.forEach(date => { catStores.forEach(s => { const d = dailyData[date]?.[s.id]; if (d?.reported) { catSales += d.sales; catVisitors += d.visitors; catBuyers += d.buyers; } }); });
        const catArea = catStores.reduce((s, st) => s + (st.areaSize || 0), 0);
        const avgRevPerSqm = catArea > 0 ? Math.round(catSales / catArea) : 0;
        const conv = catVisitors > 0 ? Math.round(catBuyers / catVisitors * 10000) / 100 : 0;
        const card = document.createElement('div');
        card.className = `dash-cat-card ${catKey(cat.name)}`;
        card.style.borderTopColor = cat.color;
        card.innerHTML = `<h4 style="color:${cat.color}">${cat.icon} ${cat.name}（${catStores.length}家）</h4>
            <div class="cat-stat-row"><span class="label">营业面积</span><span class="value">${catArea} m²</span></div>
            <div class="cat-stat-row"><span class="label">销售额</span><span class="value">¥${formatCurrency(catSales)}</span></div>
            <div class="cat-stat-row"><span class="label">客流量</span><span class="value">${formatNumber(catVisitors)}</span></div>
            <div class="cat-stat-row"><span class="label">转化率</span><span class="value">${conv}%</span></div>
            <div class="cat-stat-row"><span class="label">坪效</span><span class="value">¥${formatCurrency(avgRevPerSqm)}/m²</span></div>`;
        row.appendChild(card);
    });

    // 图表
    const pieData = categoryList.map(cat => {
        const catStores = storeList.filter(s => s.category === cat.name);
        let s = 0; dates.forEach(date => { catStores.forEach(st => { const d = dailyData[date]?.[st.id]; if (d?.reported) s += d.sales; }); }); return s;
    });
    if (charts.dashCategory) charts.dashCategory.destroy();
    charts.dashCategory = new Chart(document.getElementById('chart-dash-category'), {
        type: 'doughnut',
        data: { labels: categoryList.map(c => c.name), datasets: [{ data: pieData, backgroundColor: categoryList.map(c => c.color), borderWidth: 2, borderColor: '#fff' }] },
        options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
    });

    const last7 = dates.slice(-7);
    const trendVals = last7.map(date => { let t = 0; storeList.forEach(s => { const d = dailyData[date]?.[s.id]; if (d?.reported) t += d.sales; }); return t; });
    if (charts.dashTrend) charts.dashTrend.destroy();
    charts.dashTrend = new Chart(document.getElementById('chart-dash-trend'), {
        type: 'line',
        data: { labels: last7.map(d => d.slice(5)), datasets: [{ label: '总销售额', data: trendVals, borderColor: '#1677ff', backgroundColor: 'rgba(22,119,255,0.1)', fill: true, tension: 0.3, pointRadius: 4 }] },
        options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { ticks: { callback: v => '¥' + formatCurrency(v) } } } }
    });
}

// ========== 数据查询与下载 ==========

function initDataQuery() {
    // 填充业态下拉
    buildCategoryOptions(document.getElementById('dq-category'), true);
    // 默认当日
    document.getElementById('dq-preset').value = 'today';
    document.getElementById('dq-custom').classList.remove('visible');
    refreshDataQuery();
}

function handleDqPresetChange() {
    const preset = document.getElementById('dq-preset').value;
    const customEl = document.getElementById('dq-custom');
    if (preset === 'custom') {
        customEl.classList.add('visible');
        const today = new Date();
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        document.getElementById('dq-start').value = formatDate(monthStart);
        document.getElementById('dq-end').value = todayStr;
    } else {
        customEl.classList.remove('visible');
    }
    refreshDataQuery();
}

function getDqRange() {
    const preset = document.getElementById('dq-preset').value;
    if (preset === 'custom') {
        const s = document.getElementById('dq-start').value;
        const e = document.getElementById('dq-end').value;
        if (!s || !e) return getPeriodRange('today');
        return { start: new Date(s), end: new Date(e) };
    }
    return getPeriodRange(preset);
}

function refreshDataQuery() {
    const range = getDqRange();
    const dates = getDateRange(range.start, range.end);
    const catFilter = document.getElementById('dq-category').value || 'all';
    const search = (document.getElementById('dq-search').value || '').toLowerCase();
    const isSingleDay = dates.length === 1;

    const tbody = document.querySelector('#dq-table tbody');
    tbody.innerHTML = '';

    let totalSales = 0, totalVisitors = 0, totalBuyers = 0;
    let reportedCount = 0, unreportedCount = 0;

    storeList.filter(s => {
        if (catFilter !== 'all' && s.category !== catFilter) return false;
        if (search && !s.name.toLowerCase().includes(search) && !s.shopNo.toLowerCase().includes(search)) return false;
        return true;
    }).forEach(store => {
        let storeSales = 0, storeVisitors = 0, storeBuyers = 0;
        let hasData = false;
        dates.forEach(date => {
            const d = dailyData[date]?.[store.id];
            if (d?.reported) {
                storeSales += d.sales;
                storeVisitors += d.visitors;
                storeBuyers += d.buyers;
                hasData = true;
            }
        });

        const avgPrice = storeBuyers > 0 ? Math.round(storeSales / storeBuyers * 100) / 100 : 0;
        const conversion = storeVisitors > 0 ? Math.round(storeBuyers / storeVisitors * 10000) / 100 : 0;
        const efficiency = hasData && store.areaSize > 0 ? Math.round(storeSales / store.areaSize) : 0;
        const catObj = getCategoryByName(store.category);

        if (hasData) {
            reportedCount++;
            totalSales += storeSales;
            totalVisitors += storeVisitors;
            totalBuyers += storeBuyers;
        } else {
            unreportedCount++;
        }

        const tr = document.createElement('tr');
        if (!hasData) tr.className = 'row-unreported';
        tr.innerHTML = `
            <td><strong>${store.name}</strong></td>
            <td>${store.shopNo}</td>
            <td><span style="color:${catObj?.color || '#1677ff'}">${catObj?.icon || ''} ${store.category}</span></td>
            <td>${store.areaSize}</td>
            <td>${hasData ? '¥' + formatCurrency(storeSales) : '<span style="color:var(--danger)">未上报</span>'}</td>
            <td>${hasData ? storeVisitors : '--'}</td>
            <td>${hasData ? storeBuyers : '--'}</td>
            <td>${hasData ? '¥' + avgPrice : '--'}</td>
            <td>${hasData ? conversion + '%' : '--'}</td>
            <td>${hasData && store.areaSize > 0 ? '¥' + formatCurrency(efficiency) : '--'}</td>
            <td>${hasData ? '<span class="status-tag success">已上报</span>' : '<span class="status-tag warning">未上报</span>'}</td>`;
        tbody.appendChild(tr);
    });

    // 汇总信息
    const summary = document.getElementById('dq-summary');
    const totalConv = totalVisitors > 0 ? Math.round(totalBuyers / totalVisitors * 10000) / 100 : 0;
    summary.innerHTML = `
        <div class="dq-stat"><span class="label">已上报店铺</span><span class="value">${reportedCount} 家</span></div>
        <div class="dq-stat"><span class="label">未上报店铺</span><span class="value danger">${unreportedCount} 家</span></div>
        <div class="dq-stat"><span class="label">总销售额</span><span class="value">¥${formatCurrency(totalSales)}</span></div>
        <div class="dq-stat"><span class="label">总客流量</span><span class="value">${formatNumber(totalVisitors)}</span></div>
        <div class="dq-stat"><span class="label">总购买人次</span><span class="value">${formatNumber(totalBuyers)}</span></div>
        <div class="dq-stat"><span class="label">平均转化率</span><span class="value">${totalConv}%</span></div>`;
}

function downloadDataXLSX() {
    const range = getDqRange();
    const dates = getDateRange(range.start, range.end);
    const catFilter = document.getElementById('dq-category').value || 'all';
    const search = (document.getElementById('dq-search').value || '').toLowerCase();

    const rows = [];
    // 表头
    rows.push(['店铺名称', '商铺号', '业态', '面积(m²)', '销售额', '客流量', '购买人次', '客单价', '转化率(%)', '坪效(元/m²)', '状态', '店长', '联系电话']);

    storeList.filter(s => {
        if (catFilter !== 'all' && s.category !== catFilter) return false;
        if (search && !s.name.toLowerCase().includes(search) && !s.shopNo.toLowerCase().includes(search)) return false;
        return true;
    }).forEach(store => {
        let storeSales = 0, storeVisitors = 0, storeBuyers = 0;
        let hasData = false;
        dates.forEach(date => {
            const d = dailyData[date]?.[store.id];
            if (d?.reported) {
                storeSales += d.sales;
                storeVisitors += d.visitors;
                storeBuyers += d.buyers;
                hasData = true;
            }
        });
        const avgPrice = storeBuyers > 0 ? Math.round(storeSales / storeBuyers * 100) / 100 : 0;
        const conversion = storeVisitors > 0 ? Math.round(storeBuyers / storeVisitors * 10000) / 100 : 0;
        const efficiency = hasData && store.areaSize > 0 ? Math.round(storeSales / store.areaSize) : '';
        rows.push([
            store.name, store.shopNo, store.category, store.areaSize,
            hasData ? storeSales : '未上报',
            hasData ? storeVisitors : '',
            hasData ? storeBuyers : '',
            hasData ? avgPrice : '',
            hasData ? conversion : '',
            hasData ? efficiency : '',
            hasData ? '已上报' : '未上报',
            store.managerName, store.managerPhone
        ]);
    });

    // 汇总行
    let totalSales = 0, totalVisitors = 0, totalBuyers = 0, totalArea = 0;
    rows.slice(1).forEach(r => {
        if (typeof r[4] === 'number') { totalSales += r[4]; totalVisitors += r[5]; totalBuyers += r[6]; }
        if (typeof r[3] === 'number') totalArea += r[3];
    });
    const totalConv = totalVisitors > 0 ? Math.round(totalBuyers / totalVisitors * 10000) / 100 : 0;
    const totalEff = totalArea > 0 ? Math.round(totalSales / totalArea) : 0;
    rows.push([]);
    rows.push(['汇总', '', '', totalArea, totalSales, totalVisitors, totalBuyers, '', totalConv, totalEff, '', '', '']);

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 16 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 14 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 8 }, { wch: 10 }, { wch: 14 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '店铺数据');

    const dateLabel = dates.length === 1 ? dates[0] : `${dates[0]}_${dates[dates.length - 1]}`;
    XLSX.writeFile(wb, `店铺经营数据_${dateLabel}.xlsx`);
    showToast('数据已导出为 XLSX 文件', 'success');
}

// ========== 店铺管理 ==========

function refreshStoreGrid() {
    const catFilterEl = document.getElementById('store-category-filter');
    const catFilter = catFilterEl.value;
    buildCategoryOptions(catFilterEl, true);
    catFilterEl.value = catFilter || 'all';

    const search = document.getElementById('store-search').value.toLowerCase();
    const container = document.getElementById('store-grid');
    container.innerHTML = '';
    const todayData = dailyData[todayStr] || {};

    storeList.filter(s => {
        if (catFilter !== 'all' && s.category !== catFilter) return false;
        if (search && !s.name.toLowerCase().includes(search) && !s.shopNo.toLowerCase().includes(search)) return false;
        return true;
    }).forEach(store => {
        const d = todayData[store.id];
        const reported = d?.reported;
        const catObj = getCategoryByName(store.category);
        const catColor = catObj ? catObj.color : '#1677ff';
        const catIcon = catObj ? catObj.icon : '🏷';
        const card = document.createElement('div');
        card.className = `store-card ${catKey(store.category)}`;
        card.style.borderLeftColor = catColor;
        card.setAttribute('data-store-id', store.id);
        card.onclick = function() { showStoreEditModal(this.getAttribute('data-store-id')); };
        card.innerHTML = `
            <div class="store-card-header"><span class="store-card-name">${store.shopNo} · ${store.name}</span><span class="store-card-category" style="background:${catObj ? catObj.bgColor : '#e6f4ff'};color:${catColor}">${catIcon} ${store.category}</span></div>
            <div class="store-card-info">${store.areaSize}m² · ${store.area} · 店长：${store.managerName} (${store.managerPhone})</div>
            <div class="store-card-stats">
                <div class="store-stat-item"><span class="label">今日销售</span><span class="val">${reported ? '¥' + formatCurrency(d.sales) : '未上报'}</span></div>
                <div class="store-stat-item"><span class="label">今日客流</span><span class="val">${reported ? d.visitors + '人' : '--'}</span></div>
                <div class="store-stat-item"><span class="label">购买人次</span><span class="val">${reported ? d.buyers + '人' : '--'}</span></div>
                <div class="store-stat-item"><span class="label">转化率</span><span class="val">${reported ? d.conversion + '%' : '--'}</span></div>
            </div>
            <div class="store-card-footer"><span>${reported ? '✓ 已上报' : '⚠ 未上报'}</span><span>点击查看详情</span></div>`;
        container.appendChild(card);
    });
}

function filterStoreList() { refreshStoreGrid(); }

function showAddStoreModal() {
    document.getElementById('edit-store-id').value = '';
    document.getElementById('store-edit-title').textContent = '新增店铺';
    document.getElementById('edit-shop-no').value = '';
    document.getElementById('edit-store-name').value = '';
    populateAllCategorySelects();
    document.getElementById('edit-store-category').value = categoryList.length > 0 ? categoryList[0].name : '';
    document.getElementById('edit-store-area').value = 'A区';
    document.getElementById('edit-store-area-size').value = '';
    document.getElementById('edit-store-manager').value = '';
    document.getElementById('edit-store-phone').value = '';
    document.getElementById('btn-delete-store').style.display = 'none';
    document.querySelector('#store-daily-data-table tbody').innerHTML = '';
    document.getElementById('modal-store-edit').classList.remove('hidden');
}

function showStoreEditModal(storeId) {
    const store = getStoreById(storeId);
    if (!store) {
        showToast('店铺不存在', 'error');
        return;
    }
    // 确保隐藏字段设置为正确的 storeId
    document.getElementById('edit-store-id').value = storeId;
    populateAllCategorySelects();
    document.getElementById('store-edit-title').textContent = `店铺信息 · ${store.name}`;
    document.getElementById('edit-shop-no').value = store.shopNo;
    document.getElementById('edit-store-name').value = store.name;
    document.getElementById('edit-store-category').value = store.category;
    document.getElementById('edit-store-area').value = store.area;
    document.getElementById('edit-store-area-size').value = store.areaSize;
    document.getElementById('edit-store-manager').value = store.managerName;
    document.getElementById('edit-store-phone').value = store.managerPhone;
    document.getElementById('btn-delete-store').style.display = '';
    document.getElementById('store-data-start').value = formatDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
    document.getElementById('store-data-end').value = todayStr;
    queryStoreDailyData();
    document.getElementById('modal-store-edit').classList.remove('hidden');
}

function hideStoreEditModal() { document.getElementById('modal-store-edit').classList.add('hidden'); }

async function saveStoreEdit() {
    const id = document.getElementById('edit-store-id').value;
    const shopNo = document.getElementById('edit-shop-no').value.trim();
    const name = document.getElementById('edit-store-name').value.trim();
    const category = document.getElementById('edit-store-category').value;
    const area = document.getElementById('edit-store-area').value.trim();
    const areaSize = parseInt(document.getElementById('edit-store-area-size').value) || 0;
    const managerName = document.getElementById('edit-store-manager').value.trim();
    const managerPhone = document.getElementById('edit-store-phone').value.trim();

    // 必填校验（新增时全部必填）
    if (!id) {
        if (!shopNo) { showToast('商铺号不能为空', 'error'); return; }
        if (!name) { showToast('店铺名称不能为空', 'error'); return; }
        if (!category) { showToast('请选择业态', 'error'); return; }
        if (!area) { showToast('所在区域不能为空', 'error'); return; }
        if (!areaSize || areaSize <= 0) { showToast('面积必须大于0', 'error'); return; }
        if (!managerName) { showToast('店长姓名不能为空', 'error'); return; }
        if (!managerPhone) { showToast('联系电话不能为空', 'error'); return; }
        if (!/^1\d{10}$/.test(managerPhone)) { showToast('手机号格式不正确', 'error'); return; }
        // 检查商铺号是否重复
        const dupShop = storeList.find(s => s.shopNo === shopNo);
        if (dupShop) { showToast(`商铺号「${shopNo}」已存在（${dupShop.name}），请使用其他商铺号`, 'error'); return; }
    } else {
        if (!shopNo || !name) { showToast('商铺号和店铺名称必填', 'error'); return; }
        if (managerPhone && !/^1\d{10}$/.test(managerPhone)) { showToast('手机号格式不正确', 'error'); return; }
    }

    const storePayload = { shopNo, name, category, area, areaSize, managerName, managerPhone };

    if (id) {
        const store = getStoreById(id);
        const oldPhone = store.managerPhone;
        Object.assign(store, { shopNo, name, category, area, areaSize, managerName, managerPhone });
        if (oldPhone !== managerPhone) {
            const oldIdx = managerAccounts.findIndex(m => m.phone === oldPhone);
            if (oldIdx >= 0) managerAccounts.splice(oldIdx, 1);
            if (managerPhone) {
                managerAccounts.push({ phone: managerPhone, name: managerName, storeId: id, password: '123456' });
            }
        }
        // 调用精细API更新
        if (typeof API !== 'undefined' && API.getToken()) {
            API.updateStore(id, storePayload).catch(e => console.warn('API更新店铺失败:', e));
        }
    } else {
        let newId;
        // 调用精细API创建
        if (typeof API !== 'undefined' && API.getToken()) {
            try {
                const result = await API.createStore(storePayload);
                newId = result.id;
            } catch (e) {
                console.warn('API创建店铺失败:', e);
                newId = generateStoreId();
            }
        } else {
            newId = generateStoreId();
        }
        const baseSales = 10000;
        storeList.push({ id: newId, shopNo, name, category, area, areaSize, managerName, managerPhone, baseSales, baseVisitors: 100, baseBuyers: 60 });
        if (managerPhone) {
            managerAccounts.push({ phone: managerPhone, name: managerName, storeId: newId, password: '123456' });
        }
        // 注意：不再自动生成模拟历史数据，新店铺从零开始
    }
    saveAllData();
    hideStoreEditModal();
    refreshStoreGrid();
    populateStoreSelects();
    showToast('店铺信息保存成功', 'success');
}

async function deleteStore() {
    const id = document.getElementById('edit-store-id').value;
    if (!id) return;
    const store = getStoreById(id);
    if (!store) return;
    if (!confirm(`确定要删除「${store.name}」吗？\n该店铺的所有历史数据将一并删除，此操作不可撤销。`)) return;

    // 调用精细API从服务器删除
    if (typeof API !== 'undefined' && API.getToken()) {
        try {
            await API.deleteStore(id);
        } catch (e) {
            showToast('服务器删除失败: ' + e.message, 'error');
            console.error('API删除店铺失败:', e);
            return;
        }
    }

    const idx = storeList.findIndex(s => s.id === id);
    if (idx >= 0) {
        storeList.splice(idx, 1);
        const mgrIdx = managerAccounts.findIndex(m => m.storeId === id);
        if (mgrIdx >= 0) managerAccounts.splice(mgrIdx, 1);
        Object.keys(dailyData).forEach(date => { delete dailyData[date][id]; });
    }
    saveAllData();
    hideStoreEditModal();
    refreshStoreGrid();
    populateStoreSelects();
    showToast('店铺已删除', 'success');
}

// 查询店铺每日数据
function queryStoreDailyData() {
    const storeId = document.getElementById('edit-store-id').value;
    if (!storeId) return;
    const start = document.getElementById('store-data-start').value;
    const end = document.getElementById('store-data-end').value;
    if (!start || !end) { showToast('请选择日期范围', 'error'); return; }
    const dates = getDateRange(new Date(start), new Date(end));
    const tbody = document.querySelector('#store-daily-data-table tbody');
    tbody.innerHTML = '';
    dates.reverse().forEach(date => {
        const d = dailyData[date]?.[storeId];
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${date}</td>
            <td>${d ? '¥' + formatCurrency(d.sales) : '--'}</td>
            <td>${d ? d.visitors : '--'}</td>
            <td>${d ? d.buyers : '--'}</td>
            <td>${d ? '¥' + d.avgPrice : '--'}</td>
            <td>${d ? d.conversion + '%' : '--'}</td>
            <td>${d ? `<button class="btn-table" onclick="showAdminEditDataModal('${storeId}','${date}')">修改</button>` : ''}</td>`;
        tbody.appendChild(tr);
    });
}

function showAdminEditDataModal(storeId, date) {
    const d = dailyData[date]?.[storeId];
    if (!d) { showToast('该日无数据，无法修改', 'error'); return; }
    const store = getStoreById(storeId);
    document.getElementById('admin-edit-store-id').value = storeId;
    document.getElementById('admin-edit-date').value = date;
    document.getElementById('admin-edit-data-title').textContent = `修改 ${store.name} ${date} 的数据`;
    document.getElementById('admin-edit-sales').value = d.sales;
    document.getElementById('admin-edit-visitors').value = d.visitors;
    document.getElementById('admin-edit-buyers').value = d.buyers;
    document.getElementById('admin-edit-notes').value = d.notes || '';
    calcAdminEditAutoFields();
    document.getElementById('modal-admin-edit-data').classList.remove('hidden');
}

function calcAdminEditAutoFields() {
    const s = parseFloat(document.getElementById('admin-edit-sales').value) || 0;
    const v = parseInt(document.getElementById('admin-edit-visitors').value) || 0;
    const b = parseInt(document.getElementById('admin-edit-buyers').value) || 0;
    document.getElementById('admin-edit-avg-price').value = (s > 0 && b > 0) ? Math.round(s / b * 100) / 100 : '';
    document.getElementById('admin-edit-conversion').value = (v > 0 && b > 0) ? Math.round(b / v * 10000) / 100 : '';
}

async function saveAdminEditData() {
    const storeId = document.getElementById('admin-edit-store-id').value;
    const date = document.getElementById('admin-edit-date').value;
    const sales = parseFloat(document.getElementById('admin-edit-sales').value) || 0;
    const visitors = parseInt(document.getElementById('admin-edit-visitors').value) || 0;
    const buyers = parseInt(document.getElementById('admin-edit-buyers').value) || 0;
    const notes = document.getElementById('admin-edit-notes').value.trim();

    if (!sales || sales <= 0) { showToast('销售额必须大于0', 'error'); return; }
    if (!visitors || visitors <= 0) { showToast('客流量必须大于0', 'error'); return; }
    if (!buyers || buyers <= 0) { showToast('购买人次必须大于0', 'error'); return; }

    dailyData[date][storeId] = {
        sales, visitors, buyers,
        avgPrice: Math.round(sales / buyers * 100) / 100,
        conversion: Math.round(buyers / visitors * 10000) / 100,
        notes, reported: true
    };

    // 调用精细API更新数据
    if (typeof API !== 'undefined' && API.getToken()) {
        try {
            await API.updateDailyData(storeId, date, { sales, visitors, buyers, notes });
        } catch (e) { console.error('API更新数据失败:', e); }
    }
    saveAllData();
    hideAdminEditDataModal();
    queryStoreDailyData();
    showToast('数据修改成功', 'success');
}

function hideAdminEditDataModal() { document.getElementById('modal-admin-edit-data').classList.add('hidden'); }

// ========== 管理员修改密码 ==========

function showAdminChangePassword() { document.getElementById('modal-admin-change-password').classList.remove('hidden'); }
function hideAdminChangePassword() { document.getElementById('modal-admin-change-password').classList.add('hidden'); }

async function adminChangePassword() {
    const oldPwd = document.getElementById('admin-old-password').value;
    const newPwd = document.getElementById('admin-new-password').value;
    const confirmPwd = document.getElementById('admin-confirm-password').value;

    if (newPwd.length < 6) { showToast('新密码至少6位', 'error'); return; }
    if (newPwd !== confirmPwd) { showToast('两次输入的新密码不一致', 'error'); return; }

    // 优先尝试 API
    if (typeof API !== 'undefined' && API.getToken()) {
        try {
            await API.changePassword(oldPwd, newPwd);
            hideAdminChangePassword();
            showToast('管理员密码修改成功', 'success');
            return;
        } catch (e) {
            showToast(e.message || '修改失败', 'error');
            return;
        }
    }

    // 离线回退
    if (oldPwd !== (_adminPasswordPlain || adminPassword || 'admin123')) { showToast('当前密码错误', 'error'); return; }
    adminPassword = newPwd;
    if (typeof _adminPasswordPlain !== 'undefined') _adminPasswordPlain = newPwd;
    saveAllData();
    hideAdminChangePassword();
    showToast('管理员密码修改成功', 'success');
    document.getElementById('admin-old-password').value = '';
    document.getElementById('admin-new-password').value = '';
    document.getElementById('admin-confirm-password').value = '';
}

// ========== 数据分析 ==========

function refreshAnalysis() {
    const storeId = document.getElementById('analysis-store').value;
    const metric = document.getElementById('analysis-metric').value;
    const range = getTimeFilterRange('analysis-time-filter');
    const dates = getDateRange(range.start, range.end);
    const metricLabels = { sales: '销售额', visitors: '客流量', buyers: '购买人次', avgPrice: '客单价', conversion: '转化率', efficiency: '坪效' };
    const storeName = storeId === 'all' ? '全部店铺' : categoryList.some(c => c.name === storeId) ? storeId + '汇总' : getStoreById(storeId)?.name;

    document.getElementById('analysis-chart-title').textContent = `${storeName} · ${metricLabels[metric]} · ${getTimeFilterLabel('analysis-time-filter')}`;

    const values = dates.map(date => getMetricSum(date, storeId, metric));
    const ma7 = values.map((v, i) => i < 6 ? null : values.slice(i-6, i+1).reduce((a,b) => a+b, 0) / 7);

    if (charts.analysisTrend) charts.analysisTrend.destroy();
    charts.analysisTrend = new Chart(document.getElementById('chart-analysis-trend'), {
        type: 'line',
        data: { labels: dates.map(d => d.slice(5)), datasets: [{ label: metricLabels[metric], data: values, borderColor: '#1677ff', backgroundColor: 'rgba(22,119,255,0.05)', fill: true, tension: 0.2, pointRadius: 2 }, { label: '7日均线', data: ma7, borderColor: '#ff6b6b', borderDash: [5,3], tension: 0.4, pointRadius: 0, fill: false }] },
        options: { responsive: true, plugins: { legend: { position: 'bottom' } }, scales: { y: { beginAtZero: metric === 'conversion' } } }
    });

    const last14 = dates.slice(-14);
    const distData = last14.map(date => getMetricSum(date, storeId, metric));
    const avg = distData.reduce((a,b) => a+b, 0) / distData.length;
    if (charts.analysisDist) charts.analysisDist.destroy();
    charts.analysisDist = new Chart(document.getElementById('chart-analysis-distribution'), {
        type: 'bar',
        data: { labels: last14.map(d => d.slice(5)), datasets: [{ data: distData, backgroundColor: distData.map(v => v < avg*0.7 ? '#ff4d4f' : v > avg*1.3 ? '#52c41a' : '#1677ff'), borderRadius: 4 }] },
        options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
    });

    const prev = getPrevPeriodRange(range.start, range.end);
    const thisWeek = dates.slice(-7);
    const lastWeek = getDateRange(prev.start, prev.end).slice(-7);
    if (charts.analysisCompare) charts.analysisCompare.destroy();
    charts.analysisCompare = new Chart(document.getElementById('chart-analysis-compare'), {
        type: 'bar',
        data: { labels: ['周一','周二','周三','周四','周五','周六','周日'].slice(0,7), datasets: [{ label: '本期', data: thisWeek.map(d => getMetricSum(d, storeId, metric)), backgroundColor: '#1677ff', borderRadius: 4 }, { label: '上期', data: lastWeek.map(d => getMetricSum(d, storeId, metric)), backgroundColor: '#1677ff50', borderRadius: 4 }] },
        options: { responsive: true, plugins: { legend: { position: 'bottom' } }, scales: { y: { beginAtZero: true } } }
    });

    const valid = values.filter(v => v > 0);
    const avgVal = valid.length ? valid.reduce((a,b) => a+b, 0) / valid.length : 0;
    const maxVal = Math.max(...valid, 0);
    const minVal = Math.min(...valid, 0);
    const stdDev = valid.length > 1 ? Math.sqrt(valid.reduce((s,v) => s + Math.pow(v-avgVal,2), 0) / valid.length) : 0;
    const sc = document.getElementById('analysis-stats');
    const isMoney = metric === 'sales' || metric === 'efficiency';
    const unit = metric === 'efficiency' ? '/m²' : '';
    sc.innerHTML = `
        <div class="analysis-stat-card"><div class="label">平均值</div><div class="value">${isMoney ? '¥' + formatCurrency(Math.round(avgVal)) + unit : metric === 'conversion' ? avgVal.toFixed(2) + '%' : formatNumber(Math.round(avgVal))}</div></div>
        <div class="analysis-stat-card"><div class="label">最大值</div><div class="value">${isMoney ? '¥' + formatCurrency(maxVal) + unit : formatNumber(maxVal)}</div></div>
        <div class="analysis-stat-card"><div class="label">最小值</div><div class="value">${isMoney ? '¥' + formatCurrency(minVal) + unit : formatNumber(minVal)}</div></div>
        <div class="analysis-stat-card"><div class="label">标准差</div><div class="value">${isMoney ? '¥' + formatCurrency(Math.round(stdDev)) + unit : formatNumber(Math.round(stdDev))}</div><div class="sub">越小越稳定</div></div>`;
}

// ========== 对比排名 ==========

function refreshCompare() {
    const compareCatEl = document.getElementById('compare-category');
    const compareCat = compareCatEl.value;
    buildCategoryOptions(compareCatEl, true);
    compareCatEl.value = compareCat || 'all';

    const metric = document.getElementById('compare-metric').value;
    const category = compareCatEl.value;
    const range = getTimeFilterRange('compare-time-filter');
    const dates = getDateRange(range.start, range.end);
    const prev = getPrevPeriodRange(range.start, range.end);
    const prevDates = getDateRange(prev.start, prev.end);
    const metricLabels = { sales: '销售额', visitors: '客流量', buyers: '购买人次', avgPrice: '客单价', conversion: '转化率', efficiency: '坪效' };

    let storeData = storeList.filter(s => category === 'all' || s.category === category).map(store => {
        let current, prevVal;
        if (metric === 'efficiency') {
            let currSales = 0, prevSales = 0, cntCurr = 0, cntPrev = 0;
            dates.forEach(date => { const d = dailyData[date]?.[store.id]; if (d?.reported) { currSales += d.sales; cntCurr++; } });
            prevDates.forEach(date => { const d = dailyData[date]?.[store.id]; if (d) { prevSales += d.sales; cntPrev++; } });
            const area = store.areaSize || 0;
            const avgDailyCurr = cntCurr > 0 ? currSales / cntCurr : 0;
            const avgDailyPrev = cntPrev > 0 ? prevSales / cntPrev : 0;
            current = area > 0 ? Math.round(avgDailyCurr / area) : 0;
            prevVal = area > 0 ? Math.round(avgDailyPrev / area) : 0;
        } else {
            let currSum = 0, prevSum = 0, cntCurr = 0, cntPrev = 0;
            dates.forEach(date => { const d = dailyData[date]?.[store.id]; if (d?.reported) { currSum += d[metric]; cntCurr++; } });
            prevDates.forEach(date => { const d = dailyData[date]?.[store.id]; if (d) { prevSum += d[metric]; cntPrev++; } });
            current = cntCurr > 0 ? Math.round(currSum / cntCurr) : 0;
            prevVal = cntPrev > 0 ? Math.round(prevSum / cntPrev) : 0;
        }
        return { store, current, prev: prevVal, change: prevVal > 0 ? ((current - prevVal) / prevVal * 100) : 0 };
    });
    storeData.sort((a,b) => b.current - a.current);

    const top20 = storeData.slice(0, 20);
    if (charts.compareRanking) charts.compareRanking.destroy();
    charts.compareRanking = new Chart(document.getElementById('chart-compare-ranking'), {
        type: 'bar',
        data: { labels: top20.map(s => s.store.name), datasets: [{ data: top20.map(s => s.current), backgroundColor: top20.map((s,i) => i===0?'#ffd700':i===1?'#c0c0c0':i===2?'#cd7f32':(getCategoryByName(s.store.category)?.color||'#1677ff')), borderRadius: 4 }] },
        options: { responsive: true, indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true } } }
    });

    const tbody = document.querySelector('#ranking-table tbody');
    tbody.innerHTML = '';
    storeData.forEach((s,i) => {
        const tr = document.createElement('tr');
        const changeClass = s.change > 2 ? 'change-up' : s.change < -2 ? 'change-down' : 'change-flat';
        tr.innerHTML = `<td><span class="rank-badge ${i<3?'rank-'+(i+1):'rank-other'}">${i+1}</span></td><td>${s.store.name}</td><td>${s.store.category}</td><td>${(metric==='sales'||metric==='efficiency')?'¥'+formatCurrency(s.current):formatNumber(s.current)}</td><td><span class="${changeClass}">${s.change>2?'↑':s.change<-2?'↓':'→'} ${Math.abs(s.change).toFixed(1)}%</span></td>`;
        tbody.appendChild(tr);
    });
}

// ========== 趋势追踪 ==========

function refreshTrend() {
    const storeId = document.getElementById('trend-store').value;
    const metric = document.getElementById('trend-metric').value;
    const range = getTimeFilterRange('trend-time-filter');
    const dates = getDateRange(range.start, range.end);
    const metricLabels = { sales: '销售额', visitors: '客流量', buyers: '购买人次', avgPrice: '客单价', conversion: '转化率', efficiency: '坪效' };
    const storeName = storeId === 'all' ? '全部店铺汇总' : getStoreById(storeId)?.name || storeId;

    document.getElementById('trend-chart-title').textContent = `${storeName} · ${metricLabels[metric]}趋势 · ${getTimeFilterLabel('trend-time-filter')}`;

    const values = dates.map(date => getMetricSum(date, storeId, metric));
    const ma7 = values.map((v,i) => i<6 ? null : values.slice(i-6,i+1).reduce((a,b)=>a+b,0)/7);

    if (charts.trendMain) charts.trendMain.destroy();
    charts.trendMain = new Chart(document.getElementById('chart-trend-main'), {
        type: 'line',
        data: { labels: dates.map(d => d.slice(5)), datasets: [{ label: metricLabels[metric], data: values, borderColor: '#1677ff', backgroundColor: 'rgba(22,119,255,0.05)', fill: true, tension: 0.2, pointRadius: 2 }, { label: '7日均线', data: ma7, borderColor: '#ff6b6b', borderDash: [5,3], tension: 0.4, pointRadius: 0, fill: false }] },
        options: { responsive: true, plugins: { legend: { position: 'bottom' } }, scales: { y: { beginAtZero: metric === 'conversion' } } }
    });

    const valid = values.filter(v => v > 0);
    const avg = valid.length ? valid.reduce((a,b) => a+b, 0) / valid.length : 0;
    const recent7Avg = values.slice(-7).filter(v => v > 0).reduce((a,b)=>a+b,0) / Math.max(1, values.slice(-7).filter(v => v > 0).length);
    const earlier7Avg = values.slice(-14,-7).filter(v => v > 0).reduce((a,b)=>a+b,0) / Math.max(1, values.slice(-14,-7).filter(v => v > 0).length);
    const trendPct = earlier7Avg > 0 ? ((recent7Avg - earlier7Avg) / earlier7Avg * 100) : 0;
    const maxVal = Math.max(...valid, 0);
    const minVal = Math.min(...valid, 0);
    const maxDate = dates[values.indexOf(maxVal)] || '--';
    const minDate = dates[values.indexOf(minVal)] || '--';

    const isMoneyT = metric === 'sales' || metric === 'efficiency';
    document.getElementById('trend-insights').innerHTML = `<h3>经营洞察</h3><div class="insight-grid">
        <div class="insight-card ${trendPct>5?'positive':trendPct<-5?'negative':'neutral'}"><div class="insight-label">趋势方向</div><div class="insight-value">${trendPct>5?'↑ 上升':trendPct<-5?'↓ 下降':'→ 平稳'}</div><div class="insight-desc">近7日较前7日变化 ${trendPct.toFixed(1)}%</div></div>
        <div class="insight-card positive"><div class="insight-label">峰值</div><div class="insight-value">${isMoneyT?'¥'+formatCurrency(maxVal):formatNumber(maxVal)}</div><div class="insight-desc">出现于 ${maxDate.slice(5)}</div></div>
        <div class="insight-card negative"><div class="insight-label">谷值</div><div class="insight-value">${isMoneyT?'¥'+formatCurrency(minVal):formatNumber(minVal)}</div><div class="insight-desc">出现于 ${minDate.slice(5)}</div></div></div>`;
}

// ========== 异常预警（含未上报数据） ==========

function detectAlerts() {
    const alerts = [];
    const yesterday = formatDate(new Date(Date.now() - 86400000));
    storeList.forEach(store => {
        const td = dailyData[todayStr]?.[store.id];
        const yd = dailyData[yesterday]?.[store.id];
        if (!td?.reported) return;
        const catObj = getCategoryByName(store.category);
        const volatility = catObj ? (catObj.volatility || 0.20) : 0.20;
        if (td.sales < store.baseSales * (1 - volatility)) alerts.push({ level: 'high', store, desc: `销售额异常偏低，仅为正常水平的${Math.round(td.sales/store.baseSales*100)}%`, metric: `今日 ¥${formatCurrency(td.sales)} / 正常 ¥${formatCurrency(store.baseSales)}`, time: todayStr });
        if (yd?.reported) {
            const sc = (td.sales - yd.sales) / yd.sales;
            if (sc < -0.3) alerts.push({ level: 'medium', store, desc: `销售额日环比下降 ${Math.abs(sc*100).toFixed(1)}%`, metric: `昨日 ¥${formatCurrency(yd.sales)} → 今日 ¥${formatCurrency(td.sales)}`, time: todayStr });
        }
        if (td.conversion < 15 && store.category !== '特色零售') alerts.push({ level: 'medium', store, desc: `转化率仅 ${td.conversion}%`, metric: `客流 ${td.visitors} / 购买 ${td.buyers}`, time: todayStr });
        if (td.visitors > store.baseVisitors * 1.5) alerts.push({ level: 'low', store, desc: `客流量增长 ${Math.round((td.visitors/store.baseVisitors-1)*100)}%`, metric: `今日 ${td.visitors} / 常日均 ${store.baseVisitors}`, time: todayStr });
    });
    return alerts.sort((a,b) => ({high:0,medium:1,low:2}[a.level]) - ({high:0,medium:1,low:2}[b.level]));
}

function detectUnreported() {
    // 扫描近7天的未上报数据
    const result = [];
    const daysToCheck = 7;
    const todayDate = new Date();

    storeList.forEach(store => {
        const missingDates = [];
        for (let d = 0; d < daysToCheck; d++) {
            const date = new Date(todayDate);
            date.setDate(date.getDate() - d);
            const dateStr = formatDate(date);
            const dayData = dailyData[dateStr]?.[store.id];
            if (!dayData || !dayData.reported) {
                missingDates.push(dateStr);
            }
        }
        if (missingDates.length > 0) {
            result.push({
                store,
                missingDates,
                missingCount: missingDates.length,
                level: missingDates.length >= 3 ? 'high' : missingDates.length >= 2 ? 'medium' : 'low'
            });
        }
    });

    return result.sort((a,b) => b.missingCount - a.missingCount);
}

function refreshAlerts() {
    const typeFilter = document.getElementById('alert-type').value;
    const levelFilter = document.getElementById('alert-level').value;

    // 未上报数据面板
    const unreportedPanel = document.getElementById('unreported-panel');
    const alertListEl = document.getElementById('alert-list');
    const feedbackPanel = document.getElementById('feedback-panel');
    const alertLevelEl = document.getElementById('alert-level');

    // 店长反馈面板单独处理
    if (typeFilter === 'feedback') {
        unreportedPanel.style.display = 'none';
        alertListEl.style.display = 'none';
        feedbackPanel.style.display = 'block';
        alertLevelEl.style.display = 'none';
        refreshFeedback();
        return;
    }

    feedbackPanel.style.display = 'none';
    alertLevelEl.style.display = '';
    unreportedPanel.style.display = (typeFilter === 'all' || typeFilter === 'unreported') ? 'block' : 'none';
    alertListEl.style.display = (typeFilter === 'all' || typeFilter === 'abnormal') ? 'flex' : 'none';

    // 渲染未上报数据
    if (unreportedPanel.style.display !== 'none') {
        const unrepData = detectUnreported().filter(u => levelFilter === 'all' || u.level === levelFilter);
        const summaryEl = document.getElementById('unreported-summary');
        const totalMissing = unrepData.reduce((s, u) => s + u.missingCount, 0);
        summaryEl.innerHTML = `<div class="unrep-summary-row"><span class="unrep-total-label">未上报店铺数</span><span class="unrep-total-value">${unrepData.length} 家</span><span class="unrep-total-label">缺失上报总天数</span><span class="unrep-total-value">${totalMissing} 天</span></div>`;

        const tbody = document.querySelector('#unreported-table tbody');
        tbody.innerHTML = '';
        unrepData.forEach(u => {
            const catObj = getCategoryByName(u.store.category);
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${u.store.name}</strong></td>
                <td><span style="color:${catObj?.color || '#1677ff'}">${catObj?.icon || ''} ${u.store.category}</span></td>
                <td>${u.store.managerName}</td>
                <td>${u.store.managerPhone}</td>
                <td><span class="missing-dates">${u.missingDates.map(d => d.slice(5)).join('、')}</span></td>
                <td><span class="alert-level-badge alert-${u.level}">${u.level==='high'?'高风险':u.level==='medium'?'中风险':'关注'}</span> ${u.missingCount}天</td>`;
            tbody.appendChild(tr);
        });
        if (!unrepData.length) {
            summaryEl.innerHTML = '<div style="text-align:center;padding:20px;color:#52c41a;font-size:15px;">近7日所有店铺均已上报 ✓</div>';
        }
    }

    // 渲染异常预警
    if (alertListEl.style.display !== 'none') {
        const alerts = detectAlerts().filter(a => levelFilter === 'all' || a.level === levelFilter);
        alertListEl.innerHTML = '';
        if (!alerts.length) { alertListEl.innerHTML = '<div style="text-align:center;padding:40px;color:#999;">暂无数据异常预警 ✓</div>'; return; }
        alerts.forEach(a => {
            const sn = a.store ? a.store.name : '系统提醒';
            const cat = a.store ? a.store.category : '';
            const catObj = a.store ? getCategoryByName(cat) : null;
            const catIcon = catObj ? catObj.icon : '';
            const item = document.createElement('div'); item.className = 'alert-item';
            item.innerHTML = `<span class="alert-level-badge alert-${a.level}">${a.level==='high'?'高风险':a.level==='medium'?'中风险':'关注'}</span><div class="alert-content"><div class="alert-store">${sn} ${cat?catIcon+' · '+cat:''}</div><div class="alert-desc">${a.desc}</div><div class="alert-metric">${a.metric}</div><div class="alert-time">${a.time}</div></div>`;
            alertListEl.appendChild(item);
        });
    }
}

// ========== 店长反馈 ==========

function refreshFeedback() {
    const start = document.getElementById('feedback-start').value;
    const end = document.getElementById('feedback-end').value;
    const search = (document.getElementById('feedback-search').value || '').toLowerCase();

    // 默认查近30天
    let startDate, endDate;
    if (start && end) {
        startDate = new Date(start);
        endDate = new Date(end);
    } else {
        endDate = new Date();
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
        document.getElementById('feedback-start').value = formatDate(startDate);
        document.getElementById('feedback-end').value = formatDate(endDate);
    }

    const dates = getDateRange(startDate, endDate);
    const feedbackList = [];

    dates.reverse().forEach(date => {
        const dayData = dailyData[date];
        if (!dayData) return;
        storeList.forEach(store => {
            const d = dayData[store.id];
            if (d && d.reported && d.notes && d.notes.trim()) {
                if (search && !store.name.toLowerCase().includes(search)) return;
                const catObj = getCategoryByName(store.category);
                feedbackList.push({
                    date, store, catObj, notes: d.notes.trim()
                });
            }
        });
    });

    // 渲染汇总
    const summary = document.getElementById('feedback-summary');
    if (feedbackList.length === 0) {
        summary.innerHTML = '<div style="text-align:center;padding:16px;color:var(--text-muted);">该时间段内暂无店长反馈记录</div>';
        document.querySelector('#feedback-table tbody').innerHTML = '';
        return;
    }

    summary.innerHTML = `<span>共 <strong style="color:var(--primary);font-size:16px;">${feedbackList.length}</strong> 条反馈记录 · 涉及 <strong>${new Set(feedbackList.map(f => f.store.id)).size}</strong> 家店铺</span>`;

    const tbody = document.querySelector('#feedback-table tbody');
    tbody.innerHTML = '';
    feedbackList.forEach(f => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${f.date}</td>
            <td><strong>${f.store.name}</strong></td>
            <td><span style="color:${f.catObj?.color || '#1677ff'}">${f.catObj?.icon || ''} ${f.store.category}</span></td>
            <td>${f.store.managerName}</td>
            <td>${f.store.managerPhone}</td>
            <td><div class="feedback-note">${f.notes}</div></td>`;
        tbody.appendChild(tr);
    });
}

// ========== 初始化 ==========

document.addEventListener('DOMContentLoaded', async () => {
    // 首先加载数据
    await initAppData();
    // 限制所有日期输入框不能超过今日
    setDateInputMax();
    // 设置默认日期
    if (document.getElementById('report-date')) {
        document.getElementById('report-date').value = todayStr;
    }

    // 自动恢复登录状态（从sessionStorage恢复）
    const savedUser = sessionStorage.getItem('sm_user');
    const savedPage = sessionStorage.getItem('sm_page');
    const token = typeof API !== 'undefined' ? API.getToken() : null;

    if (savedUser && token) {
        try {
            currentUser = JSON.parse(savedUser);
            if (savedPage) showPage(savedPage);
            if (currentUser.role === 'admin') {
                initAdminPage();
                const savedSection = sessionStorage.getItem('sm_section') || 'dashboard';
                switchSection(savedSection);
            } else if (currentUser.role === 'store') {
                initStorePage();
            }
        } catch (e) {
            sessionStorage.removeItem('sm_user');
            sessionStorage.removeItem('sm_page');
        }
    }
});

// ========== 一键清空所有店铺 ==========
async function resetAllStores() {
    if (!confirm('⚠️ 此操作不可撤销！\n\n确定要删除所有店铺信息吗？\n这将清空：\n- 所有店铺资料\n- 所有店长账号\n- 所有经营数据\n\n业态分类和管理员账号将被保留。')) return;

    if (typeof API !== 'undefined' && API.getToken()) {
        try {
            await API.resetAll();
            // 同步清除前端内存
            storeList = [];
            managerAccounts = [];
            dailyData = {};
            saveAllData();
            refreshStoreGrid();
            populateStoreSelects();
            showToast('已清空所有店铺数据', 'success');
        } catch (e) {
            showToast('清空失败: ' + e.message, 'error');
        }
    } else {
        // 离线模式：直接清空本地数据
        storeList = [];
        managerAccounts = [];
        dailyData = {};
        saveAllData();
        refreshStoreGrid();
        populateStoreSelects();
        showToast('已清空本地数据（离线模式）', 'success');
    }
}
