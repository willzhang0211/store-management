// ========== 店铺基础数据配置 ==========

const DEFAULT_CATEGORIES = [
    { id: 'cat_1', name: '餐饮', color: '#ff6b6b', bgColor: '#ffebee', icon: '🍜' },
    { id: 'cat_2', name: '便利店', color: '#ffa726', bgColor: '#fff3e0', icon: '🏪' },
    { id: 'cat_3', name: '特色零售', color: '#66bb6a', bgColor: '#e8f5e9', icon: '🛍' },
    { id: 'cat_4', name: '服饰', color: '#ab47bc', bgColor: '#f3e5f5', icon: '👗' }
];

// 50家店铺完整列表
const STORES = [
    // 餐饮 15家
    { id: 'S001', shopNo: 'A-101', name: '海港海鲜餐厅', category: '餐饮', area: 'A区', areaSize: 280, managerName: '陈大海', managerPhone: '13800010001', baseSales: 28000, baseVisitors: 220, baseBuyers: 165 },
    { id: 'S002', shopNo: 'A-102', name: '椰风椰子鸡', category: '餐饮', area: 'A区', areaSize: 200, managerName: '林椰风', managerPhone: '13800010002', baseSales: 22000, baseVisitors: 180, baseBuyers: 140 },
    { id: 'S003', shopNo: 'B-201', name: '琼味海南粉', category: '餐饮', area: 'B区', areaSize: 80, managerName: '王琼味', managerPhone: '13800010003', baseSales: 8500, baseVisitors: 160, baseBuyers: 145 },
    { id: 'S004', shopNo: 'B-202', name: '码头烧烤吧', category: '餐饮', area: 'B区', areaSize: 150, managerName: '赵码头', managerPhone: '13800010004', baseSales: 15000, baseVisitors: 150, baseBuyers: 120 },
    { id: 'S005', shopNo: 'C-301', name: '茶缘茶餐厅', category: '餐饮', area: 'C区', areaSize: 120, managerName: '孙茶缘', managerPhone: '13800010005', baseSales: 12000, baseVisitors: 130, baseBuyers: 95 },
    { id: 'S006', shopNo: 'A-103', name: '渔家乐鱼庄', category: '餐饮', area: 'A区', areaSize: 180, managerName: '周渔家', managerPhone: '13800010006', baseSales: 18500, baseVisitors: 170, baseBuyers: 130 },
    { id: 'S007', shopNo: 'C-302', name: '潮汕牛肉火锅', category: '餐饮', area: 'C区', areaSize: 250, managerName: '吴潮汕', managerPhone: '13800010007', baseSales: 25000, baseVisitors: 200, baseBuyers: 160 },
    { id: 'S008', shopNo: 'B-203', name: '黎家风味馆', category: '餐饮', area: 'B区', areaSize: 95, managerName: '郑黎家', managerPhone: '13800010008', baseSales: 9500, baseVisitors: 110, baseBuyers: 85 },
    { id: 'S009', shopNo: 'A-104', name: '新海咖啡厅', category: '餐饮', area: 'A区', areaSize: 60, managerName: '钱新海', managerPhone: '13800010009', baseSales: 6800, baseVisitors: 90, baseBuyers: 55 },
    { id: 'S010', shopNo: 'C-303', name: '鼎香蒸菜馆', category: '餐饮', area: 'C区', areaSize: 110, managerName: '冯鼎香', managerPhone: '13800010010', baseSales: 11000, baseVisitors: 120, baseBuyers: 95 },
    { id: 'S011', shopNo: 'B-204', name: '港湾粥铺', category: '餐饮', area: 'B区', areaSize: 75, managerName: '陈港湾', managerPhone: '13800010011', baseSales: 7500, baseVisitors: 135, baseBuyers: 120 },
    { id: 'S012', shopNo: 'A-105', name: '南山素斋', category: '餐饮', area: 'A区', areaSize: 90, managerName: '褚南山', managerPhone: '13800010012', baseSales: 9200, baseVisitors: 85, baseBuyers: 70 },
    { id: 'S013', shopNo: 'C-304', name: '辣味川菜馆', category: '餐饮', area: 'C区', areaSize: 160, managerName: '卫辣味', managerPhone: '13800010013', baseSales: 18000, baseVisitors: 155, baseBuyers: 120 },
    { id: 'S014', shopNo: 'A-106', name: '鲜味寿司屋', category: '餐饮', area: 'A区', areaSize: 130, managerName: '蒋鲜味', managerPhone: '13800010014', baseSales: 14000, baseVisitors: 105, baseBuyers: 80 },
    { id: 'S015', shopNo: 'B-205', name: '海岛冰室', category: '餐饮', area: 'B区', areaSize: 50, managerName: '沈海岛', managerPhone: '13800010015', baseSales: 5200, baseVisitors: 75, baseBuyers: 50 },

    // 便利店 12家
    { id: 'S016', shopNo: 'A-201', name: '海港便利1号店', category: '便利店', area: 'A区', areaSize: 60, managerName: '韩便利1', managerPhone: '13800020001', baseSales: 6500, baseVisitors: 280, baseBuyers: 200 },
    { id: 'S017', shopNo: 'B-301', name: '海港便利2号店', category: '便利店', area: 'B区', areaSize: 55, managerName: '杨便利2', managerPhone: '13800020002', baseSales: 5800, baseVisitors: 250, baseBuyers: 185 },
    { id: 'S018', shopNo: 'C-401', name: '海港便利3号店', category: '便利店', area: 'C区', areaSize: 50, managerName: '朱便利3', managerPhone: '13800020003', baseSales: 5200, baseVisitors: 220, baseBuyers: 170 },
    { id: 'S019', shopNo: 'A-202', name: '港口便利超市', category: '便利店', area: 'A区', areaSize: 70, managerName: '秦便利4', managerPhone: '13800020004', baseSales: 7200, baseVisitors: 310, baseBuyers: 230 },
    { id: 'S020', shopNo: 'B-302', name: '码头24小时店', category: '便利店', area: 'B区', areaSize: 80, managerName: '尤便利5', managerPhone: '13800020005', baseSales: 8800, baseVisitors: 340, baseBuyers: 260 },
    { id: 'S021', shopNo: 'C-402', name: '新海便利站', category: '便利店', area: 'C区', areaSize: 45, managerName: '许便利6', managerPhone: '13800020006', baseSales: 4500, baseVisitors: 190, baseBuyers: 150 },
    { id: 'S022', shopNo: 'A-203', name: '航站便利屋', category: '便利店', area: 'A区', areaSize: 58, managerName: '何便利7', managerPhone: '13800020007', baseSales: 6000, baseVisitors: 260, baseBuyers: 195 },
    { id: 'S023', shopNo: 'B-303', name: '渡口便利店', category: '便利店', area: 'B区', areaSize: 52, managerName: '吕便利8', managerPhone: '13800020008', baseSales: 5500, baseVisitors: 230, baseBuyers: 175 },
    { id: 'S024', shopNo: 'A-204', name: '码头便利5号店', category: '便利店', area: 'A区', areaSize: 65, managerName: '施便利9', managerPhone: '13800020009', baseSales: 6800, baseVisitors: 290, baseBuyers: 215 },
    { id: 'S025', shopNo: 'C-403', name: '港区便利6号店', category: '便利店', area: 'C区', areaSize: 40, managerName: '张便利10', managerPhone: '13800020010', baseSales: 4200, baseVisitors: 175, baseBuyers: 140 },
    { id: 'S026', shopNo: 'B-304', name: '海风便利7号店', category: '便利店', area: 'B区', areaSize: 48, managerName: '孔便利11', managerPhone: '13800020011', baseSales: 5000, baseVisitors: 210, baseBuyers: 165 },
    { id: 'S027', shopNo: 'A-205', name: '港口便利8号店', category: '便利店', area: 'A区', areaSize: 72, managerName: '曹便利12', managerPhone: '13800020012', baseSales: 7500, baseVisitors: 320, baseBuyers: 245 },

    // 特色零售 13家
    { id: 'S028', shopNo: 'A-301', name: '椰雕工艺品店', category: '特色零售', area: 'A区', areaSize: 120, managerName: '严椰雕', managerPhone: '13800030001', baseSales: 12000, baseVisitors: 180, baseBuyers: 60 },
    { id: 'S029', shopNo: 'B-401', name: '海南特产汇', category: '特色零售', area: 'B区', areaSize: 180, managerName: '华特产', managerPhone: '13800030002', baseSales: 18000, baseVisitors: 250, baseBuyers: 85 },
    { id: 'S030', shopNo: 'A-302', name: '热带水果铺', category: '特色零售', area: 'A区', areaSize: 150, managerName: '金水果', managerPhone: '13800030003', baseSales: 15000, baseVisitors: 280, baseBuyers: 190 },
    { id: 'S031', shopNo: 'C-501', name: '珍珠饰品馆', category: '特色零售', area: 'C区', areaSize: 100, managerName: '魏珍珠', managerPhone: '13800030004', baseSales: 22000, baseVisitors: 120, baseBuyers: 40 },
    { id: 'S032', shopNo: 'A-303', name: '黎锦文创店', category: '特色零售', area: 'A区', areaSize: 80, managerName: '陶黎锦', managerPhone: '13800030005', baseSales: 8000, baseVisitors: 95, baseBuyers: 30 },
    { id: 'S033', shopNo: 'B-402', name: '沉香雅集', category: '特色零售', area: 'B区', areaSize: 200, managerName: '姜沉香', managerPhone: '13800030006', baseSales: 35000, baseVisitors: 70, baseBuyers: 25 },
    { id: 'S034', shopNo: 'C-502', name: '港口烟酒行', category: '特色零售', area: 'C区', areaSize: 90, managerName: '戚烟酒', managerPhone: '13800030007', baseSales: 16000, baseVisitors: 130, baseBuyers: 80 },
    { id: 'S035', shopNo: 'A-304', name: '海岛零食屋', category: '特色零售', area: 'A区', areaSize: 95, managerName: '谢零食', managerPhone: '13800030008', baseSales: 9500, baseVisitors: 200, baseBuyers: 130 },
    { id: 'S036', shopNo: 'B-403', name: '免税精品店', category: '特色零售', area: 'B区', areaSize: 350, managerName: '邹免税', managerPhone: '13800030009', baseSales: 45000, baseVisitors: 150, baseBuyers: 50 },
    { id: 'S037', shopNo: 'C-503', name: '热带干货铺', category: '特色零售', area: 'C区', areaSize: 110, managerName: '柏干货', managerPhone: '13800030010', baseSales: 11000, baseVisitors: 160, baseBuyers: 100 },
    { id: 'S038', shopNo: 'A-305', name: '贝壳工艺坊', category: '特色零售', area: 'A区', areaSize: 75, managerName: '水贝壳', managerPhone: '13800030011', baseSales: 7500, baseVisitors: 140, baseBuyers: 45 },
    { id: 'S039', shopNo: 'B-404', name: '港埠书屋', category: '特色零售', area: 'B区', areaSize: 60, managerName: '窦书屋', managerPhone: '13800030012', baseSales: 5000, baseVisitors: 80, baseBuyers: 35 },
    { id: 'S040', shopNo: 'C-504', name: '海味干货行', category: '特色零售', area: 'C区', areaSize: 130, managerName: '章干货', managerPhone: '13800030013', baseSales: 13000, baseVisitors: 110, baseBuyers: 70 },

    // 服饰 10家
    { id: 'S041', shopNo: 'A-401', name: '海岛时尚女装', category: '服饰', area: 'A区', areaSize: 140, managerName: '云女装', managerPhone: '13800040001', baseSales: 18000, baseVisitors: 120, baseBuyers: 35 },
    { id: 'S042', shopNo: 'B-501', name: '港口休闲男装', category: '服饰', area: 'B区', areaSize: 110, managerName: '苏男装', managerPhone: '13800040002', baseSales: 14000, baseVisitors: 95, baseBuyers: 28 },
    { id: 'S043', shopNo: 'A-402', name: '潮牌运动馆', category: '服饰', area: 'A区', areaSize: 180, managerName: '潘运动', managerPhone: '13800040003', baseSales: 22000, baseVisitors: 150, baseBuyers: 42 },
    { id: 'S044', shopNo: 'C-601', name: '沙滩泳装屋', category: '服饰', area: 'C区', areaSize: 80, managerName: '葛泳装', managerPhone: '13800040004', baseSales: 12000, baseVisitors: 180, baseBuyers: 55 },
    { id: 'S045', shopNo: 'B-502', name: '琼派童装店', category: '服饰', area: 'B区', areaSize: 90, managerName: '奚童装', managerPhone: '13800040005', baseSales: 9500, baseVisitors: 80, baseBuyers: 30 },
    { id: 'S046', shopNo: 'A-403', name: '港湾皮具行', category: '服饰', area: 'A区', areaSize: 160, managerName: '范皮具', managerPhone: '13800040006', baseSales: 28000, baseVisitors: 65, baseBuyers: 20 },
    { id: 'S047', shopNo: 'C-602', name: '新海鞋业', category: '服饰', area: 'C区', areaSize: 130, managerName: '彭鞋业', managerPhone: '13800040007', baseSales: 16000, baseVisitors: 110, baseBuyers: 40 },
    { id: 'S048', shopNo: 'B-503', name: '海风内衣店', category: '服饰', area: 'B区', areaSize: 70, managerName: '鲁内衣', managerPhone: '13800040008', baseSales: 8000, baseVisitors: 90, baseBuyers: 45 },
    { id: 'S049', shopNo: 'A-404', name: '港口箱包店', category: '服饰', area: 'A区', areaSize: 120, managerName: '马箱包', managerPhone: '13800040009', baseSales: 15000, baseVisitors: 75, baseBuyers: 22 },
    { id: 'S050', shopNo: 'C-603', name: '码头户外装备', category: '服饰', area: 'C区', areaSize: 100, managerName: '强户外', managerPhone: '13800040010', baseSales: 11000, baseVisitors: 85, baseBuyers: 30 }
];

