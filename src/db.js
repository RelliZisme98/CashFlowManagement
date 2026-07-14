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
  { id: '1', service_name: 'Canva Education (1 Năm - Kích hoạt slot)', default_cost_price: 40000, default_sell_price: 100000, default_commission: 20000, icon_name: 'image', notes: 'Bảo hành' },
  { id: '2', service_name: 'Meitu VIP+', default_cost_price: 40000, default_sell_price: 80000, default_commission: 10000, icon_name: 'image', notes: 'Bảo hành' },
  { id: '3', service_name: 'CapCut Pro Team (1 Tháng - Cấp acc)', default_cost_price: 40000, default_sell_price: 79000, default_commission: 10000, icon_name: 'video', notes: 'Bảo hành' },
  { id: '4', service_name: 'CapCut Cá nhân Login Email (5-6 Tháng - Cấp acc)', default_cost_price: 200000, default_sell_price: 419000, default_commission: 20000, icon_name: 'video', notes: 'Bảo hành' },
  { id: '5', service_name: 'CapCut Pro Team/Cá nhân (6-7 Ngày - Cấp acc)', default_cost_price: 15000, default_sell_price: 35000, default_commission: 8000, icon_name: 'video', notes: 'Bảo hành' },
  { id: '6', service_name: 'YouTube Premium (1 Tháng)', default_cost_price: 20000, default_sell_price: 45000, default_commission: 7000, icon_name: 'play', notes: 'Bảo hành' },
  { id: '7', service_name: 'ChatGPT Plus (1 Tháng - Acc riêng)', default_cost_price: 90000, default_sell_price: 149000, default_commission: 25000, icon_name: 'message-square', notes: 'Bảo hành' },
  { id: '8', service_name: 'ChatGPT Plus Apple Pay (1 Tháng trial - Acc riêng)', default_cost_price: 100000, default_sell_price: 180000, default_commission: 25000, icon_name: 'message-square', notes: 'Bảo hành' },
  { id: '9', service_name: 'Grok Super (1 Tháng)', default_cost_price: 120000, default_sell_price: 200000, default_commission: 30000, icon_name: 'zap', notes: 'Bảo hành' },
  { id: '10', service_name: 'Grok Super (2 Tháng)', default_cost_price: 240000, default_sell_price: 390000, default_commission: 50000, icon_name: 'zap', notes: 'Bảo hành' },
  { id: '11', service_name: 'Grok Super (3 Tháng)', default_cost_price: 360000, default_sell_price: 580000, default_commission: 70000, icon_name: 'zap', notes: 'Bảo hành' },
  { id: '12', service_name: 'Grok Super (6 Tháng)', default_cost_price: 700000, default_sell_price: 1150000, default_commission: 100000, icon_name: 'zap', notes: 'Bảo hành' },
  { id: '13', service_name: 'Grok Super (1 Năm)', default_cost_price: 1200000, default_sell_price: 2000000, default_commission: 150000, icon_name: 'zap', notes: 'Bảo hành' },
  { id: '14', service_name: 'Super Grok Inapp (11-12 Tháng - Change mail)', default_cost_price: 1200000, default_sell_price: 1999999, default_commission: 150000, icon_name: 'zap', notes: 'Bảo hành' },
  { id: '15', service_name: 'Super Grok Inapp (2 Năm - Change mail)', default_cost_price: 2200000, default_sell_price: 3799000, default_commission: 250000, icon_name: 'zap', notes: 'Bảo hành' },
  { id: '16', service_name: 'Grok Super Inapp Hotmail (13-14 Ngày)', default_cost_price: 50000, default_sell_price: 100000, default_commission: 20000, icon_name: 'zap', notes: 'Bảo hành' },
  { id: '17', service_name: 'Nâng Cấp Grok Chính Chủ (1 Tháng)', default_cost_price: 240000, default_sell_price: 399000, default_commission: 30000, icon_name: 'zap', notes: 'Bảo hành' },
  { id: '18', service_name: 'Nâng Cấp Grok Chính Chủ (3 Tháng)', default_cost_price: 450000, default_sell_price: 699000, default_commission: 40000, icon_name: 'zap', notes: 'Bảo hành' },
  { id: '19', service_name: 'Google AI Pro 5TB (1 Năm)', default_cost_price: 50000, default_sell_price: 99000, default_commission: 30000, icon_name: 'globe', notes: 'Bảo hành - Tính theo tháng' },
  { id: '20', service_name: 'Gemini AI 5TB Chính Chủ (1 Năm)', default_cost_price: 90000, default_sell_price: 159000, default_commission: 15000, icon_name: 'globe', notes: 'Bảo hành - Tính theo tháng' },
  { id: '21', service_name: 'Gemini AI Pro (18 Tháng - Link kích hoạt)', default_cost_price: 25000, default_sell_price: 59000, default_commission: 20000, icon_name: 'globe', notes: 'Không bảo hành (đóng ít nhất 3 tháng) - Tính theo tháng' },
  { id: '22', service_name: 'Microsoft 365 (1 Năm - 5 Thiết bị)', default_cost_price: 150000, default_sell_price: 350000, default_commission: 50000, icon_name: 'box', notes: 'Bảo hành' },
  { id: '23', service_name: 'Super Duolingo Nâng Cấp Chính Chủ (1 Năm)', default_cost_price: 150000, default_sell_price: 349000, default_commission: 50000, icon_name: 'play', notes: 'Bảo hành' },
  { id: '24', service_name: 'SCRIBD Premium/Trial (7 Ngày - 1 Tháng)', default_cost_price: 20000, default_sell_price: 49000, default_commission: 8000, icon_name: 'box', notes: 'Bảo hành' },
  { id: '25', service_name: 'Zoom Pro (28 Ngày)', default_cost_price: 30000, default_sell_price: 59000, default_commission: 8000, icon_name: 'video', notes: 'Bảo hành' }
];

