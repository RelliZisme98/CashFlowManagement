-- SCRIPT KHỞI TẠO CƠ SỞ DỮ LIỆU TRÊN SUPABASE (HỖ TRỢ CẢ TẠO MỚI VÀ CẬP NHẬT)
-- Coppy và chạy script này trong phần SQL Editor của Supabase

-- 1. Bảng quản lý Cộng tác viên (CTV)
CREATE TABLE IF NOT EXISTS public.collaborators (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    name TEXT UNIQUE NOT NULL,
    phone TEXT,
    notes TEXT
);

ALTER TABLE public.collaborators DISABLE ROW LEVEL SECURITY;

-- 2. Bảng cấu hình các gói dịch vụ
CREATE TABLE IF NOT EXISTS public.services_config (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    service_name TEXT UNIQUE NOT NULL,
    default_cost_price NUMERIC NOT NULL DEFAULT 0,
    default_sell_price NUMERIC NOT NULL DEFAULT 0,
    icon_name TEXT DEFAULT 'box',
    notes TEXT
);

ALTER TABLE public.services_config DISABLE ROW LEVEL SECURITY;

-- [CẬP NHẬT] Đảm bảo cột default_commission tồn tại trong services_config
ALTER TABLE public.services_config ADD COLUMN IF NOT EXISTS default_commission NUMERIC NOT NULL DEFAULT 0;

-- Cập nhật dữ liệu cho 25 gói dịch vụ theo bảng giá và hoa hồng của khách hàng
INSERT INTO public.services_config (service_name, default_cost_price, default_sell_price, default_commission, icon_name, notes)
VALUES 
    ('Canva Education (1 Năm - Kích hoạt slot)', 40000, 100000, 20000, 'image', 'Bảo hành'),
    ('Meitu VIP+', 40000, 80000, 10000, 'image', 'Bảo hành'),
    ('CapCut Pro Team (1 Tháng - Cấp acc)', 40000, 79000, 10000, 'video', 'Bảo hành'),
    ('CapCut Cá nhân Login Email (5-6 Tháng - Cấp acc)', 200000, 419000, 20000, 'video', 'Bảo hành'),
    ('CapCut Pro Team/Cá nhân (6-7 Ngày - Cấp acc)', 15000, 35000, 8000, 'video', 'Bảo hành'),
    ('YouTube Premium (1 Tháng)', 20000, 45000, 7000, 'play', 'Bảo hành'),
    ('ChatGPT Plus (1 Tháng - Acc riêng)', 90000, 149000, 25000, 'message-square', 'Bảo hành'),
    ('ChatGPT Plus Apple Pay (1 Tháng trial - Acc riêng)', 100000, 180000, 25000, 'message-square', 'Bảo hành'),
    ('Grok Super (1 Tháng)', 120000, 200000, 30000, 'zap', 'Bảo hành'),
    ('Grok Super (2 Tháng)', 240000, 390000, 50000, 'zap', 'Bảo hành'),
    ('Grok Super (3 Tháng)', 360000, 580000, 70000, 'zap', 'Bảo hành'),
    ('Grok Super (6 Tháng)', 700000, 1150000, 100000, 'zap', 'Bảo hành'),
    ('Grok Super (1 Năm)', 1200000, 2000000, 150000, 'zap', 'Bảo hành'),
    ('Super Grok Inapp (11-12 Tháng - Change mail)', 1200000, 1999999, 150000, 'zap', 'Bảo hành'),
    ('Super Grok Inapp (2 Năm - Change mail)', 2200000, 3799000, 250000, 'zap', 'Bảo hành'),
    ('Grok Super Inapp Hotmail (13-14 Ngày)', 50000, 100000, 20000, 'zap', 'Bảo hành'),
    ('Nâng Cấp Grok Chính Chủ (1 Tháng)', 240000, 399000, 30000, 'zap', 'Bảo hành'),
    ('Nâng Cấp Grok Chính Chủ (3 Tháng)', 450000, 699000, 40000, 'zap', 'Bảo hành'),
    ('Google AI Pro 5TB (1 Năm)', 50000, 99000, 30000, 'globe', 'Bảo hành - Giá bán tính theo tháng'),
    ('Gemini AI 5TB Chính Chủ (1 Năm)', 90000, 159000, 15000, 'globe', 'Bảo hành - Giá bán tính theo tháng'),
    ('Gemini AI Pro (18 Tháng - Link kích hoạt)', 25000, 59000, 20000, 'globe', 'Không bảo hành (đóng ít nhất 3 tháng) - Giá bán tính theo tháng'),
    ('Microsoft 365 (1 Năm - 5 Thiết bị)', 150000, 350000, 50000, 'box', 'Bảo hành'),
    ('Super Duolingo Nâng Cấp Chính Chủ (1 Năm)', 150000, 349000, 50000, 'play', 'Bảo hành'),
    ('SCRIBD Premium/Trial (7 Ngày - 1 Tháng)', 20000, 49000, 8000, 'box', 'Bảo hành'),
    ('Zoom Pro (28 Ngày)', 30000, 59000, 8000, 'video', 'Bảo hành')
ON CONFLICT (service_name) DO UPDATE 
SET 
    default_cost_price = EXCLUDED.default_cost_price,
    default_sell_price = EXCLUDED.default_sell_price,
    default_commission = EXCLUDED.default_commission,
    icon_name = EXCLUDED.icon_name,
    notes = EXCLUDED.notes;

-- 3. Bảng quản lý thông tin mua bán tài khoản của khách hàng
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT,
    service_name TEXT NOT NULL,
    account_email TEXT,
    account_password TEXT,
    cost_price NUMERIC NOT NULL DEFAULT 0,
    cost_months INTEGER NOT NULL DEFAULT 1,
    sold_months INTEGER NOT NULL DEFAULT 1,
    sell_price NUMERIC NOT NULL DEFAULT 0,
    amount_paid NUMERIC NOT NULL DEFAULT 0,
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'canceled')),
    notes TEXT
);

ALTER TABLE public.subscriptions DISABLE ROW LEVEL SECURITY;

-- [CẬP NHẬT] Đảm bảo các cột liên quan đến CTV và hoa hồng tồn tại trong subscriptions
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS collaborator_id UUID REFERENCES public.collaborators(id) ON DELETE SET NULL;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS commission_amount NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS commission_status TEXT NOT NULL DEFAULT 'none' CHECK (commission_status IN ('none', 'pending', 'paid'));

-- Tạo index để truy vấn nhanh hơn
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_end_date ON public.subscriptions(end_date);
CREATE INDEX IF NOT EXISTS idx_subscriptions_customer_name ON public.subscriptions(customer_name);
CREATE INDEX IF NOT EXISTS idx_subscriptions_collaborator_id ON public.subscriptions(collaborator_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_commission_status ON public.subscriptions(commission_status);

-- 4. Thêm CTV mẫu
INSERT INTO public.collaborators (name, phone, notes)
VALUES 
    ('Nguyễn Văn CTV', '0999888777', 'Cộng tác viên khu vực Hà Nội'),
    ('Trần Thị CTV', '0999666555', 'Cộng tác viên khu vực TP.HCM')
ON CONFLICT (name) DO NOTHING;