// 店长账号列表
const MANAGER_ACCOUNTS = STORES.map(store => ({
    phone: store.managerPhone,
    name: store.managerName,
    storeId: store.id,
    password: '123456'
}));

// ========== 生成模拟历史数据 ==========

function generateHistoricalData() {
    const data = {};
    const today = new Date();

    for (let d = 90; d >= 0; d--) {
        const date = new Date(today);
        date.setDate(date.getDate() - d);
        const dateStr = formatDate(date);
        const dow = date.getDay();
        const weekendFactor = (dow === 0 || dow === 6) ? 1.3 : 1.0;
        const dom = date.getDate();
        const monthFactor = (dom <= 5 || dom >= 25) ? 1.1 : 1.0;
        const month = date.getMonth();
        const seasonFactor = (month >= 5 && month <= 8) ? 1.2 : (month >= 11 || month <= 2) ? 0.85 : 1.0;

        STORES.forEach(store => {
            const storeRandom = seededRandom(store.id + dateStr);
            const catObj = categoryList.find(c => c.name === store.category);
            const volatility = catObj ? catObj.volatility || 0.20 : 0.20;

            const salesFactor = weekendFactor * monthFactor * seasonFactor * (1 + (storeRandom - 0.5) * volatility);
            const visitorFactor = weekendFactor * monthFactor * (1 + (storeRandom - 0.5) * volatility * 0.8);
            const buyerRatio = store.baseBuyers / store.baseVisitors + (storeRandom - 0.5) * 0.08;

            const sales = Math.round(store.baseSales * salesFactor);
            const visitors = Math.round(store.baseVisitors * visitorFactor);
            const buyers = Math.round(visitors * Math.max(0.15, Math.min(0.95, buyerRatio)));

            if (!data[dateStr]) data[dateStr] = {};
            const noteRandom = seededRandom(store.id + dateStr + 'note');
            let notes = '';
            if (d <= 30 && noteRandom > 0.75) {
                const notePool = ['正常营业', '今日客流较少', '周末促销活动', '设备维修半天', '新品上市', '周边竞品开业影响客流', '天气原因客流下降', '会员日活动效果良好', '库存盘点', '员工培训', '供应商涨价调整价格', '节假日客流高峰', '装修升级中', '投诉处理完毕', '大宗团购订单'];
                notes = notePool[Math.floor(seededRandom(store.id + dateStr + 'noteidx') * notePool.length)];
            }
            data[dateStr][store.id] = {
                sales, visitors, buyers,
                avgPrice: Math.round(sales / buyers * 100) / 100,
                conversion: Math.round(buyers / visitors * 10000) / 100,
                notes,
                reported: d > 1
            };
        });
    }

    // 模拟最近2天部分店铺未上报
    const yesterday = formatDate(new Date(today.getTime() - 86400000));
    const todayStr = formatDate(today);

    let shuffled = [...STORES].sort(() => Math.random() - 0.5);
    shuffled.slice(0, 15).forEach(s => {
        if (data[todayStr] && data[todayStr][s.id]) data[todayStr][s.id].reported = false;
    });
    shuffled = [...STORES].sort(() => Math.random() - 0.5);
    shuffled.slice(0, 8).forEach(s => {
        if (data[yesterday] && data[yesterday][s.id]) data[yesterday][s.id].reported = false;
    });

    // 异常数据模拟
    if (data[todayStr]) {
        ['S005', 'S015', 'S044'].forEach(sid => {
            if (data[todayStr][sid]) {
                data[todayStr][sid].sales = Math.round(STORES.find(s => s.id === sid).baseSales * 0.4);
                data[todayStr][sid].visitors = Math.round(STORES.find(s => s.id === sid).baseVisitors * 0.5);
            }
        });
    }

    return data;
}

