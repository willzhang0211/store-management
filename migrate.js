// ========== 数据迁移脚本 ==========
// 将 db.json 数据迁移到 SQLite 数据库
//
// 使用方法:
//   node migrate.js                    — 迁移 db.json → data.db
//   node migrate.js --reset            — 删除 data.db 后用 db.json 重建
//   node migrate.js --seed-only        — 仅生成模拟种子数据，不读取 db.json

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');

const DB_FILE = path.join(__dirname, 'data.db');
const JSON_FILE = path.join(__dirname, 'db.json');

function main() {
    const args = process.argv.slice(2);
    const reset = args.includes('--reset');
    const seedOnly = args.includes('--seed-only');

    if (reset && fs.existsSync(DB_FILE)) {
        fs.unlinkSync(DB_FILE);
        console.log('已删除现有 data.db');
    }

    if (fs.existsSync(DB_FILE)) {
        console.log('data.db 已存在，使用 --reset 重新迁移');
        return;
    }

    const db = new Database(DB_FILE);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');

    // 建表
    db.exec(`
        CREATE TABLE categories (
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

        CREATE TABLE stores (
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

        CREATE TABLE users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT,
            phone TEXT,
            name TEXT DEFAULT '',
            store_id TEXT,
            password TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'store',
            created_at TEXT DEFAULT (datetime('now','localtime'))
        );

        CREATE TABLE daily_data (
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

        CREATE INDEX idx_daily_date ON daily_data(date);
        CREATE INDEX idx_daily_store ON daily_data(store_id);
        CREATE INDEX idx_daily_date_store ON daily_data(date, store_id);
    `);

    let stores, categories, managers, dailyData, adminPassword;

    if (seedOnly || !fs.existsSync(JSON_FILE)) {
        // 仅种子数据（不含模拟历史数据）
        console.log('初始化种子数据（无模拟经营数据）...');
        const seed = require('./data.js');
        stores = JSON.parse(JSON.stringify(seed.STORES));
        categories = JSON.parse(JSON.stringify(seed.DEFAULT_CATEGORIES));
        managers = JSON.parse(JSON.stringify(seed.MANAGER_ACCOUNTS));
        dailyData = {}; // 空数据，从真实填报开始
        adminPassword = 'admin123';
    } else {
        // 从 db.json 读取
        console.log('从 db.json 读取现有数据...');
        const json = JSON.parse(fs.readFileSync(JSON_FILE, 'utf8'));
        stores = json.stores || [];
        categories = json.categories || [];
        managers = json.managers || [];
        dailyData = json.dailyData || {};
        adminPassword = json.adminPassword || 'admin123';
    }

    // 插入业态
    console.log(`迁移 ${categories.length} 个业态...`);
    const insertCat = db.prepare('INSERT OR REPLACE INTO categories (id, name, icon, color, bgColor, desc) VALUES (?,?,?,?,?,?)');
    categories.forEach(c => {
        insertCat.run(c.id, c.name, c.icon || '', c.color || '#1677ff', c.bgColor || '#e6f4ff', c.desc || '');
    });

    // 插入店铺
    console.log(`迁移 ${stores.length} 家店铺...`);
    const insertStore = db.prepare(`INSERT OR REPLACE INTO stores 
        (id, shopNo, name, category, area, areaSize, managerName, managerPhone, baseSales, baseVisitors, baseBuyers)
        VALUES (?,?,?,?,?,?,?,?,?,?,?)`);
    stores.forEach(s => {
        insertStore.run(s.id, s.shopNo, s.name, s.category, s.area, s.areaSize,
            s.managerName, s.managerPhone, s.baseSales || 10000, s.baseVisitors || 100, s.baseBuyers || 60);
    });

    // 插入用户
    console.log(`迁移 ${managers.length + 1} 个用户...`);
    const hash = bcrypt.hashSync('123456', 10);
    const adminHash = bcrypt.hashSync(adminPassword, 10);
    const insertUser = db.prepare('INSERT OR REPLACE INTO users (username, phone, name, store_id, password, role) VALUES (?,?,?,?,?,?)');
    
    // 管理员
    insertUser.run('admin', null, '系统管理员', null, adminHash, 'admin');
    
    // 店长
    managers.forEach(m => {
        const existingHash = m.password && m.password !== '123456' ? bcrypt.hashSync(m.password, 10) : hash;
        insertUser.run(null, m.phone, m.name, m.storeId, existingHash, 'store');
    });

    // 插入每日数据
    console.log('迁移每日数据...');
    const insertData = db.prepare(`INSERT OR REPLACE INTO daily_data 
        (date, store_id, sales, visitors, buyers, avgPrice, conversion, notes, reported)
        VALUES (?,?,?,?,?,?,?,?,?)`);
    
    const days = Object.keys(dailyData);
    let dataCount = 0;
    const insertMany = db.transaction(() => {
        days.forEach(date => {
            Object.entries(dailyData[date]).forEach(([storeId, d]) => {
                insertData.run(date, storeId, d.sales, d.visitors, d.buyers,
                    d.avgPrice || 0, d.conversion || 0, d.notes || '', d.reported ? 1 : 0);
                dataCount++;
            });
        });
    });
    insertMany();

    db.close();

    console.log('========================================');
    console.log('  数据迁移完成！');
    console.log('========================================');
    console.log(`  店铺: ${stores.length} 家`);
    console.log(`  业态: ${categories.length} 个`);
    console.log(`  用户: ${managers.length + 1} 个`);
    console.log(`  数据: ${dataCount} 条 (${days.length} 天)`);
    console.log(`  数据库: ${Math.round(fs.statSync(DB_FILE).size / 1024)}KB`);
    console.log('========================================');
}

main();
