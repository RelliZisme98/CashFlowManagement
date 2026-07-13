-- SCRIPT KHỞI TẠO CƠ SỞ DỮ LIỆU TRÊN SUPABASE
-- Coppy và chạy script này trong phần SQL Editor của Supabase

-- 1. Bảng cấu hình các gói dịch vụ (Dùng để hiển thị gợi ý & điền giá mặc định khi thêm mới)
CREATE TABLE IF NOT EXISTS public.services_config (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    service_name TEXT UNIQUE NOT NULL,
    default_cost_price NUMERIC NOT NULL DEFAULT 0,
    default_sell_price NUMERIC NOT NULL DEFAULT 0,
    icon_name TEXT DEFAULT 'box',
    notes TEXT
);

-- Bật Row Level Security (RLS) hoặc tắt tùy mục đích. Để đơn giản cho việc quản lý nội bộ,
-- ta có thể tắt RLS hoặc viết rule cho phép đọc ghi tự do nếu không cần phân quyền phức tạp.
ALTER TABLE public.services_config DISABLE ROW LEVEL SECURITY;

-- Thêm dữ liệu mẫu cho các dịch vụ phổ biến
INSERT INTO public.services_config (service_name, default_cost_price, default_sell_price, icon_name, notes)
VALUES 
    ('ChatGPT Plus', 250000, 320000, 'message-square', 'Tài khoản OpenAI Plus chính chủ'),
    ('CapCut Pro', 80000, 150000, 'video', 'Gói Pro edit video mượt mà'),
    ('Google One (Google AI)', 180000, 250000, 'globe', 'Lưu trữ 2TB kèm Google Gemini Advanced'),
    ('Grok AI', 220000, 300000, 'zap', 'Premium X Grok AI'),
    ('Canva Pro', 30000, 80000, 'image', 'Canva thiết kế chuyên nghiệp'),
    ('YouTube Premium', 35000, 79000, 'play', 'Không quảng cáo kèm YouTube Music')
ON CONFLICT (service_name) DO UPDATE 
SET 
    default_cost_price = EXCLUDED.default_cost_price,
    default_sell_price = EXCLUDED.default_sell_price,
    icon_name = EXCLUDED.icon_name,
    notes = EXCLUDED.notes;

-- 2. Bảng quản lý thông tin mua bán tài khoản của khách hàng
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

-- Tạo index để truy vấn nhanh hơn
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_end_date ON public.subscriptions(end_date);
CREATE INDEX IF NOT EXISTS idx_subscriptions_customer_name ON public.subscriptions(customer_name);

-- Thêm một số bản ghi mẫu để giao diện trực quan ngay lập tức
INSERT INTO public.subscriptions (customer_name, customer_phone, service_name, account_email, account_password, cost_price, cost_months, sold_months, sell_price, amount_paid, start_date, end_date, status, notes)
VALUES 
    ('Nguyễn Văn A', '0912345678', 'ChatGPT Plus', 'gpt.user1@gmail.com', 'Pass123@', 250000, 12, 1, 320000, 320000, CURRENT_DATE - INTERVAL '10 days', CURRENT_DATE + INTERVAL '20 days', 'active', 'Gói gốc 1 năm chia nhỏ bán lẻ từng tháng'),
    ('Trần Thị B', '0987654321', 'CapCut Pro', 'capcut.user2@gmail.com', 'Capcut999', 80000, 1, 1, 150000, 150000, CURRENT_DATE - INTERVAL '25 days', CURRENT_DATE + INTERVAL '5 days', 'active', 'Mua gói 1 tháng bán hết luôn'),
    ('Lê Văn C', '0905123456', 'YouTube Premium', 'yt.user3@gmail.com', 'YtPremium1', 350000, 12, 12, 600000, 600000, CURRENT_DATE - INTERVAL '360 days', CURRENT_DATE - INTERVAL '1 days', 'expired', 'Đã hết hạn 1 năm bảo hành'),
    ('Phạm Minh D', '0933445566', 'Google One (Google AI)', 'google.user4@gmail.com', 'GoogleAI2026', 180000, 6, 3, 250000, 200000, CURRENT_DATE - INTERVAL '5 days', CURRENT_DATE + INTERVAL '85 days', 'active', 'Gói gốc 6 tháng, bán cho khách 3 tháng. Khách nợ 50k'),
    ('Hoàng Anh E', '0944556677', 'Grok AI', 'grok.user5@gmail.com', 'GrokAI789', 220000, 1, 1, 300000, 300000, CURRENT_DATE - INTERVAL '12 days', CURRENT_DATE + INTERVAL '18 days', 'active', 'Khách quen chuyển khoản đủ'),
    ('Đỗ Thanh F', '0955667788', 'Canva Pro', 'canva.user6@gmail.com', 'CanvaPro321', 300000, 12, 6, 200000, 200000, CURRENT_DATE - INTERVAL '15 days', CURRENT_DATE + INTERVAL '165 days', 'active', 'Gói gốc Canva 1 năm, bán 6 tháng');