function seededRandom(seed) {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
        hash = ((hash << 5) - hash) + seed.charCodeAt(i);
        hash |= 0;
    }
    const x = Math.sin(hash) * 10000;
    return x - Math.floor(x);
}

function formatDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function generateStoreId() {
    const maxId = storeList.reduce((max, s) => {
        const num = parseInt(s.id.replace('S', ''), 10);
        return num > max ? num : max;
    }, 0);
    return 'S' + String(maxId + 1).padStart(3, '0');
}

function generateCategoryId() {
    const maxId = categoryList.reduce((max, c) => {
        const num = parseInt(c.id.replace('cat_', ''), 10);
        return num > max ? num : max;
    }, 0);
    return 'cat_' + String(maxId + 1);
}

// ========== 持久化（含版本迁移） ==========

const DATA_VERSION = 6; // v6: 清空模拟数据，从真实填报开始

// 先声明变量（不初始化），确保后续函数引用不报错
let dailyData, storeList, managerAccounts, categoryList, adminPassword;
let _adminPasswordPlain = 'admin123'; // 离线模式下的明文密码（服务器版本使用bcrypt哈希，此变量用于离线回退）

// 初始化默认值（不含任何模拟数据）
function initDefaultData() {
    categoryList = JSON.parse(JSON.stringify(DEFAULT_CATEGORIES));
    storeList = []; // 从服务器或 localStorage 加载，不再硬编码 STORES
    managerAccounts = [];
    dailyData = {};
    adminPassword = 'admin123';
    _adminPasswordPlain = 'admin123';
}