const DEFAULT_COLLABORATORS = [
  { id: 'collab-1', name: 'Nguyễn Văn CTV', phone: '0999888777', notes: 'Cộng tác viên khu vực Hà Nội', created_at: new Date().toISOString() },
  { id: 'collab-2', name: 'Trần Thị CTV', phone: '0999666555', notes: 'Cộng tác viên khu vực TP.HCM', created_at: new Date().toISOString() }
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
      service_name: 'ChatGPT Plus (1 Tháng - Acc riêng)',
      account_email: 'gpt.user1@gmail.com',
      account_password: 'Pass123@',
      cost_price: 90000,
      cost_months: 1,
      sold_months: 1,
      sell_price: 149000,
      amount_paid: 149000,
      start_date: formatOffsetDate(-10),
      end_date: formatOffsetDate(20),
      status: 'active',
      notes: 'Khách hàng từ Nguyễn Văn CTV giới thiệu',
      collaborator_id: 'collab-1',
      commission_amount: 25000,
      commission_status: 'pending'
    },
    {
      id: 'sub-2',
      customer_name: 'Trần Thị B',
      customer_phone: '0987654321',
      service_name: 'CapCut Pro Team (1 Tháng - Cấp acc)',
      account_email: 'capcut.user2@gmail.com',
      account_password: 'Capcut999',
      cost_price: 40000,
      cost_months: 1,
      sold_months: 1,
      sell_price: 79000,
      amount_paid: 79000,
      start_date: formatOffsetDate(-25),
      end_date: formatOffsetDate(5),
      status: 'active',
      notes: 'Trần Thị CTV đã nhận hoa hồng',
      collaborator_id: 'collab-2',
      commission_amount: 10000,
      commission_status: 'paid'
    },
    {
      id: 'sub-3',
      customer_name: 'Lê Văn C',
      customer_phone: '0905123456',
      service_name: 'YouTube Premium (1 Tháng)',
      account_email: 'yt.user3@gmail.com',
      account_password: 'YtPremium1',
      cost_price: 20000,
      cost_months: 1,
      sold_months: 1,
      sell_price: 45000,
      amount_paid: 45000,
      start_date: formatOffsetDate(-35),
      end_date: formatOffsetDate(-5),
      status: 'expired',
      notes: 'Khách cũ không có CTV',
      collaborator_id: '',
      commission_amount: 0,
      commission_status: 'none'
    },
    {
      id: 'sub-4',
      customer_name: 'Phạm Minh D',
      customer_phone: '0933445566',
      service_name: 'Google AI Pro 5TB (1 Năm)',
      account_email: 'google.user4@gmail.com',
      account_password: 'GoogleAI2026',
      cost_price: 50000,
      cost_months: 12,
      sold_months: 3,
      sell_price: 99000,
      amount_paid: 99000,
      start_date: formatOffsetDate(-5),
      end_date: formatOffsetDate(85),
      status: 'active',
      notes: 'Bán lẻ theo tháng qua CTV Nguyễn Văn',
      collaborator_id: 'collab-1',
      commission_amount: 30000,
      commission_status: 'pending'
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
if (!localStorage.getItem('local_collaborators')) {
  localStorage.setItem('local_collaborators', JSON.stringify(DEFAULT_COLLABORATORS));
}

// --- CÁC HÀM XỬ LÝ CTV (COLLABORATORS) ---
export const fetchCollaborators = async () => {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('collaborators')
        .select('*')
        .order('name', { ascending: true });
      if (!error) return data;
      console.warn('Lỗi đọc CTV từ Supabase, chuyển sang LocalStorage:', error);
    } catch (e) {
      console.error(e);
    }
  }
  return JSON.parse(localStorage.getItem('local_collaborators') || '[]');
};

