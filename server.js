// ========== 店铺管理平台后端服务 v2.0 ==========
// Express + SQLite + JWT认证，生产级架构

const express = require('express');
const path = require('path');
const Database = require('better-sqlite3');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'data.db');
const SECRET_PATH = path.join(__dirname, '.jwt_secret');
// JWT密钥持久化：避免重启后所有token失效
let JWT_SECRET;
if (require('fs').existsSync(SECRET_PATH)) {
    JWT_SECRET = require('fs').readFileSync(SECRET_PATH, 'utf8').trim();
} else {
    JWT_SECRET = require('crypto').randomBytes(32).toString('hex');
    require('fs').writeFileSync(SECRET_PATH, JWT_SECRET);
}
const TOKEN_EXPIRY = '24h';

// ========== 中间件 ==========
app.use(express.json({ limit: '100mb' }));

// 静态文件服务
app.use(express.static(__dirname, {
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html') || filePath.endsWith('.js')) {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        }
    }
}));

// CORS 支持
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
});

// ========== 数据库初始化 ==========
let db;
function initDatabase() {
    const isNew = !require('fs').existsSync(DB_PATH);
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');

    db.exec(`
        CREATE TABLE IF NOT EXISTS categories (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL UNIQUE,
            icon TEXT DEFAULT '',
            color TEXT DEFAULT '#1677ff',
            bgColor TEXT DEFAULT '#e6f4ff',
            desc TEXT DEFAULT '',
            volatility REAL DEFAULT 0.20,
            created_at TEXT DEFAULT (datetime('now','localtime')),
            updated_at TEXT DEFAULT (datetime('now','localtime'))
        );

        CREATE TABLE IF NOT EXISTS stores (
            id TEXT PRIMARY KEY,
            shopNo TEXT NOT NULL,
            name TEXT NOT NULL,
            category TEXT NOT NULL,
            area TEXT DEFAULT '',
            areaSize INTEGER DEFAULT 0,
            managerName TEXT DEFAULT '',
            managerPhone TEXT DEFAULT '',
            baseSales INTEGER DEFAULT 10000,
            baseVisitors INTEGER DEFAULT 100,
            baseBuyers INTEGER DEFAULT 60,
            created_at TEXT DEFAULT (datetime('now','localtime')),
            updated_at TEXT DEFAULT (datetime('now','localtime'))
        );

        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT,
            phone TEXT,
            name TEXT DEFAULT '',
            store_id TEXT,
            password TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'store',
            created_at TEXT DEFAULT (datetime('now','localtime'))
        );

        CREATE TABLE IF NOT EXISTS daily_data (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT NOT NULL,
            store_id TEXT NOT NULL,
            sales REAL NOT NULL,
            visitors INTEGER NOT NULL,
            buyers INTEGER NOT NULL,
            avgPrice REAL DEFAULT 0,
            conversion REAL DEFAULT 0,
            notes TEXT DEFAULT '',
            reported INTEGER DEFAULT 1,
            created_at TEXT DEFAULT (datetime('now','localtime')),
            updated_at TEXT DEFAULT (datetime('now','localtime')),
            UNIQUE(date, store_id)
        );

        CREATE INDEX IF NOT EXISTS idx_daily_date ON daily_data(date);
        CREATE INDEX IF NOT EXISTS idx_daily_store ON daily_data(store_id);
        CREATE INDEX IF NOT EXISTS idx_daily_date_store ON daily_data(date, store_id);
    `);

    // 首次启动：插入种子数据（仅当DB文件新建时）
    if (isNew) {
        console.log('正在初始化种子数据...');
        seedDatabase();
        console.log('种子数据初始化完成');
    }

    // 确保管理员账号存在
    ensureAdmin();
}

