import { createClient } from '@supabase/supabase-js';

// Khởi tạo các khóa cần thiết từ env hoặc localStorage
const getSupabaseConfig = () => {
  const envUrl = import.meta.env.VITE_SUPABASE_URL;
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  
  const localUrl = localStorage.getItem('supabase_url');
  const localKey = localStorage.getItem('supabase_anon_key');
  
  return {
    url: envUrl || localUrl || '',
    key: envKey || localKey || '',
    source: envUrl && envKey ? 'env' : (localUrl && localKey ? 'local' : 'none')
  };
};

let supabase = null;
const config = getSupabaseConfig();
if (config.url && config.key) {
  try {
    supabase = createClient(config.url, config.key);
  } catch (err) {
    console.error('Không thể kết nối Supabase client:', err);
  }
}

// Hàm cập nhật cấu hình Supabase từ giao diện người dùng
export const saveSupabaseConfig = (url, key) => {
  if (!url || !key) {
    localStorage.removeItem('supabase_url');
    localStorage.removeItem('supabase_anon_key');
    supabase = null;
    return false;
  }
  localStorage.setItem('supabase_url', url);
  localStorage.setItem('supabase_anon_key', key);
  try {
    supabase = createClient(url, key);
    return true;
  } catch (err) {
    console.error('Lỗi khởi tạo Supabase:', err);
    return false;
  }
};

export const clearSupabaseConfig = () => {
  localStorage.removeItem('supabase_url');
  localStorage.removeItem('supabase_anon_key');
  supabase = null;
};

export const getDbStatus = () => {
  const cfg = getSupabaseConfig();
  if (supabase) {
    return {
      type: 'supabase',
      url: cfg.url,
      source: cfg.source
    };
  }
  return {
    type: 'local_storage',
    url: '',
    source: 'none'
  };
};

// --- DỮ LIỆU MẪU ĐỂ KHỞI TẠO NẾU DÙNG LOCAL STORAGE ---
const DEFAULT_SERVICES = [
  { id: '1', service_name: 'ChatGPT Plus', default_cost_price: 250000, default_sell_price: 320000, icon_name: 'message-square' },
  { id: '2', service_name: 'CapCut Pro', default_cost_price: 80000, default_sell_price: 150000, icon_name: 'video' },
  { id: '3', service_name: 'Google One (Google AI)', default_cost_price: 180000, default_sell_price: 250000, icon_name: 'globe' },
  { id: '4', service_name: 'Grok AI', default_cost_price: 220000, default_sell_price: 300000, icon_name: 'zap' },
  { id: '5', service_name: 'Canva Pro', default_cost_price: 30000, default_sell_price: 80000, icon_name: 'image' },
  { id: '6', service_name: 'YouTube Premium', default_cost_price: 35000, default_sell_price: 79000, icon_name: 'play' }
];