export const addCollaborator = async (collab) => {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('collaborators')
        .insert([{
          name: collab.name,
          phone: collab.phone || '',
          notes: collab.notes || ''
        }])
        .select();
      if (!error) return data[0];
      throw error;
    } catch (e) {
      console.error('Lỗi thêm CTV trên Supabase:', e);
      throw e;
    }
  } else {
    const collaborators = JSON.parse(localStorage.getItem('local_collaborators') || '[]');
    const newCollab = {
      id: 'collab-' + Date.now().toString(),
      name: collab.name,
      phone: collab.phone || '',
      notes: collab.notes || '',
      created_at: new Date().toISOString()
    };
    if (collaborators.some(c => c.name.toLowerCase() === collab.name.toLowerCase())) {
      throw new Error('Tên CTV đã tồn tại');
    }
    collaborators.push(newCollab);
    localStorage.setItem('local_collaborators', JSON.stringify(collaborators));
    return newCollab;
  }
};

export const updateCollaborator = async (id, collab) => {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('collaborators')
        .update({
          name: collab.name,
          phone: collab.phone || '',
          notes: collab.notes || ''
        })
        .eq('id', id)
        .select();
      if (!error) return data[0];
      throw error;
    } catch (e) {
      console.error('Lỗi cập nhật CTV trên Supabase:', e);
      throw e;
    }
  } else {
    const collaborators = JSON.parse(localStorage.getItem('local_collaborators') || '[]');
    const index = collaborators.findIndex(c => c.id === id);
    if (index === -1) throw new Error('Không tìm thấy thông tin CTV');
    
    if (collaborators.some(c => c.id !== id && c.name.toLowerCase() === collab.name.toLowerCase())) {
      throw new Error('Tên CTV đã tồn tại');
    }
 
    const updated = {
      ...collaborators[index],
      name: collab.name,
      phone: collab.phone || '',
      notes: collab.notes || ''
    };
    collaborators[index] = updated;
    localStorage.setItem('local_collaborators', JSON.stringify(collaborators));
    return updated;
  }
};