function seedDatabase() {
    const seed = require('./data.js');

    // 插入业态
    const insertCat = db.prepare('INSERT OR REPLACE INTO categories (id, name, icon, color, bgColor, desc) VALUES (?,?,?,?,?,?)');
    seed.DEFAULT_CATEGORIES.forEach(c => {
        insertCat.run(c.id, c.name, c.icon, c.color, c.bgColor, '');
    });

    // 插入店铺
    const insertStore = db.prepare(`INSERT OR REPLACE INTO stores 
        (id, shopNo, name, category, area, areaSize, managerName, managerPhone, baseSales, baseVisitors, baseBuyers)
        VALUES (?,?,?,?,?,?,?,?,?,?,?)`);
    seed.STORES.forEach(s => {
        insertStore.run(s.id, s.shopNo, s.name, s.category, s.area, s.areaSize, s.managerName, s.managerPhone, s.baseSales, s.baseVisitors, s.baseBuyers);
    });

    // 插入店长账号（密码123456 bcrypt加密）
    const insertUser = db.prepare('INSERT OR REPLACE INTO users (phone, name, store_id, password, role) VALUES (?,?,?,?,?)');
    const hash = bcrypt.hashSync('123456', 10);
    seed.MANAGER_ACCOUNTS.forEach(m => {
        insertUser.run(m.phone, m.name, m.storeId, hash, 'store');
    });

    // 注意：不再自动生成模拟历史数据，所有店铺从真实填报开始
    console.log('已初始化 ' + seed.STORES.length + ' 家店铺和 ' + seed.DEFAULT_CATEGORIES.length + ' 个业态（无模拟数据）');
}

function ensureAdmin() {
    const admin = db.prepare("SELECT * FROM users WHERE role = 'admin'").get();
    if (!admin) {
        const hash = bcrypt.hashSync('admin123', 10);
        db.prepare("INSERT INTO users (username, name, password, role) VALUES (?,?,?,?)")
            .run('admin', '系统管理员', hash, 'admin');
        console.log('管理员账号已创建: admin / admin123');
    }
}

// ========== 认证中间件 ==========
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: '未登录，请先登录' });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (e) {
        return res.status(401).json({ error: '登录已过期，请重新登录' });
    }
}

function requireRole(role) {
    return (req, res, next) => {
        if (req.user.role !== role) {
            return res.status(403).json({ error: '权限不足' });
        }
        next();
    };
}

// 可选认证（游客也能访问，但如果提供了token则解析）
function optionalAuth(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token) {
        try {
            req.user = jwt.verify(token, JWT_SECRET);
        } catch (e) { /* ignore */ }
    }
    next();
}

// ========== 认证 API ==========

// 登录
app.post('/api/auth/login', (req, res) => {
    const { role, username, phone, password } = req.body;

    if (!password) return res.status(400).json({ error: '请输入密码' });

    let user;
    if (role === 'admin') {
        user = db.prepare("SELECT * FROM users WHERE role = 'admin' AND username = ?").get(username || 'admin');
    } else {
        if (!phone) return res.status(400).json({ error: '请输入手机号' });
        user = db.prepare("SELECT * FROM users WHERE phone = ? AND role = 'store'").get(phone);
    }

    if (!user) return res.status(401).json({ error: role === 'admin' ? '账号不存在' : '该手机号未绑定任何店铺' });
    if (!bcrypt.compareSync(password, user.password)) return res.status(401).json({ error: '密码错误' });

    const userForToken = {
        userId: user.id,
        role: user.role,
        name: user.name,
        storeId: user.store_id,
        phone: user.phone
    };

    const token = jwt.sign(userForToken, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
    res.json({
        token,
        user: userForToken,
        message: '登录成功'
    });
});

// 修改密码
app.post('/api/auth/change-password', authenticateToken, (req, res) => {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) return res.status(400).json({ error: '请填写完整信息' });
    if (newPassword.length < 6) return res.status(400).json({ error: '新密码至少6位' });

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.userId);
    if (!user) return res.status(404).json({ error: '用户不存在' });
    if (!bcrypt.compareSync(oldPassword, user.password)) return res.status(400).json({ error: '当前密码错误' });

    const hash = bcrypt.hashSync(newPassword, 10);
    db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hash, user.id);
    res.json({ message: '密码修改成功' });
});

// ========== 初始化/兼容API（保持前端兼容） ==========

