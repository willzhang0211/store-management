// ========== 手机端应用逻辑 ==========

let mCurrentUser = null;
let mCharts = {};
let mEditTarget = null; // 'store' | 'admin'
const mTodayStr = formatDate(new Date());

// ========== 通用 ==========

function mToast(msg, type = 'info') {
    const c = document.getElementById('m-toast-container');
    const t = document.createElement('div');
    t.className = `m-toast ${type}`;
    t.textContent = msg;
    c.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity 0.3s'; setTimeout(() => t.remove(), 300); }, 2500);
}

function mFmt(n) {
    if (n >= 100000000) return (n / 100000000).toFixed(2) + '亿';
    if (n >= 10000) return (n / 10000).toFixed(1) + '万';
    return n.toLocaleString('zh-CN');
}

// 货币格式化：保留完整数值 + 2位小数
function mFmtCurrency(n) {
    if (n == null || isNaN(n)) return '0.00';
    return Number(n).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// 万元格式化（用于看板总销售额汇总显示）
function mFmtWan(n) {
    if (n == null || isNaN(n)) return '0.00万元';
    return (n / 10000).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '万元';
}

function mShowPage(id) {
    document.querySelectorAll('.m-page').forEach(p => p.classList.remove('active'));
    document.getElementById(id).classList.add('active');
}

// 更新状态栏时间
function updatePhoneTime() {
    const now = new Date();
    document.getElementById('phone-time').textContent = `${now.getHours()}:${String(now.getMinutes()).padStart(2,'0')}`;
}
setInterval(updatePhoneTime, 1000);
updatePhoneTime();

// ========== 登录 ==========

function mSwitchLoginTab(role) {
    document.querySelectorAll('.m-tab').forEach(t => t.classList.remove('active'));
    document.querySelector(`.m-tab[data-role="${role}"]`).classList.add('active');
    document.getElementById('m-admin-form').classList.toggle('hidden', role !== 'admin');
    document.getElementById('m-store-form').classList.toggle('hidden', role !== 'store');
}

async function mHandleLogin(role) {
    let credentials;
    if (role === 'admin') {
        credentials = {
            username: document.getElementById('m-admin-user').value,
            password: document.getElementById('m-admin-pass').value
        };
    } else {
        credentials = {
            phone: document.getElementById('m-store-phone').value.trim(),
            password: document.getElementById('m-store-pass').value
        };
    }

    // 优先尝试 API 登录
    const apiResult = await apiLogin(role, credentials);
    if (apiResult.success) {
        mCurrentUser = apiResult.user;
        if (role === 'admin') {
            sessionStorage.setItem('sm_user_m', JSON.stringify(mCurrentUser));
            sessionStorage.setItem('sm_page_m', 'm-page-admin');
            mShowPage('m-page-admin');
            mInitAdmin();
            const savedTab = sessionStorage.getItem('sm_tab_m') || 'dashboard';
            mSwitchAdminTab(savedTab);
            mToast('欢迎进入管理后台', 'success');
        } else {
            // 店长登录：处理多店铺管理
            const phone = apiResult.user.phone || credentials.phone;
            const userStores = getManagerStores(phone) || [];
            if (userStores.length > 1) {
                mCurrentUser = { role: 'store', phone, storeIds: userStores.map(s => s.id), storeId: userStores[0].id };
            }
            sessionStorage.setItem('sm_user_m', JSON.stringify(mCurrentUser));
            sessionStorage.setItem('sm_page_m', 'm-page-store');
            mShowPage('m-page-store');
            mInitStore();
            mToast('登录成功', 'success');
        }
        return;
    }

    // API失败，回退本地登录
    const localResult = localLogin(role, credentials);
    if (localResult.success) {
        mCurrentUser = localResult.user;
        sessionStorage.setItem('sm_user_m', JSON.stringify(mCurrentUser));
        sessionStorage.setItem('sm_page_m', role === 'admin' ? 'm-page-admin' : 'm-page-store');
        if (role === 'admin') {
            mShowPage('m-page-admin');
            mInitAdmin();
            const savedTab = sessionStorage.getItem('sm_tab_m') || 'dashboard';
            mSwitchAdminTab(savedTab);
            mToast('欢迎进入管理后台（离线模式）', 'success');
        } else {
            mShowPage('m-page-store');
            mInitStore();
            mToast('登录成功（离线模式）', 'success');
        }
    } else {
        mToast(localResult.error || '登录失败', 'error');
    }
}

function mLogout() {
    mCurrentUser = null;
    if (typeof API !== 'undefined') API.logout();
    // 清除sessionStorage中的登录状态
    sessionStorage.removeItem('sm_user_m');
    sessionStorage.removeItem('sm_page_m');
    sessionStorage.removeItem('sm_tab_m');
    Object.values(mCharts).forEach(c => { if (c) c.destroy(); });
    mCharts = {};
    mShowPage('m-page-login');
}

// ========== 店长端 ==========

function mInitStore() {
    const userStores = getManagerStores(mCurrentUser.phone);
    if (userStores.length === 0) {
        mToast('店铺信息异常，请联系管理员', 'error');
        return;
    }
    const store = getStoreById(mCurrentUser.storeId) || userStores[0];
    const mgr = getManagerByPhone(mCurrentUser.phone);
    const catObj = getCategoryByName(store.category);
    document.getElementById('m-store-name').textContent = `${catObj ? catObj.icon : ''} ${store.name}`;
    document.getElementById('m-store-manager').textContent = `${mgr.name} · ${store.category}`;
    document.getElementById('m-report-date').value = mTodayStr;

    // 多店铺管理：显示店铺选择下拉框
    const storeSelContainer = document.getElementById('m-store-select-container');
    const storeSel = document.getElementById('m-store-select');
    if (userStores.length > 1) {
        storeSelContainer.classList.remove('hidden');
        storeSel.innerHTML = '';
        userStores.forEach(s => {
            storeSel.innerHTML += `<option value="${s.id}" ${s.id === mCurrentUser.storeId ? 'selected' : ''}>${s.shopNo} · ${s.name}</option>`;
        });
    } else {
        storeSelContainer.classList.add('hidden');
    }

    const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
    document.getElementById('m-q-start').value = formatDate(weekAgo);
    document.getElementById('m-q-end').value = mTodayStr;
    mSwitchStoreTab('report');
}

// 切换当前管理的店铺
function mSwitchCurrentStore() {
    const newStoreId = document.getElementById('m-store-select').value;
    if (newStoreId && newStoreId !== mCurrentUser.storeId) {
        mCurrentUser.storeId = newStoreId;
        sessionStorage.setItem('sm_user_m', JSON.stringify(mCurrentUser));
        mInitStore();
    }
}

function mSwitchStoreTab(tab) {
    document.querySelectorAll('.m-seg-item[data-tab]').forEach(el => el.classList.remove('active'));
    document.querySelector(`.m-seg-item[data-tab="${tab}"]`).classList.add('active');
    document.getElementById('m-store-report').classList.toggle('hidden', tab !== 'report');
    document.getElementById('m-store-query').classList.toggle('hidden', tab !== 'query');
    if (tab === 'query') mLoadHistory();
}

function mCalcAuto() {
    const s = parseFloat(document.getElementById('m-report-sales').value) || 0;
    const v = parseInt(document.getElementById('m-report-visitors').value) || 0;
    const b = parseInt(document.getElementById('m-report-buyers').value) || 0;
    const avgEl = document.getElementById('m-report-avg');
    const convEl = document.getElementById('m-report-conv');
    if (s > 0 && b > 0) { avgEl.value = '¥' + (s / b).toFixed(2); avgEl.classList.add('has-val'); }
    else { avgEl.value = ''; avgEl.classList.remove('has-val'); }
    if (v > 0 && b > 0) { convEl.value = (b / v * 100).toFixed(2) + '%'; convEl.classList.add('has-val'); }
    else { convEl.value = ''; convEl.classList.remove('has-val'); }
}

async function mSubmitReport(e) {
    e.preventDefault();
    const date = document.getElementById('m-report-date').value;
    const sales = parseFloat(document.getElementById('m-report-sales').value);
    const visitors = parseInt(document.getElementById('m-report-visitors').value);
    const buyers = parseInt(document.getElementById('m-report-buyers').value);
    const notes = document.getElementById('m-report-notes').value.trim();
    if (!date) { mToast('请选择日期', 'error'); return; }
    if (!sales || sales <= 0) { mToast('销售额必须大于0', 'error'); return; }
    if (!visitors || visitors <= 0) { mToast('客流量必须大于0', 'error'); return; }
    if (!buyers || buyers <= 0) { mToast('购买人次必须大于0', 'error'); return; }
    if (buyers > visitors) { mToast('购买人次不能大于客流量', 'error'); return; }
    if (!dailyData[date]) dailyData[date] = {};
    dailyData[date][mCurrentUser.storeId] = {
        sales, visitors, buyers,
        avgPrice: Math.round(sales / buyers * 100) / 100,
        conversion: Math.round(buyers / visitors * 10000) / 100,
        notes, reported: true
    };

    // 调用精细API立即入库
    if (typeof API !== 'undefined' && API.getToken()) {
        try {
            await API.submitDailyData({ date, sales, visitors, buyers, notes });
        } catch (e) {
            mToast('服务器保存失败，数据仅保存在本地', 'error');
            console.error('API提交数据失败:', e);
        }
    }
    saveAllData();
    mToast('数据提交成功，已确认！', 'success');
    mClearForm();
}

function mClearForm() {
    ['m-report-sales', 'm-report-visitors', 'm-report-buyers', 'm-report-notes'].forEach(id => document.getElementById(id).value = '');
    mCalcAuto();
}

function mLoadHistory() {
    const start = document.getElementById('m-q-start').value;
    const end = document.getElementById('m-q-end').value;
    if (!start || !end) { mToast('请选择日期范围', 'error'); return; }
    const dates = getDateRange(new Date(start), new Date(end));
    const sid = mCurrentUser.storeId;
    const container = document.getElementById('m-history-list');
    container.innerHTML = '';
    let count = 0;
    dates.reverse().forEach(date => {
        const d = dailyData[date]?.[sid];
        if (!d) return;
        count++;
        const item = document.createElement('div');
        item.className = 'm-list-item';
        item.innerHTML = `
            <div class="main">
                <div class="date">${date}</div>
                <div class="stats">
                    <span>💰¥${mFmtCurrency(d.sales)}</span>
                    <span>👥${d.visitors}</span>
                    <span>🛒${d.buyers}</span>
                    <span>转化${d.conversion}%</span>
                </div>
            </div>
            <button class="action" onclick="mShowEdit('${date}')">修改</button>`;
        container.appendChild(item);
    });
    if (!count) container.innerHTML = '<div class="m-empty"><div class="icon">📭</div>该时间段暂无数据</div>';
}

function mShowEdit(date) {
    const d = dailyData[date]?.[mCurrentUser.storeId];
    if (!d) return;
    mEditTarget = 'store';
    document.getElementById('m-edit-date').value = date;
    document.getElementById('m-edit-store-id').value = mCurrentUser.storeId;
    document.getElementById('m-edit-title').textContent = `修改 ${date}`;
    document.getElementById('m-edit-sales').value = d.sales;
    document.getElementById('m-edit-visitors').value = d.visitors;
    document.getElementById('m-edit-buyers').value = d.buyers;
    document.getElementById('m-edit-notes').value = d.notes || '';
    mCalcEditAuto();
    document.getElementById('m-modal-edit').classList.add('show');
}

function mCalcEditAuto() {
    const s = parseFloat(document.getElementById('m-edit-sales').value) || 0;
    const v = parseInt(document.getElementById('m-edit-visitors').value) || 0;
    const b = parseInt(document.getElementById('m-edit-buyers').value) || 0;
    const avgEl = document.getElementById('m-edit-avg');
    const convEl = document.getElementById('m-edit-conv');
    avgEl.value = (s > 0 && b > 0) ? '¥' + (s / b).toFixed(2) : '';
    convEl.value = (v > 0 && b > 0) ? (b / v * 100).toFixed(2) + '%' : '';
}

function mHideEdit() { document.getElementById('m-modal-edit').classList.remove('show'); }

async function mSaveEdit() {
    const date = document.getElementById('m-edit-date').value;
    const storeId = document.getElementById('m-edit-store-id').value;
    const sales = parseFloat(document.getElementById('m-edit-sales').value) || 0;
    const visitors = parseInt(document.getElementById('m-edit-visitors').value) || 0;
    const buyers = parseInt(document.getElementById('m-edit-buyers').value) || 0;
    const notes = document.getElementById('m-edit-notes').value.trim();
    if (!sales || sales <= 0) { mToast('销售额必须大于0', 'error'); return; }
    if (!visitors || visitors <= 0) { mToast('客流量必须大于0', 'error'); return; }
    if (!buyers || buyers <= 0) { mToast('购买人次必须大于0', 'error'); return; }
    if (buyers > visitors) { mToast('购买人次不能大于客流量', 'error'); return; }
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
    mHideEdit();
    mToast('数据修改成功', 'success');
    if (mCurrentUser.role === 'store') mLoadHistory();
}

// ========== 修改密码 ==========

let mPwdTarget = null; // 'store' | 'admin'

function mShowChangePwd() {
    mPwdTarget = 'store';
    document.getElementById('m-modal-pwd').classList.add('show');
}

function mShowAdminChangePwd() {
    mPwdTarget = 'admin';
    document.getElementById('m-modal-pwd').classList.add('show');
}

function mHidePwd() {
    document.getElementById('m-modal-pwd').classList.remove('show');
    ['m-old-pwd', 'm-new-pwd', 'm-confirm-pwd'].forEach(id => document.getElementById(id).value = '');
}

async function mChangePwd() {
    const oldPwd = document.getElementById('m-old-pwd').value;
    const newPwd = document.getElementById('m-new-pwd').value;
    const confirmPwd = document.getElementById('m-confirm-pwd').value;
    if (newPwd.length < 6) { mToast('新密码至少6位', 'error'); return; }
    if (newPwd !== confirmPwd) { mToast('两次密码不一致', 'error'); return; }

    // 优先尝试 API
    if (typeof API !== 'undefined' && API.getToken()) {
        try {
            await API.changePassword(oldPwd, newPwd);
            mToast('密码修改成功', 'success');
            mHidePwd();
            return;
        } catch (e) {
            mToast(e.message || '修改失败', 'error');
            return;
        }
    }

    // 离线回退
    if (mPwdTarget === 'store') {
        const mgr = getManagerByPhone(mCurrentUser.phone);
        if (oldPwd !== mgr.password) { mToast('当前密码错误', 'error'); return; }
        mgr.password = newPwd;
    } else {
        if (oldPwd !== adminPassword) { mToast('当前密码错误', 'error'); return; }
        adminPassword = newPwd;
    }
    saveAllData();
    mToast('密码修改成功', 'success');
    mHidePwd();
}

// ========== 管理端 ==========

function mInitAdmin() {
    // 填充业态下拉
    const dqCat = document.getElementById('m-dq-cat');
    const storeFilter = document.getElementById('m-store-filter');
    [dqCat, storeFilter].forEach(sel => {
        if (!sel) return;
        sel.innerHTML = '<option value="all">全部业态</option>';
        categoryList.forEach(c => sel.innerHTML += `<option value="${c.name}">${c.icon} ${c.name}</option>`);
    });
    // 初始化日期
    const today = new Date();
    document.getElementById('m-dash-start').value = formatDate(new Date(today.getFullYear(), today.getMonth(), 1));
    document.getElementById('m-dash-end').value = mTodayStr;
    mSwitchAdminTab('dashboard');
}

function mSwitchAdminTab(tab) {
    // 保存当前Tab，刷新后可恢复
    sessionStorage.setItem('sm_tab_m', tab);

    document.querySelectorAll('.m-tab-item').forEach(el => el.classList.remove('active'));
    document.querySelector(`.m-tab-item[data-tab="${tab}"]`).classList.add('active');
    ['dashboard', 'dataquery', 'stores', 'alerts'].forEach(s => {
        document.getElementById(`m-sec-${s}`).classList.add('hidden');
    });
    document.getElementById(`m-sec-${tab}`).classList.remove('hidden');
    const titles = { dashboard: '数据总看板', dataquery: '数据查询', stores: '店铺管理', alerts: '异常预警' };
    document.getElementById('m-admin-title').textContent = titles[tab];
    switch (tab) {
        case 'dashboard': mRefreshDash(); break;
        case 'dataquery': mRefreshDq(); break;
        case 'stores': mRefreshStores(); break;
        case 'alerts': mSwitchAlertTab('abnormal'); break;
    }
}

// ========== 看板 ==========

function mDashPresetChange() {
    const preset = document.getElementById('m-dash-preset').value;
    const custom = document.getElementById('m-dash-custom');
    custom.classList.toggle('visible', preset === 'custom');
    mRefreshDash();
}

function mGetDashRange() {
    const preset = document.getElementById('m-dash-preset').value;
    if (preset === 'custom') {
        const s = document.getElementById('m-dash-start').value;
        const e = document.getElementById('m-dash-end').value;
        if (!s || !e) return getPeriodRange('week');
        return { start: new Date(s), end: new Date(e) };
    }
    return getPeriodRange(preset);
}

function mRefreshDash() {
    const range = mGetDashRange();
    const dates = getDateRange(range.start, range.end);
    let totalSales = 0, totalVisitors = 0, totalBuyers = 0;
    dates.forEach(date => storeList.forEach(s => { const d = dailyData[date]?.[s.id]; if (d?.reported) { totalSales += d.sales; totalVisitors += d.visitors; totalBuyers += d.buyers; } }));
    const avgConv = totalVisitors > 0 ? (totalBuyers / totalVisitors * 100).toFixed(2) : '0';
    const totalArea = storeList.reduce((s, st) => s + (st.areaSize || 0), 0);

    document.getElementById('m-dash-area').textContent = mFmt(totalArea);
    document.getElementById('m-dash-count').textContent = storeList.length;
    document.getElementById('m-dash-sales').textContent = mFmtWan(totalSales);
    document.getElementById('m-dash-visitors').textContent = mFmt(totalVisitors);
    document.getElementById('m-dash-buyers').textContent = mFmt(totalBuyers);
    document.getElementById('m-dash-conv').textContent = avgConv + '%';

    // 环比
    const prev = getPrevPeriodRange(range.start, range.end);
    const prevDates = getDateRange(prev.start, prev.end);
    let prevSales = 0;
    prevDates.forEach(date => storeList.forEach(s => { const d = dailyData[date]?.[s.id]; if (d?.reported) prevSales += d.sales; }));
    const changeEl = document.getElementById('m-dash-change');
    if (prevSales > 0) {
        const pct = ((totalSales - prevSales) / prevSales * 100).toFixed(1);
        const up = parseFloat(pct) >= 0;
        changeEl.textContent = `${up ? '↑' : '↓'} ${Math.abs(parseFloat(pct))}% 环比`;
        changeEl.className = `change ${up ? 'up' : 'down'}`;
    } else { changeEl.textContent = ''; }

    // 业态汇总
    const catContainer = document.getElementById('m-dash-cats');
    catContainer.innerHTML = '';
    categoryList.forEach(cat => {
        const catStores = storeList.filter(s => s.category === cat.name);
        let catSales = 0, catVisitors = 0, catBuyers = 0;
        dates.forEach(date => catStores.forEach(s => { const d = dailyData[date]?.[s.id]; if (d?.reported) { catSales += d.sales; catVisitors += d.visitors; catBuyers += d.buyers; } }));
        const catArea = catStores.reduce((s, st) => s + (st.areaSize || 0), 0);
        const pingxiao = catArea > 0 ? Math.round(catSales / catArea) : 0;
        const conv = catVisitors > 0 ? (catBuyers / catVisitors * 100).toFixed(1) : '0';
        const card = document.createElement('div');
        card.className = 'm-store-card';
        card.style.borderLeftColor = cat.color;
        card.innerHTML = `<div class="header"><span class="name" style="color:${cat.color}">${cat.icon} ${cat.name}</span><span class="cat-tag" style="background:${cat.bgColor};color:${cat.color}">${catStores.length}家</span></div>
            <div class="stats">
                <div class="stat"><span class="label">销售额</span><span class="val">¥${mFmtCurrency(catSales)}</span></div>
                <div class="stat"><span class="label">客流量</span><span class="val">${mFmt(catVisitors)}</span></div>
                <div class="stat"><span class="label">坪效</span><span class="val">¥${mFmtCurrency(pingxiao)}</span></div>
                <div class="stat"><span class="label">转化率</span><span class="val">${conv}%</span></div>
            </div>`;
        catContainer.appendChild(card);
    });

    // 饼图
    const pieData = categoryList.map(cat => {
        const catStores = storeList.filter(s => s.category === cat.name);
        let s = 0; dates.forEach(date => catStores.forEach(st => { const d = dailyData[date]?.[st.id]; if (d?.reported) s += d.sales; })); return s;
    });
    if (mCharts.pie) mCharts.pie.destroy();
    mCharts.pie = new Chart(document.getElementById('m-chart-pie'), {
        type: 'doughnut',
        data: { labels: categoryList.map(c => c.name), datasets: [{ data: pieData, backgroundColor: categoryList.map(c => c.color), borderWidth: 2, borderColor: '#fff' }] },
        options: { responsive: true, plugins: { legend: { position: 'bottom', labels: { font: { size: 10 }, boxWidth: 10 } } } }
    });

    // 趋势图
    const last7 = dates.slice(-7);
    const trendVals = last7.map(date => { let t = 0; storeList.forEach(s => { const d = dailyData[date]?.[s.id]; if (d?.reported) t += d.sales; }); return t; });
    if (mCharts.trend) mCharts.trend.destroy();
    mCharts.trend = new Chart(document.getElementById('m-chart-trend'), {
        type: 'line',
        data: { labels: last7.map(d => d.slice(5)), datasets: [{ label: '销售额', data: trendVals, borderColor: '#1677ff', backgroundColor: 'rgba(22,119,255,0.1)', fill: true, tension: 0.3, pointRadius: 3 }] },
        options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { ticks: { font: { size: 9 }, callback: v => '¥' + mFmtCurrency(v) } }, x: { ticks: { font: { size: 9 } } } } }
    });
}