function saveAllData() {
    // 同步到服务器 API（防抖批量保存，用于非关键数据的同步）
    if (typeof API !== 'undefined' && API.save) {
        API.save({ dailyData, storeList, managerAccounts, categoryList, adminPassword })
            .catch(e => console.warn('API同步失败', e));
    }
    // 同时备份到 localStorage（离线兜底，立即写入）
    try {
        localStorage.setItem('sm_version', String(DATA_VERSION));
        localStorage.setItem('sm_dailyData', JSON.stringify(dailyData));
        localStorage.setItem('sm_stores', JSON.stringify(storeList));
        localStorage.setItem('sm_managers', JSON.stringify(managerAccounts));
        localStorage.setItem('sm_categories', JSON.stringify(categoryList));
        localStorage.setItem('sm_adminPwd', adminPassword);
    } catch (e) { console.warn('localStorage保存失败'); }
}

// 立即保存到服务器（无防抖，用于店铺/业态的增删改等关键操作）
async function saveAllDataNow() {
    // localStorage 立即写入
    try {
        localStorage.setItem('sm_version', String(DATA_VERSION));
        localStorage.setItem('sm_dailyData', JSON.stringify(dailyData));
        localStorage.setItem('sm_stores', JSON.stringify(storeList));
        localStorage.setItem('sm_managers', JSON.stringify(managerAccounts));
        localStorage.setItem('sm_categories', JSON.stringify(categoryList));
        localStorage.setItem('sm_adminPwd', adminPassword);
    } catch (e) { /* ignore */ }

    // 服务器同步（立即，无防抖）
    if (typeof API !== 'undefined' && API.saveNow) {
        try {
            await API.saveNow({ dailyData, storeList, managerAccounts, categoryList, adminPassword });
        } catch (e) { console.warn('API立即同步失败', e); }
    }
}