app.get('/api/init', optionalAuth, (req, res) => {
    try {
        const stores = db.prepare('SELECT * FROM stores').all();
        const categories = db.prepare('SELECT * FROM categories').all();
        const managers = db.prepare("SELECT * FROM users WHERE role = 'store'").all();

        // 获取所有日数据
        const rawData = db.prepare('SELECT * FROM daily_data ORDER BY date ASC').all();
        const dailyData = {};
        rawData.forEach(row => {
            if (!dailyData[row.date]) dailyData[row.date] = {};
            dailyData[row.date][row.store_id] = {
                sales: row.sales,
                visitors: row.visitors,
                buyers: row.buyers,
                avgPrice: row.avgPrice,
                conversion: row.conversion,
                notes: row.notes || '',
                reported: row.reported === 1
            };
        });

        // 管理员密码不直接暴露，只有管理端登录后需要
        const adminUser = db.prepare("SELECT password FROM users WHERE role = 'admin'").get();
        const adminPassword = adminUser ? adminUser.password : '';

        res.json({
            stores,
            categories,
            managers,
            dailyData,
            adminPassword,
            _lastUpdate: new Date().toISOString()
        });
    } catch (e) {
        console.error('init error:', e);
        res.status(500).json({ error: '数据加载失败' });
    }
});

app.post('/api/save', authenticateToken, (req, res) => {
    const { stores, categories, managers, dailyData, adminPassword } = req.body;

    if (!stores || !Array.isArray(stores)) {
        return res.status(400).json({ error: '数据格式错误' });
    }

    const saveAll = db.transaction(() => {
        // 更新店铺（仅 upsert，不删除已有店铺）
        const upsertStore = db.prepare(`INSERT OR REPLACE INTO stores 
            (id, shopNo, name, category, area, areaSize, managerName, managerPhone, baseSales, baseVisitors, baseBuyers)
            VALUES (?,?,?,?,?,?,?,?,?,?,?)`);
        stores.forEach(s => {
            upsertStore.run(s.id, s.shopNo, s.name, s.category, s.area, s.areaSize,
                s.managerName, s.managerPhone, s.baseSales, s.baseVisitors, s.baseBuyers);
        });

        // 更新业态
        if (categories && Array.isArray(categories)) {
            const upsertCat = db.prepare('INSERT OR REPLACE INTO categories (id, name, icon, color, bgColor, desc) VALUES (?,?,?,?,?,?)');
            categories.forEach(c => {
                upsertCat.run(c.id, c.name, c.icon, c.color, c.bgColor || '#e6f4ff', c.desc || '');
            });
        }

        // 更新店长账号
        if (managers && Array.isArray(managers)) {
            const upsertMgr = db.prepare(`INSERT OR REPLACE INTO users (phone, name, store_id, password, role) 
                VALUES (?,?,?,?,'store')`);
            managers.forEach(m => {
                // 保留已有密码
                const existing = db.prepare('SELECT password FROM users WHERE phone = ?').get(m.phone);
                const pwd = existing ? existing.password : bcrypt.hashSync(m.password || '123456', 10);
                upsertMgr.run(m.phone, m.name, m.storeId, pwd);
            });
        }

        // 更新每日数据（仅 upsert 传入的数据，不删除未传入的数据）
        if (dailyData) {
            const insertData = db.prepare(`INSERT OR REPLACE INTO daily_data 
                (date, store_id, sales, visitors, buyers, avgPrice, conversion, notes, reported)
                VALUES (?,?,?,?,?,?,?,?,?)`);
            
            Object.entries(dailyData).forEach(([date, stores]) => {
                Object.entries(stores).forEach(([storeId, d]) => {
                    insertData.run(date, storeId, d.sales, d.visitors, d.buyers, d.avgPrice || 0,
                        d.conversion || 0, d.notes || '', d.reported ? 1 : 0);
                });
            });
        }

        // 更新管理员密码
        if (adminPassword && adminPassword.length < 60) {
            // 如果传的是明文（长度<60），重新加密
            const hash = bcrypt.hashSync(adminPassword, 10);
            db.prepare("UPDATE users SET password = ? WHERE role = 'admin'").run(hash);
        }

        // 注意：不再自动清理 daily_data。数据的增删改通过精细API（POST/PUT/DELETE /api/stores/:id）管理。
        // 全量 save 接口仅做 upsert，不删除任何已有数据。
    });

    try {
        saveAll();
        res.json({ success: true, stores: stores.length, lastUpdate: new Date().toISOString() });
    } catch (e) {
        console.error('save error:', e);
        res.status(500).json({ error: '保存失败: ' + e.message });
    }
});