// ========== 数据查询 ==========

function mDqPresetChange() {
    const preset = document.getElementById('m-dq-preset').value;
    const custom = document.getElementById('m-dq-custom');
    custom.classList.toggle('visible', preset === 'custom');
    if (preset === 'custom') {
        const today = new Date();
        document.getElementById('m-dq-start').value = formatDate(new Date(today.getFullYear(), today.getMonth(), 1));
        document.getElementById('m-dq-end').value = mTodayStr;
    }
    mRefreshDq();
}

function mGetDqRange() {
    const preset = document.getElementById('m-dq-preset').value;
    if (preset === 'custom') {
        const s = document.getElementById('m-dq-start').value;
        const e = document.getElementById('m-dq-end').value;
        if (!s || !e) return getPeriodRange('today');
        return { start: new Date(s), end: new Date(e) };
    }
    return getPeriodRange(preset);
}

function mRefreshDq() {
    const range = mGetDqRange();
    const dates = getDateRange(range.start, range.end);
    const catFilter = document.getElementById('m-dq-cat').value || 'all';
    const search = (document.getElementById('m-dq-search').value || '').toLowerCase();
    const container = document.getElementById('m-dq-list');
    container.innerHTML = '';

    let totalSales = 0, totalVisitors = 0, totalBuyers = 0, totalArea = 0;
    let reportedCount = 0, unreportedCount = 0;

    storeList.filter(s => {
        if (catFilter !== 'all' && s.category !== catFilter) return false;
        if (search && !s.name.toLowerCase().includes(search)) return false;
        return true;
    }).forEach(store => {
        let storeSales = 0, storeVisitors = 0, storeBuyers = 0;
        let hasData = false;
        dates.forEach(date => {
            const d = dailyData[date]?.[store.id];
            if (d?.reported) { storeSales += d.sales; storeVisitors += d.visitors; storeBuyers += d.buyers; hasData = true; }
        });
        const avgPrice = storeBuyers > 0 ? (storeSales / storeBuyers).toFixed(1) : '0';
        const conv = storeVisitors > 0 ? (storeBuyers / storeVisitors * 100).toFixed(1) : '0';
        const eff = hasData && store.areaSize > 0 ? Math.round(storeSales / store.areaSize) : 0;
        const catObj = getCategoryByName(store.category);
        if (hasData) { reportedCount++; totalSales += storeSales; totalVisitors += storeVisitors; totalBuyers += storeBuyers; totalArea += (store.areaSize || 0); }
        else { unreportedCount++; }
        const card = document.createElement('div');
        card.className = `m-store-card ${hasData ? '' : 'unreported'}`;
        card.style.borderLeftColor = hasData ? (catObj?.color || '#1677ff') : '#ff4d4f';
        card.innerHTML = `<div class="header">
                <span class="name">${store.shopNo} · ${store.name}</span>
                <span class="cat-tag" style="background:${catObj?.bgColor || '#e6f4ff'};color:${catObj?.color || '#1677ff'}">${catObj?.icon || ''} ${store.category}</span>
            </div>
            <div class="info">${store.areaSize}m² · ${store.area} · 店长：${store.managerName}</div>
            <div class="stats">
                <div class="stat"><span class="label">销售额</span><span class="val">${hasData ? '¥' + mFmtCurrency(storeSales) : '未上报'}</span></div>
                <div class="stat"><span class="label">客流</span><span class="val">${hasData ? storeVisitors : '--'}</span></div>
                <div class="stat"><span class="label">购买</span><span class="val">${hasData ? storeBuyers : '--'}</span></div>
                <div class="stat"><span class="label">转化率</span><span class="val">${hasData ? conv + '%' : '--'}</span></div>
                <div class="stat"><span class="label">坪效</span><span class="val">${hasData && store.areaSize > 0 ? '¥' + mFmtCurrency(eff) : '--'}</span></div>
            </div>`;
        container.appendChild(card);
    });

    const totalConv = totalVisitors > 0 ? (totalBuyers / totalVisitors * 100).toFixed(1) : '0';
    const avgEff = totalArea > 0 ? Math.round(totalSales / totalArea) : 0;
    document.getElementById('m-dq-summary').innerHTML = `
        <div class="item"><span class="label">已上报</span> <span class="val">${reportedCount}家</span></div>
        <div class="item"><span class="label">未上报</span> <span class="val danger">${unreportedCount}家</span></div>
        <div class="item"><span class="label">总销售额</span> <span class="val">¥${mFmtCurrency(totalSales)}</span></div>
        <div class="item"><span class="label">平均坪效</span> <span class="val">¥${mFmtCurrency(avgEff)}/m²</span></div>`;
}