// 从服务器异步加载全量数据（页面初始化时调用）
async function initAppData() {
    if (typeof API !== 'undefined' && API.init) {
        try {
            const data = await API.init();
            // Supabase 模式下始终接受数据（包括空数据）
            dailyData = data.dailyData || {};
            storeList = data.stores || [];
            managerAccounts = data.managers || [];
            categoryList = (data.categories && data.categories.length > 0) ? data.categories : JSON.parse(JSON.stringify(DEFAULT_CATEGORIES));
            adminPassword = data.adminPassword || '';
            if (!_adminPasswordPlain) _adminPasswordPlain = 'admin123';
            if (storeList.length > 0) {
                console.log('数据已从 Supabase 加载: ' + storeList.length + ' 家店铺');
            } else {
                console.log('Supabase 数据库为空，等待录入');
            }
            // 同步到 localStorage 作为离线缓存
            try {
                localStorage.setItem('sm_version', String(DATA_VERSION));
                localStorage.setItem('sm_dailyData', JSON.stringify(dailyData));
                localStorage.setItem('sm_stores', JSON.stringify(storeList));
                localStorage.setItem('sm_managers', JSON.stringify(managerAccounts));
                localStorage.setItem('sm_categories', JSON.stringify(categoryList));
            } catch (e) {}
            return true;
        } catch (e) {
            console.warn('Supabase 加载失败，尝试本地存储', e);
        }
    }
    // 回退到 localStorage
    if (loadAllData()) return true;
    // 最终回退：初始化默认数据
    initDefaultData();
    saveAllData();
    return false;
}