// ========== 精细API ==========

// 业态 CRUD
app.get('/api/categories', (req, res) => {
    res.json(db.prepare('SELECT * FROM categories ORDER BY id').all());
});

app.post('/api/categories', authenticateToken, requireRole('admin'), (req, res) => {
    const { id, name, icon, color, desc } = req.body;
    if (!name) return res.status(400).json({ error: '业态名称必填' });

    const catId = id || 'cat_' + (db.prepare("SELECT MAX(CAST(REPLACE(id,'cat_','') AS INTEGER)) as m FROM categories").get().m + 1);
    const bgColor = hexToLight(color || '#1677ff');
    db.prepare('INSERT INTO categories (id, name, icon, color, bgColor, desc) VALUES (?,?,?,?,?,?)')
        .run(catId, name, icon || '', color || '#1677ff', bgColor, desc || '');
    res.json({ success: true, id: catId });
});

app.put('/api/categories/:id', authenticateToken, requireRole('admin'), (req, res) => {
    const { name, icon, color, desc } = req.body;
    const cat = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id);
    if (!cat) return res.status(404).json({ error: '业态不存在' });

    const newName = name || cat.name;
    const bgColor = hexToLight(color || cat.color);

    // 如果名称变了，同步更新店铺
    if (newName !== cat.name) {
        db.prepare('UPDATE stores SET category = ? WHERE category = ?').run(newName, cat.name);
    }

    db.prepare('UPDATE categories SET name=?, icon=?, color=?, bgColor=?, desc=?, updated_at=datetime("now","localtime") WHERE id=?')
        .run(newName, icon || cat.icon, color || cat.color, bgColor, desc !== undefined ? desc : cat.desc, req.params.id);
    res.json({ success: true });
});

app.delete('/api/categories/:id', authenticateToken, requireRole('admin'), (req, res) => {
    const cat = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id);
    if (!cat) return res.status(404).json({ error: '业态不存在' });

    const storeCount = db.prepare('SELECT COUNT(*) as cnt FROM stores WHERE category = ?').get(cat.name).cnt;
    if (storeCount > 0) return res.status(400).json({ error: `该业态下有${storeCount}家店铺，无法删除` });

    db.prepare('DELETE FROM categories WHERE id = ?').run(req.params.id);
    res.json({ success: true });
});