export const deleteCollaborator = async (id) => {
  if (supabase) {
    try {
      const { error } = await supabase
        .from('collaborators')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return true;
    } catch (e) {
      console.error('Lỗi xóa CTV trên Supabase:', e);
      throw e;
    }
  } else {
    const collaborators = JSON.parse(localStorage.getItem('local_collaborators') || '[]');
    const filtered = collaborators.filter(c => c.id !== id);
    localStorage.setItem('local_collaborators', JSON.stringify(filtered));
    
    // Cập nhật các đơn hàng liên kết với CTV này thành không có CTV
    const subscriptions = JSON.parse(localStorage.getItem('local_subscriptions') || '[]');
    const updatedSubs = subscriptions.map(s => {
      if (s.collaborator_id === id) {
        return { ...s, collaborator_id: '', commission_amount: 0, commission_status: 'none' };
      }
      return s;
    });
    localStorage.setItem('local_subscriptions', JSON.stringify(updatedSubs));
    return true;
  }
};


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
          default_cost_price: Number(service.default_cost_price || 0),
          default_sell_price: Number(service.default_sell_price || 0),
          default_commission: Number(service.default_commission || 0),
          icon_name: service.icon_name || 'box',
          notes: service.notes || ''
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
      default_cost_price: Number(service.default_cost_price || 0),
      default_sell_price: Number(service.default_sell_price || 0),
      default_commission: Number(service.default_commission || 0),
      icon_name: service.icon_name || 'box',
      notes: service.notes || ''
    };
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
          default_cost_price: Number(service.default_cost_price || 0),
          default_sell_price: Number(service.default_sell_price || 0),
          default_commission: Number(service.default_commission || 0),
          icon_name: service.icon_name || 'box',
          notes: service.notes || ''
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
    
    if (services.some(s => s.id !== id && s.service_name.toLowerCase() === service.service_name.toLowerCase())) {
      throw new Error('Tên dịch vụ đã tồn tại');
    }
 
    const updated = {
      ...services[index],
      service_name: service.service_name,
      default_cost_price: Number(service.default_cost_price || 0),
      default_sell_price: Number(service.default_sell_price || 0),
      default_commission: Number(service.default_commission || 0),
      icon_name: service.icon_name || 'box',
      notes: service.notes || ''
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
          notes: sub.notes || '',
          collaborator_id: sub.collaborator_id || null,
          commission_amount: Number(sub.commission_amount || 0),
          commission_status: sub.commission_status || 'none'
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
      notes: sub.notes || '',
      collaborator_id: sub.collaborator_id || '',
      commission_amount: Number(sub.commission_amount || 0),
      commission_status: sub.commission_status || 'none'
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
          notes: sub.notes || '',
          collaborator_id: sub.collaborator_id || null,
          commission_amount: Number(sub.commission_amount || 0),
          commission_status: sub.commission_status || 'none'
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
      notes: sub.notes || '',
      collaborator_id: sub.collaborator_id || '',
      commission_amount: Number(sub.commission_amount || 0),
      commission_status: sub.commission_status || 'none'
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

// Đồng bộ từ LocalStorage lên Supabase
export const syncLocalToSupabase = async () => {
  if (!supabase) throw new Error('Chưa kết nối Supabase');
  
  const localCollaborators = JSON.parse(localStorage.getItem('local_collaborators') || '[]');
  const localServices = JSON.parse(localStorage.getItem('local_services') || '[]');
  const localSubscriptions = JSON.parse(localStorage.getItem('local_subscriptions') || '[]');
  
  let collaboratorsCount = 0;
  let servicesCount = 0;
  let subsCount = 0;

  // 1. Đồng bộ collaborators
  const collabIdMap = {}; // Để map local id sang supabase id
  for (const c of localCollaborators) {
    try {
      const { data, error } = await supabase
        .from('collaborators')
        .insert([{
          name: c.name,
          phone: c.phone,
          notes: c.notes || ''
        }])
        .select();
      if (!error && data && data[0]) {
        collaboratorsCount++;
        collabIdMap[c.id] = data[0].id;
      }
    } catch (e) {
      console.warn('Lỗi đồng bộ CTV hoặc đã tồn tại:', c.name, e);
    }
  }
  
  // 2. Đồng bộ services
  for (const s of localServices) {
    try {
      const { error } = await supabase
        .from('services_config')
        .insert([{
          service_name: s.service_name,
          default_cost_price: s.default_cost_price,
          default_sell_price: s.default_sell_price,
          default_commission: s.default_commission || 0,
          icon_name: s.icon_name,
          notes: s.notes || ''
        }])
        .select();
      if (!error) servicesCount++;
    } catch (e) {
      console.warn('Bỏ qua dịch vụ trùng lặp:', s.service_name);
    }
  }
  
  // 3. Đồng bộ subscriptions
  for (const sub of localSubscriptions) {
    try {
      const targetCollabId = sub.collaborator_id ? (collabIdMap[sub.collaborator_id] || null) : null;
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
          notes: sub.notes,
          collaborator_id: targetCollabId,
          commission_amount: Number(sub.commission_amount || 0),
          commission_status: sub.commission_status || 'none'
        }]);
      if (!error) subsCount++;
    } catch (e) {
      console.error('Không thể đồng bộ đơn hàng:', sub.customer_name, e);
    }
  }
  
  return { collaboratorsCount, servicesCount, subsCount };
};