// ===== API认证登录 =====
// 返回 { success, user, adminPassword? }
async function apiLogin(role, credentials) {
    try {
        const result = await API.login(role, credentials);
        // 登录成功后重新加载数据
        await initAppData();
        return { success: true, user: result.user };
    } catch (e) {
        console.error('API登录失败:', e.message);
        return { success: false, error: e.message };
    }
}

// 尝试本地回退登录
function localLogin(role, credentials) {
    if (role === 'admin') {
        // 使用明文密码副本进行离线比对（adminPassword可能是bcrypt哈希）
        const plainPwd = _adminPasswordPlain || 'admin123';
        if (credentials.username === 'admin' && credentials.password === plainPwd) {
            return { success: true, user: { role: 'admin' } };
        }
        return { success: false, error: '账号或密码错误' };
    } else {
        const phone = credentials.phone;
        const mgr = getManagerByPhone(phone);
        if (!mgr) return { success: false, error: '该手机号未绑定任何店铺' };
        if (credentials.password !== mgr.password) return { success: false, error: '密码错误' };
        // 检查是否管理多个店铺
        const userStores = getManagerStores(phone);
        const storeIds = userStores.map(s => s.id);
        return { success: true, user: { role: 'store', storeId: storeIds[0], storeIds, phone } };
    }
}

// 从服务器刷新数据（定时同步用）
async function refreshFromServer() {
    if (typeof API === 'undefined' || !API.init) return false;
    try {
        const data = await API.init();
        if (data && data.stores) {
            dailyData = data.dailyData || {};
            storeList = data.stores;
            managerAccounts = data.managers || [];
            categoryList = data.categories || [];
            adminPassword = data.adminPassword || 'admin123';
            return true;
        }
    } catch (e) { /* silent */ }
    return false;
}

function loadAllData() {
    try {
        // 版本检测：如果存储的版本低于当前版本，清除旧数据重建
        const savedVersion = parseInt(localStorage.getItem('sm_version') || '0', 10);
        if (savedVersion < DATA_VERSION) {
            console.log(`数据版本升级: ${savedVersion} → ${DATA_VERSION}，正在重建数据…`);
            // 先初始化默认数据，再清除旧数据并保存新数据
            initDefaultData();
            localStorage.removeItem('sm_dailyData');
            localStorage.removeItem('sm_stores');
            localStorage.removeItem('sm_managers');
            localStorage.removeItem('sm_categories');
            localStorage.removeItem('sm_adminPwd');
            saveAllData();
            return true; // 已成功重建
        }

        const dd = localStorage.getItem('sm_dailyData');
        const st = localStorage.getItem('sm_stores');
        const mg = localStorage.getItem('sm_managers');
        const cat = localStorage.getItem('sm_categories');
        const ap = localStorage.getItem('sm_adminPwd');
        if (dd && st && mg) {
            dailyData = JSON.parse(dd);
            storeList = JSON.parse(st);
            managerAccounts = JSON.parse(mg);
            categoryList = cat ? JSON.parse(cat) : JSON.parse(JSON.stringify(DEFAULT_CATEGORIES));
            adminPassword = ap || 'admin123';
            _adminPasswordPlain = adminPassword; // localStorage存的是明文
            return true;
        }
    } catch (e) {
        console.warn('Load failed, rebuilding data…');
        initDefaultData();
        localStorage.removeItem('sm_dailyData');
        localStorage.removeItem('sm_stores');
        localStorage.removeItem('sm_managers');
        localStorage.removeItem('sm_categories');
        localStorage.removeItem('sm_adminPwd');
        localStorage.removeItem('sm_version');
        saveAllData();
        return true;
    }
    return false;
}