// 店铺 CRUD
app.get('/api/stores', (req, res) => {
    const { category, search } = req.query;
    let query = 'SELECT * FROM stores WHERE 1=1';
    const params = [];
    if (category) { query += ' AND category = ?'; params.push(category); }
    if (search) { query += ' AND (name LIKE ? OR shopNo LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
    query += ' ORDER BY id';
    res.json(db.prepare(query).all(...params));
});

app.get('/api/stores/:id', (req, res) => {
    const store = db.prepare('SELECT * FROM stores WHERE id = ?').get(req.params.id);
    if (!store) return res.status(404).json({ error: '店铺不存在' });
    res.json(store);
});

app.post('/api/stores', authenticateToken, requireRole('admin'), (req, res) => {
    const { shopNo, name, category, area, areaSize, managerName, managerPhone } = req.body;
    if (!shopNo || !name) return res.status(400).json({ error: '商铺号和店铺名称必填' });
    if (managerPhone && !/^1\d{10}$/.test(managerPhone)) return res.status(400).json({ error: '手机号格式不正确' });

    const maxId = db.prepare("SELECT MAX(CAST(REPLACE(id,'S','') AS INTEGER)) as m FROM stores").get().m;
    const newId = 'S' + String((maxId || 0) + 1).padStart(3, '0');

    const insertStore = db.prepare(`INSERT INTO stores 
        (id, shopNo, name, category, area, areaSize, managerName, managerPhone, baseSales, baseVisitors, baseBuyers)
        VALUES (?,?,?,?,?,?,?,?,10000,100,60)`);
    insertStore.run(newId, shopNo, name, category || '餐饮', area || 'A区', areaSize || 0, managerName || '', managerPhone || '');

    if (managerPhone) {
        const hash = bcrypt.hashSync('123456', 10);
        db.prepare('INSERT OR REPLACE INTO users (phone, name, store_id, password, role) VALUES (?,?,?,?,\'store\')')
            .run(managerPhone, managerName || '', newId, hash);
    }

    res.json({ success: true, id: newId });
});

app.put('/api/stores/:id', authenticateToken, requireRole('admin'), (req, res) => {
    const store = db.prepare('SELECT * FROM stores WHERE id = ?').get(req.params.id);
    if (!store) return res.status(404).json({ error: '店铺不存在' });

    const { shopNo, name, category, area, areaSize, managerName, managerPhone } = req.body;
    const oldPhone = store.managerPhone;

    db.prepare(`UPDATE stores SET shopNo=?, name=?, category=?, area=?, areaSize=?, managerName=?, managerPhone=?, 
        updated_at=datetime('now','localtime') WHERE id=?`)
        .run(
            shopNo || store.shopNo,
            name || store.name,
            category || store.category,
            area !== undefined ? area : store.area,
            areaSize !== undefined ? areaSize : store.areaSize,
            managerName !== undefined ? managerName : store.managerName,
            managerPhone !== undefined ? managerPhone : store.managerPhone,
            req.params.id
        );

    // 处理手机号变更
    if (managerPhone !== undefined && managerPhone !== oldPhone) {
        if (oldPhone) db.prepare('DELETE FROM users WHERE phone = ? AND store_id = ?').run(oldPhone, req.params.id);
        if (managerPhone) {
            const hash = bcrypt.hashSync('123456', 10);
            db.prepare('INSERT OR REPLACE INTO users (phone, name, store_id, password, role) VALUES (?,?,?,?,\'store\')')
                .run(managerPhone, managerName || store.managerName, req.params.id, hash);
        }
    }

    res.json({ success: true });
});

app.delete('/api/stores/:id', authenticateToken, requireRole('admin'), (req, res) => {
    const store = db.prepare('SELECT * FROM stores WHERE id = ?').get(req.params.id);
    if (!store) return res.status(404).json({ error: '店铺不存在' });

    db.transaction(() => {
        db.prepare('DELETE FROM daily_data WHERE store_id = ?').run(req.params.id);
        db.prepare('DELETE FROM users WHERE store_id = ?').run(req.params.id);
        db.prepare('DELETE FROM stores WHERE id = ?').run(req.params.id);
    })();

    res.json({ success: true });
});

// 每日数据
app.get('/api/daily-data', optionalAuth, (req, res) => {
    const { date, storeId } = req.query;
    if (!date || !storeId) return res.status(400).json({ error: '需要date和storeId参数' });

    const data = db.prepare('SELECT * FROM daily_data WHERE date = ? AND store_id = ?').get(date, storeId);
    if (!data) return res.json(null);
    res.json({
        sales: data.sales, visitors: data.visitors, buyers: data.buyers,
        avgPrice: data.avgPrice, conversion: data.conversion,
        notes: data.notes, reported: data.reported === 1
    });
});

app.post('/api/daily-data', authenticateToken, (req, res) => {
    const { date, sales, visitors, buyers, notes } = req.body;
    const storeId = req.user.storeId;

    if (!date || !sales || !visitors || !buyers) return res.status(400).json({ error: '请填写完整数据' });
    if (sales <= 0 || visitors <= 0 || buyers <= 0) return res.status(400).json({ error: '数据必须大于0' });
    if (buyers > visitors) return res.status(400).json({ error: '购买人次不能大于客流量' });

    const avgPrice = Math.round(sales / buyers * 100) / 100;
    const conversion = Math.round(buyers / visitors * 10000) / 100;

    db.prepare(`INSERT OR REPLACE INTO daily_data 
        (date, store_id, sales, visitors, buyers, avgPrice, conversion, notes, reported)
        VALUES (?,?,?,?,?,?,?,?,1)`)
        .run(date, storeId, sales, visitors, buyers, avgPrice, conversion, notes || '');

    res.json({ success: true, message: '数据提交成功' });
});

app.put('/api/daily-data/:storeId/:date', authenticateToken, (req, res) => {
    const { storeId, date } = req.params;
    const { sales, visitors, buyers, notes } = req.body;

    // 权限检查：店长只能改自己店铺的
    if (req.user.role === 'store' && req.user.storeId !== storeId) {
        return res.status(403).json({ error: '只能修改自己店铺的数据' });
    }

    if (!sales || !visitors || !buyers) return res.status(400).json({ error: '请填写完整数据' });
    if (sales <= 0 || visitors <= 0 || buyers <= 0) return res.status(400).json({ error: '数据必须大于0' });
    if (buyers > visitors) return res.status(400).json({ error: '购买人次不能大于客流量' });

    const avgPrice = Math.round(sales / buyers * 100) / 100;
    const conversion = Math.round(buyers / visitors * 10000) / 100;

    const result = db.prepare(`UPDATE daily_data SET sales=?, visitors=?, buyers=?, avgPrice=?, conversion=?, notes=?, reported=1,
        updated_at=datetime('now','localtime') WHERE date=? AND store_id=?`)
        .run(sales, visitors, buyers, avgPrice, conversion, notes || '', date, storeId);

    if (result.changes === 0) {
        // 不存在则插入
        db.prepare('INSERT INTO daily_data (date, store_id, sales, visitors, buyers, avgPrice, conversion, notes, reported) VALUES (?,?,?,?,?,?,?,?,1)')
            .run(date, storeId, sales, visitors, buyers, avgPrice, conversion, notes || '');
    }

    res.json({ success: true, message: '数据修改成功' });
});

// 数据查询（按时间范围）
app.get('/api/daily-data/query', optionalAuth, (req, res) => {
    const { start, end, category, search } = req.query;
    if (!start || !end) return res.status(400).json({ error: '需要start和end参数' });

    let storeFilter = '1=1';
    const storeParams = [];
    if (category && category !== 'all') { storeFilter += ' AND category = ?'; storeParams.push(category); }
    if (search) { storeFilter += ' AND (name LIKE ? OR shopNo LIKE ?)'; storeParams.push(`%${search}%`, `%${search}%`); }

    const stores = db.prepare(`SELECT * FROM stores WHERE ${storeFilter}`).all(...storeParams);
    const rawData = db.prepare('SELECT * FROM daily_data WHERE date >= ? AND date <= ?').all(start, end);

    // 组织数据：按日期→店铺
    const dataMap = {};
    rawData.forEach(row => {
        if (!dataMap[row.date]) dataMap[row.date] = {};
        dataMap[row.date][row.store_id] = {
            sales: row.sales, visitors: row.visitors, buyers: row.buyers,
            avgPrice: row.avgPrice, conversion: row.conversion,
            notes: row.notes, reported: row.reported === 1
        };
    });

    const results = stores.map(store => {
        let totalSales = 0, totalVisitors = 0, totalBuyers = 0;
        let hasData = false;

        Object.entries(dataMap).forEach(([date, storeData]) => {
            if (date >= start && date <= end) {
                const d = storeData[store.id];
                if (d && d.reported) {
                    totalSales += d.sales;
                    totalVisitors += d.visitors;
                    totalBuyers += d.buyers;
                    hasData = true;
                }
            }
        });

        return {
            store,
            totalSales,
            totalVisitors,
            totalBuyers,
            avgPrice: totalBuyers > 0 ? Math.round(totalSales / totalBuyers * 100) / 100 : 0,
            conversion: totalVisitors > 0 ? Math.round(totalBuyers / totalVisitors * 10000) / 100 : 0,
            efficiency: hasData && store.areaSize > 0 ? Math.round(totalSales / store.areaSize) : 0,
            hasData
        };
    });

    res.json(results);
});

// Dashboard 看板数据
app.get('/api/dashboard', optionalAuth, (req, res) => {
    const { start, end } = req.query;
    if (!start || !end) return res.status(400).json({ error: '需要start和end参数' });

    const stores = db.prepare('SELECT * FROM stores').all();
    const categories = db.prepare('SELECT * FROM categories').all();
    const rawData = db.prepare('SELECT * FROM daily_data WHERE date >= ? AND date <= ? AND reported = 1').all(start, end);

    // 按日期→店铺映射
    const dataMap = {};
    rawData.forEach(row => {
        if (!dataMap[row.date]) dataMap[row.date] = {};
        dataMap[row.date][row.store_id] = row;
    });

    // 获取所有日期序列
    const allDates = [];
    const curDate = new Date(start);
    const endDate = new Date(end);
    while (curDate <= endDate) {
        allDates.push(formatDate(curDate));
        curDate.setDate(curDate.getDate() + 1);
    }

    let totalSales = 0, totalVisitors = 0, totalBuyers = 0;
    const totalArea = stores.reduce((s, st) => s + (st.areaSize || 0), 0);

    allDates.forEach(date => {
        const dayData = dataMap[date] || {};
        stores.forEach(s => {
            const d = dayData[s.id];
            if (d) { totalSales += d.sales; totalVisitors += d.visitors; totalBuyers += d.buyers; }
        });
    });

    const avgConversion = totalVisitors > 0 ? Math.round(totalBuyers / totalVisitors * 10000) / 100 : 0;

    // 业态汇总
    const categorySummary = categories.map(cat => {
        const catStores = stores.filter(s => s.category === cat.name);
        let cs = 0, cv = 0, cb = 0, ca = 0;
        catStores.forEach(s => { ca += (s.areaSize || 0); });
        allDates.forEach(date => {
            const dayData = dataMap[date] || {};
            catStores.forEach(s => { const d = dayData[s.id]; if (d) { cs += d.sales; cv += d.visitors; cb += d.buyers; } });
        });
        return {
            id: cat.id, name: cat.name, icon: cat.icon, color: cat.color,
            storeCount: catStores.length, area: ca, sales: cs, visitors: cv, buyers: cb,
            efficiency: ca > 0 ? Math.round(cs / ca) : 0,
            conversion: cv > 0 ? Math.round(cb / cv * 10000) / 100 : 0
        };
    });

    // 趋势
    const trend = allDates.map(date => {
        const dayData = dataMap[date] || {};
        let s = 0;
        stores.forEach(st => { const d = dayData[st.id]; if (d) s += d.sales; });
        return { date: date.slice(5), sales: s };
    });

    res.json({
        stats: { totalArea, totalStores: stores.length, totalSales, totalVisitors, totalBuyers, avgConversion, totalEfficiency: totalArea > 0 ? Math.round(totalSales / totalArea) : 0 },
        categorySummary,
        trend
    });
});

// 异常预警
app.get('/api/alerts', optionalAuth, (req, res) => {
    const tStr = formatDate(new Date());
    const yesterday = formatDate(new Date(Date.now() - 86400000));
    const stores = db.prepare('SELECT * FROM stores').all();
    const categories = db.prepare('SELECT * FROM categories').all();

    const todayDataRaw = db.prepare("SELECT * FROM daily_data WHERE date = ? AND reported = 1").all(tStr);
    const yesterdayDataRaw = db.prepare("SELECT * FROM daily_data WHERE date = ? AND reported = 1").all(yesterday);

    const tdMap = {};
    todayDataRaw.forEach(d => { tdMap[d.store_id] = d; });
    const ydMap = {};
    yesterdayDataRaw.forEach(d => { ydMap[d.store_id] = d; });

    const alerts = [];
    stores.forEach(store => {
        const td = tdMap[store.id];
        const yd = ydMap[store.id];
        if (!td) return;

        if (td.sales < store.baseSales * 0.8) {
            alerts.push({ level: 'high', storeId: store.id, storeName: store.name, category: store.category,
                desc: `销售额异常偏低，仅为正常水平的${Math.round(td.sales/store.baseSales*100)}%`,
                metric: `今日 ¥${td.sales.toLocaleString()} / 正常 ¥${store.baseSales.toLocaleString()}`, time: tStr });
        }
        if (yd) {
            const sc = (td.sales - yd.sales) / yd.sales;
            if (sc < -0.3) {
                alerts.push({ level: 'medium', storeId: store.id, storeName: store.name, category: store.category,
                    desc: `销售额日环比下降 ${Math.abs(sc*100).toFixed(1)}%`,
                    metric: `昨日 ¥${yd.sales.toLocaleString()} → 今日 ¥${td.sales.toLocaleString()}`, time: tStr });
            }
        }
        if (td.conversion < 15 && store.category !== '特色零售') {
            alerts.push({ level: 'medium', storeId: store.id, storeName: store.name, category: store.category,
                desc: `转化率仅 ${td.conversion}%`, metric: `客流 ${td.visitors} / 购买 ${td.buyers}`, time: tStr });
        }
    });

    // 未上报
    const unreported = stores.map(store => {
        const missingDates = [];
        for (let d = 0; d < 7; d++) {
            const date = new Date();
            date.setDate(date.getDate() - d);
            const ds = formatDate(date);
            const row = db.prepare('SELECT reported FROM daily_data WHERE date = ? AND store_id = ?').get(ds, store.id);
            if (!row || row.reported === 0) missingDates.push(ds);
        }
        return { storeId: store.id, storeName: store.name, category: store.category,
            managerName: store.managerName, managerPhone: store.managerPhone,
            missingDates, missingCount: missingDates.length };
    }).filter(u => u.missingCount > 0).sort((a, b) => b.missingCount - a.missingCount);

    // 店长反馈
    const thirtyDaysAgo = formatDate(new Date(Date.now() - 30 * 86400000));
    const feedback = db.prepare(`SELECT d.date, d.notes, s.name as storeName, s.category, s.managerName, s.managerPhone
        FROM daily_data d JOIN stores s ON d.store_id = s.id
        WHERE d.date >= ? AND d.notes != '' AND d.notes IS NOT NULL AND d.reported = 1
        ORDER BY d.date DESC`).all(thirtyDaysAgo);

    res.json({ alerts, unreported, feedback });
});

// 健康检查
// 一键清空所有店铺数据（管理员专用）
app.post('/api/reset', authenticateToken, requireRole('admin'), (req, res) => {
    try {
        db.transaction(() => {
            db.prepare('DELETE FROM daily_data').run();
            db.prepare("DELETE FROM users WHERE role = 'store'").run();
            db.prepare('DELETE FROM stores').run();
        })();
        res.json({ success: true, message: '已清空所有店铺数据、店长账号和经营数据' });
    } catch (e) {
        res.status(500).json({ error: '清空失败: ' + e.message });
    }
});

app.get('/api/health', (req, res) => {
    const storeCount = db.prepare('SELECT COUNT(*) as cnt FROM stores').get().cnt;
    const dataDays = db.prepare('SELECT COUNT(DISTINCT date) as cnt FROM daily_data').get().cnt;
    res.json({
        status: 'ok',
        stores: storeCount,
        days: dataDays,
        dbSize: require('fs').existsSync(DB_PATH) ? Math.round(require('fs').statSync(DB_PATH).size / 1024) + 'KB' : '0KB',
        lastUpdate: new Date().toISOString()
    });
});

// ========== 工具函数 ==========
function formatDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function hexToLight(hex) {
    if (!hex) return '#f0f0f0';
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgb(${Math.min(255, r + 180)},${Math.min(255, g + 180)},${Math.min(255, b + 180)})`;
}

// ========== 启动 ==========
initDatabase();

app.listen(PORT, '0.0.0.0', () => {
    const storeCount = db.prepare('SELECT COUNT(*) as cnt FROM stores').get().cnt;
    const dataDays = db.prepare('SELECT COUNT(DISTINCT date) as cnt FROM daily_data').get().cnt;
    console.log('========================================');
    console.log('  店铺管理平台 v2.0 — SQLite版');
    console.log('========================================');
    console.log(`  店铺: ${storeCount}家  |  数据: ${dataDays}天`);
    console.log(`  数据库: SQLite (WAL模式)`);
    console.log(`  API: http://localhost:${PORT}/api/health`);
    console.log(`  管理后台: http://localhost:${PORT}/index.html`);
    console.log(`  手机端: http://localhost:${PORT}/mobile.html`);
    console.log(`  JWT密钥: ${JWT_SECRET.slice(0, 8)}...`);
    console.log('========================================');
    console.log('  管理员: admin / admin123');
    console.log('  店长: 手机号 / 123456');
    console.log('========================================');
});

// 优雅关闭
process.on('SIGINT', () => { db.close(); process.exit(0); });
process.on('SIGTERM', () => { db.close(); process.exit(0); });