// ========== 店铺管理 ==========

function mDownloadXLSX() {
    const range = mGetDqRange();
    const dates = getDateRange(range.start, range.end);
    const catFilter = document.getElementById('m-dq-cat').value || 'all';
    const search = (document.getElementById('m-dq-search').value || '').toLowerCase();

    const rows = [];
    rows.push(['店铺名称', '商铺号', '业态', '面积(m²)', '销售额', '客流量', '购买人次', '客单价', '转化率(%)', '坪效(元/m²)', '状态', '店长', '联系电话']);

    let totalSales = 0, totalVisitors = 0, totalBuyers = 0, totalArea = 0;

    storeList.filter(s => {
        if (catFilter !== 'all' && s.category !== catFilter) return false;
        if (search && !s.name.toLowerCase().includes(search)) return false;
        return true;
    }).forEach(store => {
        let storeSales = 0, storeVisitors = 0, storeBuyers = 0;
        let hasData = false;
        dates.forEach(date => {
            const d = dailyData[date]?.[store.id];
            if (d?.reported) { storeSales += d.sales; storeVisitors += d.visitors; storeBuyers += d.buyers; hasData = true; }
        });
        const avgPrice = storeBuyers > 0 ? Math.round(storeSales / storeBuyers * 100) / 100 : 0;
        const conversion = storeVisitors > 0 ? Math.round(storeBuyers / storeVisitors * 10000) / 100 : 0;
        const efficiency = hasData && store.areaSize > 0 ? Math.round(storeSales / store.areaSize) : '';
        if (hasData) { totalSales += storeSales; totalVisitors += storeVisitors; totalBuyers += storeBuyers; totalArea += (store.areaSize || 0); }
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
    mToast('数据已导出', 'success');
}

// ========== 店铺管理 ==========

function mRefreshStores() {
    const catFilter = document.getElementById('m-store-filter').value || 'all';
    const search = (document.getElementById('m-store-search').value || '').toLowerCase();
    const container = document.getElementById('m-store-list');
    container.innerHTML = '';
    const todayData = dailyData[mTodayStr] || {};

    let count = 0;
    storeList.filter(s => {
        if (catFilter !== 'all' && s.category !== catFilter) return false;
        if (search && !s.name.toLowerCase().includes(search) && !s.shopNo.toLowerCase().includes(search)) return false;
        return true;
    }).forEach(store => {
        count++;
        const d = todayData[store.id];
        const reported = d?.reported;
        const catObj = getCategoryByName(store.category);
        const card = document.createElement('div');
        card.className = `m-store-card ${reported ? '' : 'unreported'}`;
        card.style.borderLeftColor = catObj?.color || '#1677ff';
        card.style.cursor = 'pointer';
        card.innerHTML = `<div class="header">
                <span class="name">${store.shopNo} · ${store.name}</span>
                <span class="cat-tag" style="background:${catObj?.bgColor || '#e6f4ff'};color:${catObj?.color || '#1677ff'}">${catObj?.icon || ''} ${store.category}</span>
            </div>
            <div class="info">${store.areaSize}m² · ${store.area} · 店长：${store.managerName} (${store.managerPhone})</div>
            <div class="stats">
                <div class="stat"><span class="label">今日销售</span><span class="val">${reported ? '¥' + mFmtCurrency(d.sales) : '未上报'}</span></div>
                <div class="stat"><span class="label">今日客流</span><span class="val">${reported ? d.visitors : '--'}</span></div>
                <div class="stat"><span class="label">转化率</span><span class="val">${reported ? d.conversion + '%' : '--'}</span></div>
            </div>
            <div style="margin-top:8px;font-size:11px;color:${reported ? 'var(--success)' : 'var(--danger)'}">${reported ? '✓ 已上报' : '⚠ 未上报'} · 点击查看详情</div>`;
        card.setAttribute('data-store-id', store.id);
        card.onclick = function() { mShowStoreDetail(this.getAttribute('data-store-id')); };
        container.appendChild(card);
    });
    if (!count) container.innerHTML = '<div class="m-empty"><div class="icon">🔍</div>未找到匹配店铺</div>';
}

function mPopulateStoreCategorySelect() {
    const sel = document.getElementById('m-edit-store-category');
    sel.innerHTML = '';
    categoryList.forEach(c => sel.innerHTML += `<option value="${c.name}">${c.icon} ${c.name}</option>`);
}

function mShowAddStore() {
    mPopulateStoreCategorySelect();
    document.getElementById('m-edit-store-id').value = '';
    document.getElementById('m-store-edit-title').textContent = '新增店铺';
    document.getElementById('m-edit-shop-no').value = '';
    document.getElementById('m-edit-store-name').value = '';
    document.getElementById('m-edit-store-category').value = categoryList.length > 0 ? categoryList[0].name : '';
    document.getElementById('m-edit-store-area').value = 'A区';
    document.getElementById('m-edit-store-area-size').value = '';
    document.getElementById('m-edit-store-manager').value = '';
    document.getElementById('m-edit-store-phone').value = '';
    document.getElementById('m-store-delete-btn').style.display = 'none';
    document.getElementById('m-modal-store').classList.add('show');
}

function mShowStoreDetail(storeId) {
    const store = getStoreById(storeId);
    if (!store) return;
    mPopulateStoreCategorySelect();
    document.getElementById('m-edit-store-id').value = storeId;
    document.getElementById('m-store-edit-title').textContent = `店铺信息 · ${store.name}`;
    document.getElementById('m-edit-shop-no').value = store.shopNo;
    document.getElementById('m-edit-store-name').value = store.name;
    document.getElementById('m-edit-store-category').value = store.category;
    document.getElementById('m-edit-store-area').value = store.area;
    document.getElementById('m-edit-store-area-size').value = store.areaSize;
    document.getElementById('m-edit-store-manager').value = store.managerName;
    document.getElementById('m-edit-store-phone').value = store.managerPhone;
    document.getElementById('m-store-delete-btn').style.display = 'block';
    document.getElementById('m-modal-store').classList.add('show');
}

function mHideStoreModal() {
    document.getElementById('m-modal-store').classList.remove('show');
}

async function mSaveStore() {
    const id = document.getElementById('m-edit-store-id').value;
    const shopNo = document.getElementById('m-edit-shop-no').value.trim();
    const name = document.getElementById('m-edit-store-name').value.trim();
    const category = document.getElementById('m-edit-store-category').value;
    const area = document.getElementById('m-edit-store-area').value.trim() || 'A区';
    const areaSize = parseInt(document.getElementById('m-edit-store-area-size').value) || 0;
    const managerName = document.getElementById('m-edit-store-manager').value.trim();
    const managerPhone = document.getElementById('m-edit-store-phone').value.trim();

    // 必填校验（新增时全部必填）
    if (!id) {
        if (!shopNo) { mToast('商铺号不能为空', 'error'); return; }
        if (!name) { mToast('店铺名称不能为空', 'error'); return; }
        if (!category) { mToast('请选择业态', 'error'); return; }
        if (!area) { mToast('所在区域不能为空', 'error'); return; }
        if (!areaSize || areaSize <= 0) { mToast('面积必须大于0', 'error'); return; }
        if (!managerName) { mToast('店长姓名不能为空', 'error'); return; }
        if (!managerPhone) { mToast('联系电话不能为空', 'error'); return; }
        if (!/^1\d{10}$/.test(managerPhone)) { mToast('手机号格式不正确', 'error'); return; }
        // 检查商铺号是否重复
        const dupShop = storeList.find(s => s.shopNo === shopNo);
        if (dupShop) { mToast(`商铺号「${shopNo}」已存在（${dupShop.name}）`, 'error'); return; }
    } else {
        if (!shopNo || !name) { mToast('商铺号和店铺名称必填', 'error'); return; }
        if (managerPhone && !/^1\d{10}$/.test(managerPhone)) { mToast('手机号格式不正确', 'error'); return; }
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
    mHideStoreModal();
    mRefreshStores();
    mToast('店铺信息保存成功', 'success');
}

async function mDeleteStore() {
    const id = document.getElementById('m-edit-store-id').value;
    if (!id) return;
    const store = getStoreById(id);
    if (!store) return;
    if (!confirm(`确定要删除「${store.name}」吗？\n该店铺的所有历史数据将一并删除，此操作不可撤销。`)) return;

    // 调用精细API从服务器删除
    if (typeof API !== 'undefined' && API.getToken()) {
        try {
            await API.deleteStore(id);
        } catch (e) {
            mToast('服务器删除失败: ' + e.message, 'error');
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
    mHideStoreModal();
    mRefreshStores();
    mToast('店铺已删除', 'success');
}

// ========== 异常预警 ==========

function mSwitchAlertTab(type) {
    document.querySelectorAll('.m-seg-item[data-atype]').forEach(el => el.classList.remove('active'));
    document.querySelector(`.m-seg-item[data-atype="${type}"]`).classList.add('active');
    ['abnormal', 'unreported', 'feedback'].forEach(t => {
        document.getElementById(`m-alert-${t}`).classList.toggle('hidden', t !== type);
    });
    switch (type) {
        case 'abnormal': mRefreshAlerts(); break;
        case 'unreported': mRefreshUnreported(); break;
        case 'feedback': mRefreshFeedback(); break;
    }
}

function mRefreshAlerts() {
    const alerts = detectAlerts();
    const container = document.getElementById('m-alert-abnormal');
    container.innerHTML = '';
    if (!alerts.length) {
        container.innerHTML = '<div class="m-empty"><div class="icon">✅</div>暂无数据异常预警</div>';
        return;
    }
    alerts.forEach(a => {
        const item = document.createElement('div');
        item.className = `m-alert-item ${a.level}`;
        const levelText = a.level === 'high' ? '高风险' : a.level === 'medium' ? '中风险' : '关注';
        const sn = a.store ? a.store.name : '系统';
        const catIcon = a.store ? (getCategoryByName(a.store.category)?.icon || '') : '';
        item.innerHTML = `<span class="m-alert-badge ${a.level}">${levelText}</span>
            <div class="store-name">${sn} ${catIcon}</div>
            <div class="desc">${a.desc}</div>
            <div class="metric">${a.metric}</div>`;
        container.appendChild(item);
    });
}

function mRefreshUnreported() {
    const data = detectUnreported();
    const container = document.getElementById('m-alert-unreported');
    container.innerHTML = '';
    if (!data.length) {
        container.innerHTML = '<div class="m-empty"><div class="icon">✅</div>近7日所有店铺均已上报</div>';
        return;
    }
    // 汇总
    const totalMissing = data.reduce((s, u) => s + u.missingCount, 0);
    const summary = document.createElement('div');
    summary.className = 'm-summary-bar';
    summary.innerHTML = `<div class="item"><span class="label">未上报店铺</span> <span class="val danger">${data.length}家</span></div>
        <div class="item"><span class="label">缺失天数</span> <span class="val danger">${totalMissing}天</span></div>`;
    container.appendChild(summary);

    data.forEach(u => {
        const item = document.createElement('div');
        item.className = 'm-unreported-item';
        item.innerHTML = `<div class="name">${u.store.name}</div>
            <div class="missing">缺失：${u.missingDates.map(d => d.slice(5)).join('、')}（共${u.missingCount}天）</div>
            <div class="contact">店长：${u.store.managerName} · ${u.store.managerPhone}</div>`;
        container.appendChild(item);
    });
}

function mRefreshFeedback() {
    let start = document.getElementById('m-fb-start').value;
    let end = document.getElementById('m-fb-end').value;
    if (!start || !end) {
        const e = new Date(); const s = new Date(); s.setDate(s.getDate() - 30);
        start = formatDate(s); end = formatDate(e);
        document.getElementById('m-fb-start').value = start;
        document.getElementById('m-fb-end').value = end;
    }
    const dates = getDateRange(new Date(start), new Date(end));
    const list = [];
    dates.reverse().forEach(date => {
        const dayData = dailyData[date];
        if (!dayData) return;
        storeList.forEach(store => {
            const d = dayData[store.id];
            if (d && d.reported && d.notes && d.notes.trim()) {
                list.push({ date, store, notes: d.notes.trim() });
            }
        });
    });
    const container = document.getElementById('m-feedback-list');
    container.innerHTML = '';
    if (!list.length) {
        container.innerHTML = '<div class="m-empty"><div class="icon">💬</div>暂无店长反馈记录</div>';
        return;
    }
    list.forEach(f => {
        const catObj = getCategoryByName(f.store.category);
        const item = document.createElement('div');
        item.className = 'm-feedback-item';
        item.innerHTML = `<div class="top">
                <span class="store">${catObj?.icon || ''} ${f.store.name}</span>
                <span class="date">${f.date}</span>
            </div>
            <div class="note">${f.notes}</div>`;
        container.appendChild(item);
    });
}

// ========== 初始化 ==========

document.addEventListener('DOMContentLoaded', async () => {
    // 首先加载数据
    await initAppData();
    // 限制所有日期输入框不能超过今日
    setDateInputMax();
    // 设置默认日期
    if (document.getElementById('m-report-date')) {
        document.getElementById('m-report-date').value = mTodayStr;
    }

    // 自动恢复登录状态（从sessionStorage恢复）
    const savedUser = sessionStorage.getItem('sm_user_m');
    const savedPage = sessionStorage.getItem('sm_page_m');
    const token = typeof API !== 'undefined' ? API.getToken() : null;

    if (savedUser && token) {
        try {
            mCurrentUser = JSON.parse(savedUser);
            if (savedPage) mShowPage(savedPage);
            if (mCurrentUser.role === 'admin') {
                mInitAdmin();
                const savedTab = sessionStorage.getItem('sm_tab_m') || 'dashboard';
                mSwitchAdminTab(savedTab);
            } else if (mCurrentUser.role === 'store') {
                mInitStore();
            }
            // 更新手机时间
            updatePhoneTime();
        } catch (e) {
            sessionStorage.removeItem('sm_user_m');
            sessionStorage.removeItem('sm_page_m');
            sessionStorage.removeItem('sm_tab_m');
        }
    }
});