// ========== 初始化 ==========
if (typeof window !== 'undefined') {
    // 浏览器环境：由页面脚本异步调用 initAppData() 初始化
} else {
    // Node.js 环境：初始化默认数据供 server.js 导入
    initDefaultData();
}

// 设置所有日期输入框的最大值为今天
function setDateInputMax() {
    const maxDate = formatDate(new Date());
    document.querySelectorAll('input[type="date"]').forEach(el => {
        el.setAttribute('max', maxDate);
    });
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        STORES, DEFAULT_CATEGORIES, MANAGER_ACCOUNTS,
        generateHistoricalData, formatDate, seededRandom, initDefaultData,
        categoryList, storeList, managerAccounts, dailyData, adminPassword
    };
}

function getStoreById(id) { return storeList.find(s => s.id === id); }
function getManagerByPhone(phone) { return managerAccounts.find(m => m.phone === phone); }
function getCategoryByName(name) { return categoryList.find(c => c.name === name); }
function getCategoryById(id) { return categoryList.find(c => c.id === id); }

// 获取某手机号管理的所有店铺
function getManagerStores(phone) {
    const mgrs = managerAccounts.filter(m => m.phone === phone);
    return mgrs.map(m => getStoreById(m.storeId)).filter(Boolean);
}

// ========== 共享工具函数（供 mobile.js 使用，app.js 中也有同名定义会覆盖） ==========

function formatNumber(n) {
    if (n >= 100000000) return (n / 100000000).toFixed(2) + '亿';
    if (n >= 10000) return (n / 10000).toFixed(1) + '万';
    return n.toLocaleString('zh-CN');
}

// 货币格式化：保留完整数值 + 2位小数，不缩写
function formatCurrency(n) {
    if (n == null || isNaN(n)) return '0.00';
    return Number(n).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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

function detectAlerts() {
    const alerts = [];
    const tStr = formatDate(new Date());
    const yesterday = formatDate(new Date(Date.now() - 86400000));
    storeList.forEach(store => {
        const td = dailyData[tStr]?.[store.id];
        const yd = dailyData[yesterday]?.[store.id];
        if (!td?.reported) return;
        const catObj = getCategoryByName(store.category);
        const volatility = catObj ? (catObj.volatility || 0.20) : 0.20;
        if (td.sales < store.baseSales * (1 - volatility)) alerts.push({ level: 'high', store, desc: `销售额异常偏低，仅为正常水平的${Math.round(td.sales/store.baseSales*100)}%`, metric: `今日 ¥${formatCurrency(td.sales)} / 正常 ¥${formatCurrency(store.baseSales)}`, time: tStr });
        if (yd?.reported) {
            const sc = (td.sales - yd.sales) / yd.sales;
            if (sc < -0.3) alerts.push({ level: 'medium', store, desc: `销售额日环比下降 ${Math.abs(sc*100).toFixed(1)}%`, metric: `昨日 ¥${formatCurrency(yd.sales)} → 今日 ¥${formatCurrency(td.sales)}`, time: tStr });
        }
        if (td.conversion < 15 && store.category !== '特色零售') alerts.push({ level: 'medium', store, desc: `转化率仅 ${td.conversion}%`, metric: `客流 ${td.visitors} / 购买 ${td.buyers}`, time: tStr });
        if (td.visitors > store.baseVisitors * 1.5) alerts.push({ level: 'low', store, desc: `客流量增长 ${Math.round((td.visitors/store.baseVisitors-1)*100)}%`, metric: `今日 ${td.visitors} / 常日均 ${store.baseVisitors}`, time: tStr });
    });
    return alerts.sort((a,b) => ({high:0,medium:1,low:2}[a.level]) - ({high:0,medium:1,low:2}[b.level]));
}

function detectUnreported() {
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
            if (!dayData || !dayData.reported) { missingDates.push(dateStr); }
        }
        if (missingDates.length > 0) {
            result.push({ store, missingDates, missingCount: missingDates.length, level: missingDates.length >= 3 ? 'high' : missingDates.length >= 2 ? 'medium' : 'low' });
        }
    });
    return result.sort((a,b) => b.missingCount - a.missingCount);
}
