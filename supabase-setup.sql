-- ========== 店铺管理平台 - Supabase 数据库初始化 ==========

-- 1. 业态分类
CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    icon TEXT DEFAULT '',
    color TEXT DEFAULT '#1677ff',
    bgColor TEXT DEFAULT '#e6f4ff',
    description TEXT DEFAULT '',
    volatility REAL DEFAULT 0.20,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 店铺
CREATE TABLE IF NOT EXISTS stores (
    id TEXT PRIMARY KEY,
    shopNo TEXT NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL REFERENCES categories(name) ON DELETE RESTRICT,
    area TEXT DEFAULT '',
    areaSize INTEGER DEFAULT 0,
    managerName TEXT DEFAULT '',
    managerPhone TEXT DEFAULT '',
    baseSales INTEGER DEFAULT 10000,
    baseVisitors INTEGER DEFAULT 100,
    baseBuyers INTEGER DEFAULT 60,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 用户账号
CREATE TABLE IF NOT EXISTS app_users (
    id SERIAL PRIMARY KEY,
    username TEXT UNIQUE,
    phone TEXT UNIQUE,
    name TEXT DEFAULT '',
    store_id TEXT REFERENCES stores(id) ON DELETE CASCADE,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'store' CHECK (role IN ('admin', 'store')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. 每日经营数据
CREATE TABLE IF NOT EXISTS daily_data (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    store_id TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    sales NUMERIC(12,2) NOT NULL,
    visitors INTEGER NOT NULL,
    buyers INTEGER NOT NULL,
    avgPrice NUMERIC(10,2) DEFAULT 0,
    conversion NUMERIC(5,2) DEFAULT 0,
    notes TEXT DEFAULT '',
    reported BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(date, store_id)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_daily_date ON daily_data(date);
CREATE INDEX IF NOT EXISTS idx_daily_store ON daily_data(store_id);
CREATE INDEX IF NOT EXISTS idx_daily_date_store ON daily_data(date, store_id);

-- ========== 行级安全策略 (RLS) ==========

-- 允许公开读取（匿名访问客户端 API）
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_data ENABLE ROW LEVEL SECURITY;

-- 允许 anon key 对所有表执行所有操作（内部应用，不对外公开）
CREATE POLICY "Allow all on categories" ON categories FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on stores" ON stores FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on app_users" ON app_users FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on daily_data" ON daily_data FOR ALL TO anon USING (true) WITH CHECK (true);

-- ========== 触发器：自动更新 updated_at ==========

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_categories_updated_at BEFORE UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_stores_updated_at BEFORE UPDATE ON stores FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_daily_data_updated_at BEFORE UPDATE ON daily_data FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ========== 初始管理员 ==========
-- 密码: admin123 (bcrypt 哈希)
INSERT INTO app_users (username, name, password, role)
VALUES ('admin', '系统管理员', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'admin')
ON CONFLICT (username) DO NOTHING;