const getInitialSubscriptions = () => {
  const today = new Date();
  const formatOffsetDate = (offsetDays) => {
    const d = new Date();
    d.setDate(today.getDate() + offsetDays);
    return d.toISOString().split('T')[0];
  };

  return [
    {
      id: 'sub-1',
      customer_name: 'Nguyễn Văn A',
      customer_phone: '0912345678',
      service_name: 'ChatGPT Plus',
      account_email: 'gpt.user1@gmail.com',
      account_password: 'Pass123@',
      cost_price: 250000,
      cost_months: 12,
      sold_months: 1,
      sell_price: 320000,
      amount_paid: 320000,
      start_date: formatOffsetDate(-10),
      end_date: formatOffsetDate(20),
      status: 'active',
      notes: 'Gói gốc 1 năm chia nhỏ bán lẻ từng tháng'
    },
    {
      id: 'sub-2',
      customer_name: 'Trần Thị B',
      customer_phone: '0987654321',
      service_name: 'CapCut Pro',
      account_email: 'capcut.user2@gmail.com',
      account_password: 'Capcut999',
      cost_price: 80000,
      cost_months: 1,
      sold_months: 1,
      sell_price: 150000,
      amount_paid: 150000,
      start_date: formatOffsetDate(-25),
      end_date: formatOffsetDate(5),
      status: 'active',
      notes: 'Mua gói 1 tháng bán hết luôn'
    },
    {
      id: 'sub-3',
      customer_name: 'Lê Văn C',
      customer_phone: '0905123456',
      service_name: 'YouTube Premium',
      account_email: 'yt.user3@gmail.com',
      account_password: 'YtPremium1',
      cost_price: 350000,
      cost_months: 12,
      sold_months: 12,
      sell_price: 600000,
      amount_paid: 600000,
      start_date: formatOffsetDate(-360),
      end_date: formatOffsetDate(-1),
      status: 'expired',
      notes: 'Đã hết hạn 1 năm bảo hành'
    },
    {
      id: 'sub-4',
      customer_name: 'Phạm Minh D',
      customer_phone: '0933445566',
      service_name: 'Google One (Google AI)',
      account_email: 'google.user4@gmail.com',
      account_password: 'GoogleAI2026',
      cost_price: 180000,
      cost_months: 6,
      sold_months: 3,
      sell_price: 250000,
      amount_paid: 200000,
      start_date: formatOffsetDate(-5),
      end_date: formatOffsetDate(85),
      status: 'active',
      notes: 'Gói gốc 6 tháng, bán cho khách 3 tháng. Khách nợ 50k'
    },
    {
      id: 'sub-5',
      customer_name: 'Hoàng Anh E',
      customer_phone: '0944556677',
      service_name: 'Grok AI',
      account_email: 'grok.user5@gmail.com',
      account_password: 'GrokAI789',
      cost_price: 220000,
      cost_months: 1,
      sold_months: 1,
      sell_price: 300000,
      amount_paid: 300000,
      start_date: formatOffsetDate(-12),
      end_date: formatOffsetDate(18),
      status: 'active',
      notes: 'Khách quen chuyển khoản đủ'
    },
    {
      id: 'sub-6',
      customer_name: 'Đỗ Thanh F',
      customer_phone: '0955667788',
      service_name: 'Canva Pro',
      account_email: 'canva.user6@gmail.com',
      account_password: 'CanvaPro321',
      cost_price: 300000,
      cost_months: 12,
      sold_months: 6,
      sell_price: 200000,
      amount_paid: 200000,
      start_date: formatOffsetDate(-15),
      end_date: formatOffsetDate(165),
      status: 'active',
      notes: 'Gói gốc Canva 1 năm, bán 6 tháng'
    }
  ];
};

// Khởi tạo localStorage nếu chưa có dữ liệu
if (!localStorage.getItem('local_services')) {
  localStorage.setItem('local_services', JSON.stringify(DEFAULT_SERVICES));
}
if (!localStorage.getItem('local_subscriptions')) {
  localStorage.setItem('local_subscriptions', JSON.stringify(getInitialSubscriptions()));
}

// --- CÁC HÀM XỬ LÝ DỊCH VỤ (SERVICES CONFIG) ---
export const fetchServicesConfig = async () => {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('services_config')
        .select('*')
        .order('service_name', { ascending: true });
      if (!error) return data;
      console.warn('Lỗi đọc dịch vụ từ Supabase, chuyển sang LocalStorage:', error);
    } catch (e) {
      console.error(e);
    }
  }
  return JSON.parse(localStorage.getItem('local_services') || '[]');
};

export const addServiceConfig = async (service) => {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('services_config')
        .insert([{
          service_name: service.service_name,
          default_cost_price: Number(service.default_cost_price),
          default_sell_price: Number(service.default_sell_price),
          icon_name: service.icon_name || 'box'
        }])
        .select();
      if (!error) return data[0];
      throw error;
    } catch (e) {
      console.error('Lỗi thêm dịch vụ trên Supabase:', e);
      throw e;
    }
  } else {
    const services = JSON.parse(localStorage.getItem('local_services') || '[]');
    const newService = {
      id: Date.now().toString(),
      service_name: service.service_name,
      default_cost_price: Number(service.default_cost_price),
      default_sell_price: Number(service.default_sell_price),
      icon_name: service.icon_name || 'box'
    };
    // Check trùng tên
    if (services.some(s => s.service_name.toLowerCase() === service.service_name.toLowerCase())) {
      throw new Error('Tên dịch vụ đã tồn tại');
    }
    services.push(newService);
    localStorage.setItem('local_services', JSON.stringify(services));
    return newService;
  }
};

export const updateServiceConfig = async (id, service) => {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('services_config')
        .update({
          service_name: service.service_name,
          default_cost_price: Number(service.default_cost_price),
          default_sell_price: Number(service.default_sell_price),
          icon_name: service.icon_name || 'box'
        })
        .eq('id', id)
        .select();
      if (!error) return data[0];
      throw error;
    } catch (e) {
      console.error('Lỗi cập nhật dịch vụ trên Supabase:', e);
      throw e;
    }
  } else {
    const services = JSON.parse(localStorage.getItem('local_services') || '[]');
    const index = services.findIndex(s => s.id === id);
    if (index === -1) throw new Error('Không tìm thấy dịch vụ');
    
    // Check trùng tên ngoại trừ chính nó
    if (services.some(s => s.id !== id && s.service_name.toLowerCase() === service.service_name.toLowerCase())) {
      throw new Error('Tên dịch vụ đã tồn tại');
    }

    const updated = {
      ...services[index],
      service_name: service.service_name,
      default_cost_price: Number(service.default_cost_price),
      default_sell_price: Number(service.default_sell_price),
      icon_name: service.icon_name || 'box'
    };
    services[index] = updated;
    localStorage.setItem('local_services', JSON.stringify(services));
    return updated;
  }
};

export const deleteServiceConfig = async (id) => {
  if (supabase) {
    try {
      const { error } = await supabase
        .from('services_config')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return true;
    } catch (e) {
      console.error('Lỗi xóa dịch vụ trên Supabase:', e);
      throw e;
    }
  } else {
    const services = JSON.parse(localStorage.getItem('local_services') || '[]');
    const filtered = services.filter(s => s.id !== id);
    localStorage.setItem('local_services', JSON.stringify(filtered));
    return true;
  }
};


// --- CÁC HÀM XỬ LÝ KHÁCH HÀNG / GÓI ĐĂNG KÝ (SUBSCRIPTIONS) ---
export const fetchSubscriptions = async () => {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .order('end_date', { ascending: true });
      if (!error) return data;
      console.warn('Lỗi đọc đơn hàng từ Supabase, chuyển sang LocalStorage:', error);
    } catch (e) {
      console.error(e);
    }
  }
  return JSON.parse(localStorage.getItem('local_subscriptions') || '[]');
};

export const addSubscription = async (sub) => {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .insert([{
          customer_name: sub.customer_name,
          customer_phone: sub.customer_phone || '',
          service_name: sub.service_name,
          account_email: sub.account_email || '',
          account_password: sub.account_password || '',
          cost_price: Number(sub.cost_price || 0),
          cost_months: Number(sub.cost_months || 1),
          sold_months: Number(sub.sold_months || 1),
          sell_price: Number(sub.sell_price || 0),
          amount_paid: Number(sub.amount_paid || 0),
          start_date: sub.start_date,
          end_date: sub.end_date,
          status: sub.status || 'active',
          notes: sub.notes || ''
        }])
        .select();
      if (!error) return data[0];
      throw error;
    } catch (e) {
      console.error('Lỗi thêm đơn hàng trên Supabase:', e);
      throw e;
    }
  } else {
    const subscriptions = JSON.parse(localStorage.getItem('local_subscriptions') || '[]');
    const newSub = {
      id: 'sub-' + Date.now().toString(),
      customer_name: sub.customer_name,
      customer_phone: sub.customer_phone || '',
      service_name: sub.service_name,
      account_email: sub.account_email || '',
      account_password: sub.account_password || '',
      cost_price: Number(sub.cost_price || 0),
      cost_months: Number(sub.cost_months || 1),
      sold_months: Number(sub.sold_months || 1),
      sell_price: Number(sub.sell_price || 0),
      amount_paid: Number(sub.amount_paid || 0),
      start_date: sub.start_date,
      end_date: sub.end_date,
      status: sub.status || 'active',
      notes: sub.notes || ''
    };
    subscriptions.push(newSub);
    localStorage.setItem('local_subscriptions', JSON.stringify(subscriptions));
    return newSub;
  }
};

export const updateSubscription = async (id, sub) => {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .update({
          customer_name: sub.customer_name,
          customer_phone: sub.customer_phone || '',
          service_name: sub.service_name,
          account_email: sub.account_email || '',
          account_password: sub.account_password || '',
          cost_price: Number(sub.cost_price || 0),
          cost_months: Number(sub.cost_months || 1),
          sold_months: Number(sub.sold_months || 1),
          sell_price: Number(sub.sell_price || 0),
          amount_paid: Number(sub.amount_paid || 0),
          start_date: sub.start_date,
          end_date: sub.end_date,
          status: sub.status || 'active',
          notes: sub.notes || ''
        })
        .eq('id', id)
        .select();
      if (!error) return data[0];
      throw error;
    } catch (e) {
      console.error('Lỗi cập nhật đơn hàng trên Supabase:', e);
      throw e;
    }
  } else {
    const subscriptions = JSON.parse(localStorage.getItem('local_subscriptions') || '[]');
    const index = subscriptions.findIndex(s => s.id === id);
    if (index === -1) throw new Error('Không tìm thấy bản ghi đơn hàng');

    const updated = {
      ...subscriptions[index],
      customer_name: sub.customer_name,
      customer_phone: sub.customer_phone || '',
      service_name: sub.service_name,
      account_email: sub.account_email || '',
      account_password: sub.account_password || '',
      cost_price: Number(sub.cost_price || 0),
      cost_months: Number(sub.cost_months || 1),
      sold_months: Number(sub.sold_months || 1),
      sell_price: Number(sub.sell_price || 0),
      amount_paid: Number(sub.amount_paid || 0),
      start_date: sub.start_date,
      end_date: sub.end_date,
      status: sub.status || 'active',
      notes: sub.notes || ''
    };
    subscriptions[index] = updated;
    localStorage.setItem('local_subscriptions', JSON.stringify(subscriptions));
    return updated;
  }
};

export const deleteSubscription = async (id) => {
  if (supabase) {
    try {
      const { error } = await supabase
        .from('subscriptions')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return true;
    } catch (e) {
      console.error('Lỗi xóa đơn hàng trên Supabase:', e);
      throw e;
    }
  } else {
    const subscriptions = JSON.parse(localStorage.getItem('local_subscriptions') || '[]');
    const filtered = subscriptions.filter(s => s.id !== id);
    localStorage.setItem('local_subscriptions', JSON.stringify(filtered));
    return true;
  }
};

// Đồng bộ từ LocalStorage lên Supabase (tiện ích cho người dùng khi cấu hình sau)
export const syncLocalToSupabase = async () => {
  if (!supabase) throw new Error('Chưa kết nối Supabase');
  
  const localServices = JSON.parse(localStorage.getItem('local_services') || '[]');
  const localSubscriptions = JSON.parse(localStorage.getItem('local_subscriptions') || '[]');
  
  let servicesCount = 0;
  let subsCount = 0;
  
  // 1. Đồng bộ services
  for (const s of localServices) {
    try {
      const { error } = await supabase
        .from('services_config')
        .insert([{
          service_name: s.service_name,
          default_cost_price: s.default_cost_price,
          default_sell_price: s.default_sell_price,
          icon_name: s.icon_name
        }])
        .select();
      if (!error) servicesCount++;
    } catch (e) {
      console.warn('Bỏ qua dịch vụ trùng lặp:', s.service_name);
    }
  }
  
  // 2. Đồng bộ subscriptions
  for (const sub of localSubscriptions) {
    try {
      // Bỏ id của local đi để Supabase tự sinh UUID mới tránh xung đột kiểu dữ liệu
      const { error } = await supabase
        .from('subscriptions')
        .insert([{
          customer_name: sub.customer_name,
          customer_phone: sub.customer_phone,
          service_name: sub.service_name,
          account_email: sub.account_email,
          account_password: sub.account_password,
          cost_price: Number(sub.cost_price || 0),
          cost_months: Number(sub.cost_months || 1),
          sold_months: Number(sub.sold_months || 1),
          sell_price: Number(sub.sell_price || 0),
          amount_paid: Number(sub.amount_paid || 0),
          start_date: sub.start_date,
          end_date: sub.end_date,
          status: sub.status,
          notes: sub.notes
        }]);
      if (!error) subsCount++;
    } catch (e) {
      console.error('Không thể đồng bộ đơn hàng:', sub.customer_name, e);
    }
  }
  
  return { servicesCount, subsCount };
};
