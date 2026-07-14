import React, { useState, useEffect, useMemo } from 'react';
import { 
  TrendingUp, TrendingDown, DollarSign, Users, Clock, AlertTriangle, 
  Search, Plus, Edit, Trash2, RefreshCw, Copy, ExternalLink, 
  Database, Sun, Moon, Check, Box, MessageSquare, Video, Globe, Zap, 
  Image, Play, CheckCircle, Info, Calendar, Phone, Lock, Eye, EyeOff, Mail,
  Sparkles, Layers, ChevronRight, AlertCircle, HelpCircle, UserCheck
} from 'lucide-react';
import {
  fetchSubscriptions, addSubscription, updateSubscription, deleteSubscription,
  fetchServicesConfig, addServiceConfig, updateServiceConfig, deleteServiceConfig,
  fetchCollaborators, addCollaborator, updateCollaborator, deleteCollaborator,
  getDbStatus, saveSupabaseConfig, clearSupabaseConfig, syncLocalToSupabase
} from './db';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

// --- GROUPING HELPER ---
const getServiceGroup = (name) => {
  if (!name) return 'Dịch vụ khác';
  const lower = name.toLowerCase();
  if (lower.includes('grok')) return 'Grok AI';
  if (lower.includes('youtube')) return 'YouTube';
  if (lower.includes('capcut')) return 'CapCut';
  if (lower.includes('chatgpt') || lower.includes('openai') || lower.includes('gpt')) return 'ChatGPT';
  if (lower.includes('google') || lower.includes('gemini')) return 'Google One / Gemini';
  if (lower.includes('canva')) return 'Canva';
  return 'Dịch vụ khác';
};

function App() {
  // --- STATE ---
  const [subscriptions, setSubscriptions] = useState([]);
  const [services, setServices] = useState([]);
  const [collaborators, setCollaborators] = useState([]);
  const [dbStatus, setDbStatus] = useState(getDbStatus());
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  
  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [filterService, setFilterService] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCollaborator, setFilterCollaborator] = useState('all');
  const [filterCommissionStatus, setFilterCommissionStatus] = useState('all');
  const [sortBy, setSortBy] = useState('end_date'); // 'end_date' | 'profit' | 'customer_name'
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc' | 'desc'
  
  // Modals state
  const [subModal, setSubModal] = useState({ isOpen: false, mode: 'add', data: null });
  const [serviceModal, setServiceModal] = useState({ isOpen: false, mode: 'add', data: null });
  const [collabModal, setCollabModal] = useState({ isOpen: false, mode: 'add', data: null });
  const [selectedCollabId, setSelectedCollabId] = useState(null); // Để xem chi tiết CTV
  
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [bulkInputText, setBulkInputText] = useState('');
  const [parsedServices, setParsedServices] = useState([]);
  const [dbConfigUrl, setDbConfigUrl] = useState('');
  const [dbConfigKey, setDbConfigKey] = useState('');
  const [syncing, setSyncing] = useState(false);
  
  // Show/Hide passwords in list
  const [visiblePasswords, setVisiblePasswords] = useState({});

  // Toast State
  const [toast, setToast] = useState(null);

  // --- INITIAL DATA LOAD ---
  const loadData = async () => {
    setLoading(true);
    try {
      const [subsData, servicesData, collabData] = await Promise.all([
        fetchSubscriptions(),
        fetchServicesConfig(),
        fetchCollaborators()
      ]);
      setSubscriptions(subsData);
      setServices(servicesData);
      setCollaborators(collabData);
    } catch (err) {
      showToast('Có lỗi xảy ra khi tải dữ liệu!', 'danger');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // Khởi tạo theme
    document.documentElement.setAttribute('data-theme', theme);
  }, []);

  useEffect(() => {
    // Tự động điền cấu hình URL/Key hiện tại lên UI
    const url = localStorage.getItem('supabase_url') || import.meta.env.VITE_SUPABASE_URL || '';
    const key = localStorage.getItem('supabase_anon_key') || import.meta.env.VITE_SUPABASE_ANON_KEY || '';
    setDbConfigUrl(url);
    setDbConfigKey(key);
  }, [dbStatus]);

  // Thay đổi theme
  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    localStorage.setItem('theme', nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
    showToast(`Đã chuyển sang chế độ ${nextTheme === 'light' ? 'sáng' : 'tối'}`, 'info');
  };

  // Toast Helper
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3000);
  };

  // --- DATE HELPERS ---
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  const getWarrantyStatus = (endDateStr) => {
    if (!endDateStr) return { days: 0, label: 'N/A', statusClass: 'expired' };
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const end = new Date(endDateStr);
    end.setHours(0, 0, 0, 0);
    
    const diffTime = end.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return { days: diffDays, label: `Hết hạn ${Math.abs(diffDays)} ngày`, statusClass: 'expired' };
    } else if (diffDays === 0) {
      return { days: diffDays, label: 'Hết hạn hôm nay', statusClass: 'warning' };
    } else if (diffDays <= 5) {
      return { days: diffDays, label: `Còn ${diffDays} ngày`, statusClass: 'warning' };
    } else {
      return { days: diffDays, label: `Còn ${diffDays} ngày`, statusClass: 'ok' };
    }
  };

  const formatVND = (val) => {
    const num = Number(val || 0);
    if (isNaN(num)) return '0 ₫';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
  };

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    showToast(`Đã sao chép ${label}!`, 'success');
  };

  const togglePasswordVisibility = (id) => {
    setVisiblePasswords(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // --- DERIVED METRICS ---
  const metrics = useMemo(() => {
    let revenue = 0;
    let cost = 0;
    let active = 0;
    let expired = 0;
    let expiringSoon = 0;
    let totalCommissions = 0;
    let unpaidCommissions = 0;
    let paidCommissions = 0;

    subscriptions.forEach(s => {
      // Bỏ qua các đơn hàng bị hủy khi tính doanh thu/lợi nhuận
      if (s.status !== 'canceled') {
        revenue += Number(s.sell_price || 0);
        
        const costMonths = Number(s.cost_months || 1);
        const soldMonths = Number(s.sold_months || 1);
        const itemCost = costMonths > 0 ? (Number(s.cost_price || 0) / costMonths) * soldMonths : 0;
        cost += itemCost;

        if (s.collaborator_id) {
          const comm = Number(s.commission_amount || 0);
          totalCommissions += comm;
          if (s.commission_status === 'pending') {
            unpaidCommissions += comm;
          } else if (s.commission_status === 'paid') {
            paidCommissions += comm;
          }
        }
      }

      // Xác định trạng thái thực tế dựa trên ngày hết hạn
      const warranty = getWarrantyStatus(s.end_date);
      
      if (s.status === 'active') {
        if (warranty.days < 0) {
          expired++;
        } else {
          active++;
          if (warranty.days <= 5) {
            expiringSoon++;
          }
        }
      } else if (s.status === 'expired') {
        expired++;
      }
    });

    const profit = revenue - cost - totalCommissions;
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

    return {
      totalRevenue: revenue,
      totalCost: cost,
      totalProfit: profit,
      profitMargin: margin,
      activeCount: active,
      expiredCount: expired,
      expiringSoonCount: expiringSoon,
      totalCommissions,
      unpaidCommissions,
      paidCommissions
    };
  }, [subscriptions]);

  // Danh sách các tài khoản sắp hết hạn để hiển thị cảnh báo
  const expiringSubscriptions = useMemo(() => {
    return subscriptions
      .filter(s => {
        if (s.status !== 'active') return false;
        const warranty = getWarrantyStatus(s.end_date);
        return warranty.days >= -3 && warranty.days <= 5; // Cảnh báo từ sắp hết hạn (5 ngày) đến mới quá hạn (3 ngày)
      })
      .map(s => ({
        ...s,
        warranty: getWarrantyStatus(s.end_date)
      }))
      .sort((a, b) => a.warranty.days - b.warranty.days);
  }, [subscriptions]);

  // Cấu trúc dữ liệu cho biểu đồ Doanh thu & Lợi nhuận hàng tháng
  const chartData = useMemo(() => {
    const monthlyMap = {};
    subscriptions
      .filter(s => s.status !== 'canceled')
      .forEach(s => {
        if (!s.start_date) return;
        const date = new Date(s.start_date);
        const key = `${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
        const sortKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        if (!monthlyMap[key]) {
          monthlyMap[key] = {
            name: key,
            'Doanh thu': 0,
            'Vốn': 0,
            'Hoa hồng': 0,
            'Lợi nhuận': 0,
            sortKey
          };
        }
        
        const costMonths = Number(s.cost_months || 1);
        const soldMonths = Number(s.sold_months || 1);
        const itemCost = costMonths > 0 ? (Number(s.cost_price || 0) / costMonths) * soldMonths : 0;
        const itemComm = s.collaborator_id ? Number(s.commission_amount || 0) : 0;
        const itemProfit = Number(s.sell_price || 0) - itemCost - itemComm;

        monthlyMap[key]['Doanh thu'] += Number(s.sell_price || 0);
        monthlyMap[key]['Vốn'] += itemCost;
        monthlyMap[key]['Hoa hồng'] += itemComm;
        monthlyMap[key]['Lợi nhuận'] += itemProfit;
      });

    return Object.values(monthlyMap).sort((a, b) => a.sortKey.localeCompare(b.sortKey));
  }, [subscriptions]);

  // Thống kê lợi nhuận theo từng loại Dịch vụ (trừ hoa hồng)
  const serviceStats = useMemo(() => {
    const map = {};
    subscriptions.forEach(s => {
      if (s.status === 'canceled') return;
      
      const costMonths = Number(s.cost_months || 1);
      const soldMonths = Number(s.sold_months || 1);
      const itemCost = costMonths > 0 ? (Number(s.cost_price || 0) / costMonths) * soldMonths : 0;
      const itemComm = s.collaborator_id ? Number(s.commission_amount || 0) : 0;
      const profit = Number(s.sell_price || 0) - itemCost - itemComm;

      if (!map[s.service_name]) {
        map[s.service_name] = { service_name: s.service_name, revenue: 0, profit: 0, count: 0 };
      }
      map[s.service_name].revenue += Number(s.sell_price || 0);
      map[s.service_name].profit += profit;
      map[s.service_name].count += 1;
    });

    return Object.values(map).sort((a, b) => b.profit - a.profit);
  }, [subscriptions]);

  // Thống kê tài chính cho từng CTV
  const collaboratorStats = useMemo(() => {
    const map = {};
    
    // Khởi tạo tất cả CTV
    collaborators.forEach(c => {
      map[c.id] = {
        id: c.id,
        name: c.name,
        phone: c.phone || '',
        notes: c.notes || '',
        ordersCount: 0,
        revenue: 0,
        commissionsEarned: 0,
        commissionsPaid: 0,
        commissionsPending: 0
      };
    });

    // Tính toán dựa trên đơn hàng
    subscriptions.forEach(s => {
      if (s.status === 'canceled' || !s.collaborator_id) return;
      
      // Trường hợp CTV đã bị xóa khỏi danh sách CTV nhưng ID vẫn lưu ở Sub
      if (!map[s.collaborator_id]) {
        map[s.collaborator_id] = {
          id: s.collaborator_id,
          name: 'CTV Đã Xóa',
          phone: '',
          notes: '',
          ordersCount: 0,
          revenue: 0,
          commissionsEarned: 0,
          commissionsPaid: 0,
          commissionsPending: 0
        };
      }

      const collab = map[s.collaborator_id];
      collab.ordersCount += 1;
      collab.revenue += Number(s.sell_price || 0);
      
      const comm = Number(s.commission_amount || 0);
      collab.commissionsEarned += comm;
      if (s.commission_status === 'paid') {
        collab.commissionsPaid += comm;
      } else {
        collab.commissionsPending += comm;
      }
    });

    return Object.values(map).sort((a, b) => b.commissionsPending - a.commissionsPending);
  }, [collaborators, subscriptions]);

  // --- FILTERS & SEARCH PROCESS ---
  const processedSubscriptions = useMemo(() => {
    return subscriptions
      .filter(s => {
        // Tìm kiếm theo tên khách, sđt, email, ghi chú
        const searchLower = searchQuery.toLowerCase();
        const matchesSearch = 
          s.customer_name?.toLowerCase().includes(searchLower) ||
          s.customer_phone?.includes(searchQuery) ||
          s.account_email?.toLowerCase().includes(searchLower) ||
          s.notes?.toLowerCase().includes(searchLower);

        // Lọc theo loại dịch vụ
        const matchesService = filterService === 'all' || s.service_name === filterService;

        // Lọc theo trạng thái bảo hành
        let matchesStatus = true;
        const warranty = getWarrantyStatus(s.end_date);
        if (filterStatus === 'active') {
          matchesStatus = s.status === 'active' && warranty.days >= 0;
        } else if (filterStatus === 'expired') {
          matchesStatus = s.status === 'expired' || (s.status === 'active' && warranty.days < 0);
        } else if (filterStatus === 'expiring_soon') {
          matchesStatus = s.status === 'active' && warranty.days >= 0 && warranty.days <= 5;
        } else if (filterStatus === 'canceled') {
          matchesStatus = s.status === 'canceled';
        }

        // Lọc theo CTV
        let matchesCollab = true;
        if (filterCollaborator === 'direct') {
          matchesCollab = !s.collaborator_id;
        } else if (filterCollaborator !== 'all') {
          matchesCollab = s.collaborator_id === filterCollaborator;
        }

        // Lọc theo Trạng thái hoa hồng
        let matchesCommStatus = true;
        if (filterCommissionStatus !== 'all') {
          matchesCommStatus = s.commission_status === filterCommissionStatus;
        }

        return matchesSearch && matchesService && matchesStatus && matchesCollab && matchesCommStatus;
      })
      .sort((a, b) => {
        let fieldA = a[sortBy];
        let fieldB = b[sortBy];

        // Custom sort logic
        if (sortBy === 'profit') {
          const costMonthsA = Number(a.cost_months || 1);
          const soldMonthsA = Number(a.sold_months || 1);
          const itemCostA = costMonthsA > 0 ? (Number(a.cost_price || 0) / costMonthsA) * soldMonthsA : 0;
          const itemCommA = a.collaborator_id ? Number(a.commission_amount || 0) : 0;
          fieldA = Number(a.sell_price || 0) - itemCostA - itemCommA;

          const costMonthsB = Number(b.cost_months || 1);
          const soldMonthsB = Number(b.sold_months || 1);
          const itemCostB = costMonthsB > 0 ? (Number(b.cost_price || 0) / costMonthsB) * soldMonthsB : 0;
          const itemCommB = b.collaborator_id ? Number(b.commission_amount || 0) : 0;
          fieldB = Number(b.sell_price || 0) - itemCostB - itemCommB;
        } else if (sortBy === 'end_date') {
          fieldA = a.end_date || '';
          fieldB = b.end_date || '';
        } else if (sortBy === 'customer_name') {
          fieldA = a.customer_name?.toLowerCase() || '';
          fieldB = b.customer_name?.toLowerCase() || '';
        }
        if (fieldA < fieldB) return sortOrder === 'asc' ? -1 : 1;
        if (fieldA > fieldB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
  }, [subscriptions, searchQuery, filterService, filterStatus, filterCollaborator, filterCommissionStatus, sortBy, sortOrder]);

  const groupedServices = useMemo(() => {
    const groups = {};
    services.forEach(serv => {
      const group = getServiceGroup(serv.service_name);
      if (!groups[group]) groups[group] = [];
      groups[group].push(serv);
    });
    return Object.keys(groups).sort((a, b) => {
      if (a === 'Dịch vụ khác') return 1;
      if (b === 'Dịch vụ khác') return -1;
      return a.localeCompare(b);
    }).reduce((acc, key) => {
      acc[key] = groups[key];
      return acc;
    }, {});
  }, [services]);

  // --- ACTIONS ---
  
  // Lưu/Cập nhật Subscriptions
  const handleSaveSub = async (formData) => {
    try {
      if (subModal.mode === 'add') {
        const newRecord = await addSubscription(formData);
        setSubscriptions(prev => [newRecord, ...prev]);
        showToast('Đã thêm khách hàng mới thành công!');
      } else if (subModal.mode === 'edit') {
        const updatedRecord = await updateSubscription(subModal.data.id, formData);
        setSubscriptions(prev => prev.map(s => s.id === subModal.data.id ? updatedRecord : s));
        showToast('Đã cập nhật thông tin khách hàng!');
      } else if (subModal.mode === 'renew') {
        const updatedRecord = await updateSubscription(subModal.data.id, formData);
        setSubscriptions(prev => prev.map(s => s.id === subModal.data.id ? updatedRecord : s));
        showToast('Đã gia hạn tài khoản thành công!');
      }
      setSubModal({ isOpen: false, mode: 'add', data: null });
    } catch (e) {
      showToast('Có lỗi khi lưu dữ liệu!', 'danger');
    }
  };

  const handleDeleteSub = async (id) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa bản ghi khách hàng này?')) {
      try {
        await deleteSubscription(id);
        setSubscriptions(prev => prev.filter(s => s.id !== id));
        showToast('Đã xóa bản ghi thành công!', 'success');
      } catch (e) {
        showToast('Lỗi khi xóa bản ghi!', 'danger');
      }
    }
  };

  const handleOpenRenew = (sub) => {
    const today = new Date();
    const futureDate = new Date();
    const oldEndDate = new Date(sub.end_date);
    if (oldEndDate > today) {
      futureDate.setTime(oldEndDate.getTime() + 30 * 24 * 60 * 60 * 1000);
    } else {
      futureDate.setDate(today.getDate() + 30);
    }

    const renewData = {
      ...sub,
      start_date: today.toISOString().split('T')[0],
      end_date: futureDate.toISOString().split('T')[0],
      status: 'active'
    };

    setSubModal({
      isOpen: true,
      mode: 'renew',
      data: renewData
    });
  };

  // Quản lý Dịch vụ Config
  const handleSaveService = async (formData) => {
    try {
      if (serviceModal.mode === 'add') {
        const newServ = await addServiceConfig(formData);
        setServices(prev => [...prev, newServ]);
        showToast('Đã thêm gói dịch vụ mới!');
      } else if (serviceModal.mode === 'edit') {
        const updatedServ = await updateServiceConfig(serviceModal.data.id, formData);
        setServices(prev => prev.map(s => s.id === serviceModal.data.id ? updatedServ : s));
        showToast('Đã cập nhật cấu hình dịch vụ!');
      }
      setServiceModal({ isOpen: false, mode: 'add', data: null });
    } catch (e) {
      showToast(e.message || 'Lỗi lưu cấu hình dịch vụ!', 'danger');
    }
  };

  const handleDeleteService = async (id) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa cấu hình gói dịch vụ này?')) {
      try {
        await deleteServiceConfig(id);
        setServices(prev => prev.filter(s => s.id !== id));
        showToast('Đã xóa cấu hình dịch vụ!');
      } catch (e) {
        showToast('Lỗi khi xóa!', 'danger');
      }
    }
  };

  // Quản lý Cộng Tác Viên
  const handleSaveCollab = async (formData) => {
    try {
      if (collabModal.mode === 'add') {
        const newCollab = await addCollaborator(formData);
        setCollaborators(prev => [...prev, newCollab]);
        showToast('Đã thêm cộng tác viên mới!');
      } else if (collabModal.mode === 'edit') {
        const updatedCollab = await updateCollaborator(collabModal.data.id, formData);
        setCollaborators(prev => prev.map(c => c.id === collabModal.data.id ? updatedCollab : c));
        showToast('Đã cập nhật thông tin cộng tác viên!');
      }
      setCollabModal({ isOpen: false, mode: 'add', data: null });
    } catch (e) {
      showToast(e.message || 'Lỗi lưu thông tin CTV!', 'danger');
    }
  };

  const handleDeleteCollab = async (id) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa cộng tác viên này? Tất cả đơn hàng liên kết sẽ mất liên kết hoa hồng.')) {
      try {
        await deleteCollaborator(id);
        setCollaborators(prev => prev.filter(c => c.id !== id));
        // Reset cục bộ
        setSubscriptions(prev => prev.map(s => {
          if (s.collaborator_id === id) {
            return { ...s, collaborator_id: '', commission_amount: 0, commission_status: 'none' };
          }
          return s;
        }));
        showToast('Đã xóa cộng tác viên thành công!');
        if (selectedCollabId === id) setSelectedCollabId(null);
      } catch (e) {
        showToast('Lỗi khi xóa cộng tác viên!', 'danger');
      }
    }
  };

  const handleToggleCommissionStatus = async (subId, currentStatus) => {
    const nextStatus = currentStatus === 'paid' ? 'pending' : 'paid';
    const subToUpdate = subscriptions.find(s => s.id === subId);
    if (!subToUpdate) return;
    try {
      const updated = await updateSubscription(subId, {
        ...subToUpdate,
        commission_status: nextStatus
      });
      setSubscriptions(prev => prev.map(s => s.id === subId ? updated : s));
      showToast(`Đã chuyển hoa hồng sang: ${nextStatus === 'paid' ? 'Đã trả' : 'Chưa trả'}`);
    } catch (e) {
      showToast('Lỗi cập nhật trạng thái hoa hồng!', 'danger');
    }
  };

  const handlePayAllCommissions = async (collabId) => {
    const unpaidSubs = subscriptions.filter(s => s.collaborator_id === collabId && s.commission_status === 'pending' && s.status !== 'canceled');
    if (unpaidSubs.length === 0) {
      showToast('Không có hoa hồng chưa trả cho CTV này.', 'info');
      return;
    }
    if (window.confirm(`Bạn có chắc chắn muốn thanh toán tất cả hoa hồng (${unpaidSubs.length} đơn) cho CTV này?`)) {
      try {
        setLoading(true);
        const updatedList = [...subscriptions];
        for (const sub of unpaidSubs) {
          const updated = await updateSubscription(sub.id, {
            ...sub,
            commission_status: 'paid'
          });
          const index = updatedList.findIndex(s => s.id === sub.id);
          if (index !== -1) updatedList[index] = updated;
        }
        setSubscriptions(updatedList);
        showToast('Đã thanh toán tất cả hoa hồng thành công!');
      } catch (e) {
        showToast('Lỗi khi thanh toán hoa hồng!', 'danger');
      } finally {
        setLoading(false);
      }
    }
  };

  // Nhập hàng loạt dịch vụ mẫu (Bulk import services)
  const handleParseBulk = () => {
    if (!bulkInputText.trim()) {
      showToast('Vui lòng dán danh sách dịch vụ!', 'warning');
      return;
    }
    const lines = bulkInputText.split('\n');
    const items = [];
    let currentItem = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const hasPriceKeywords = line.toLowerCase().includes('giá') || line.includes('đ/') || line.includes('💵');
      const hasCommissionKeywords = line.toLowerCase().includes('hoa hồng') || line.toLowerCase().includes('đ / đơn') || line.includes('💸');
      
      if (!hasPriceKeywords && !hasCommissionKeywords) {
        // Line này là tên dịch vụ
        let cleanName = line.replace(/^[✅⚠️\-\*\s\•\d\.\)]+/, '').trim();
        if (cleanName) {
          if (currentItem) {
            items.push(currentItem);
          }
          
          const lowerName = cleanName.toLowerCase();
          let icon = 'box';
          if (lowerName.includes('grok')) icon = 'zap';
          else if (lowerName.includes('youtube')) icon = 'play';
          else if (lowerName.includes('capcut')) icon = 'video';
          else if (lowerName.includes('chatgpt') || lowerName.includes('openai') || lowerName.includes('gpt')) icon = 'message-square';
          else if (lowerName.includes('google') || lowerName.includes('gemini')) icon = 'globe';
          else if (lowerName.includes('canva')) icon = 'image';
          else if (lowerName.includes('meitu')) icon = 'image';

          currentItem = {
            service_name: cleanName,
            default_cost_price: 0,
            default_sell_price: 0,
            default_commission: 0,
            icon_name: icon,
            notes: '',
            checked: true
          };
        }
      } else if (hasPriceKeywords) {
        const priceMatch = line.replace(/[^\d]/g, '');
        if (priceMatch && currentItem) {
          currentItem.default_sell_price = Number(priceMatch);
        }
      } else if (hasCommissionKeywords) {
        const commMatch = line.replace(/[^\d]/g, '');
        if (commMatch && currentItem) {
          currentItem.default_commission = Number(commMatch);
          items.push(currentItem);
          currentItem = null;
        }
      }
    }
    
    if (currentItem) {
      items.push(currentItem);
    }

    if (items.length === 0) {
      showToast('Không thể phân tích dữ liệu. Vui lòng kiểm tra lại định dạng!', 'warning');
    } else {
      setParsedServices(items);
      showToast(`Đã tìm thấy ${items.length} dịch vụ! Hãy kiểm tra và chỉnh sửa trước khi lưu.`);
    }
  };

  const handleSaveBulkImport = async () => {
    const toSave = parsedServices.filter(s => s.checked && s.service_name);
    if (toSave.length === 0) {
      showToast('Vui lòng chọn ít nhất một dịch vụ hợp lệ để lưu!', 'warning');
      return;
    }

    let successCount = 0;
    showToast('Đang lưu các dịch vụ...', 'info');
    
    const newServicesList = [...services];
    for (const item of toSave) {
      try {
        const newServ = await addServiceConfig({
          service_name: item.service_name,
          default_cost_price: Number(item.default_cost_price || 0),
          default_sell_price: Number(item.default_sell_price || 0),
          default_commission: Number(item.default_commission || 0),
          icon_name: item.icon_name || 'box',
          notes: item.notes || ''
        });
        newServicesList.push(newServ);
        successCount++;
      } catch (err) {
        console.error('Lỗi khi lưu gói:', item.service_name, err);
      }
    }

    setServices(newServicesList);
    setIsBulkImportOpen(false);
    setBulkInputText('');
    setParsedServices([]);
    showToast(`Đã thêm thành công ${successCount}/${toSave.length} gói dịch vụ!`);
  };

  // Quản lý kết nối Supabase
  const handleConnectSupabase = (e) => {
    e.preventDefault();
    if (!dbConfigUrl || !dbConfigKey) {
      showToast('Vui lòng điền đầy đủ URL và Key!', 'warning');
      return;
    }
    const success = saveSupabaseConfig(dbConfigUrl, dbConfigKey);
    if (success) {
      setDbStatus(getDbStatus());
      showToast('Đã lưu thông tin Supabase! Vui lòng tải lại hoặc đồng bộ.', 'success');
      loadData();
    } else {
      showToast('Khởi tạo kết nối Supabase thất bại!', 'danger');
    }
  };

  const handleDisconnectSupabase = () => {
    clearSupabaseConfig();
    setDbStatus(getDbStatus());
    setDbConfigUrl('');
    setDbConfigKey('');
    showToast('Đã ngắt kết nối Supabase, chuyển về Local Storage!', 'info');
    loadData();
  };

  const handleSyncToSupabase = async () => {
    if (dbStatus.type !== 'supabase') {
      showToast('Bạn cần kết nối Supabase trước khi đồng bộ!', 'warning');
      return;
    }
    setSyncing(true);
    try {
      const res = await syncLocalToSupabase();
      showToast(`Đồng bộ thành công! Đã tải lên ${res.collaboratorsCount} CTV, ${res.servicesCount} dịch vụ & ${res.subsCount} đơn hàng.`);
      loadData();
    } catch (e) {
      showToast('Lỗi khi đồng bộ lên Supabase!', 'danger');
      console.error(e);
    } finally {
      setSyncing(false);
    }
  };

  // Định nghĩa các icon của Dịch vụ
  const getServiceIcon = (iconName) => {
    switch (iconName) {
      case 'message-square': return <MessageSquare size={16} />;
      case 'video': return <Video size={16} />;
      case 'chrome':
      case 'globe': return <Globe size={16} />;
      case 'zap': return <Zap size={16} />;
      case 'image': return <Image size={16} />;
      case 'play': return <Play size={16} />;
      default: return <Box size={16} />;
    }
  };

  return (
    <div className="app-container">
      {/* APP HEADER */}
      <header className="app-header">
        <div className="logo-section">
          <div className="logo-icon">
            <Sparkles size={22} fill="white" />
          </div>
          <div className="logo-text">
            <h1>PREMIUM ACCOUNTS</h1>
            <p>Hệ Thống Quản Lý Người Dùng & Bảo Hành</p>
          </div>
        </div>

        <div className="header-actions">
          {/* Trạng thái Database */}
          <div 
            className={`db-badge ${dbStatus.type}`}
            title={dbStatus.type === 'supabase' ? 'Đang kết nối Supabase Cloud' : 'Đang chạy Local Storage (Lưu tại trình duyệt)'}
          >
            <Database size={14} />
            <span>{dbStatus.type === 'supabase' ? 'Supabase Connected' : 'Local Storage Mode'}</span>
            <span style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: dbStatus.type === 'supabase' ? 'var(--success)' : 'var(--warning)',
              display: 'inline-block'
            }}></span>
          </div>

          {/* Nút Refresh */}
          <button className="icon-btn" onClick={loadData} title="Tải lại dữ liệu">
            <RefreshCw size={18} className={loading ? 'spin-anim' : ''} />
          </button>

          {/* Nút Đổi Theme */}
          <button className="icon-btn" onClick={toggleTheme} title="Đổi giao diện Sáng/Tối">
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
        </div>
      </header>

      {/* APP NAVIGATION TABS */}
      <div className="app-main">
        <nav className="nav-tabs">
          <button 
            className={`tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => { setActiveTab('dashboard'); setSelectedCollabId(null); }}
          >
            <Layers size={16} />
            <span>Thống Kê Doanh Thu</span>
          </button>
          <button 
            className={`tab-btn ${activeTab === 'subscriptions' ? 'active' : ''}`}
            onClick={() => { setActiveTab('subscriptions'); setSelectedCollabId(null); }}
          >
            <Users size={16} />
            <span>Quản Lý Khách Hàng</span>
          </button>
          <button 
            className={`tab-btn ${activeTab === 'collaborators' ? 'active' : ''}`}
            onClick={() => { setActiveTab('collaborators'); setSelectedCollabId(null); }}
          >
            <UserCheck size={16} />
            <span>Cộng Tác Viên (CTV)</span>
          </button>
          <button 
            className={`tab-btn ${activeTab === 'services' ? 'active' : ''}`}
            onClick={() => { setActiveTab('services'); setSelectedCollabId(null); }}
          >
            <Box size={16} />
            <span>Gói Dịch Vụ & Giá</span>
          </button>
        </nav>

        {/* LOADING INDICATOR */}
        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px', gap: '12px', color: 'var(--text-muted)' }}>
            <RefreshCw size={24} className="spin-anim" />
            <span>Đang đồng bộ dữ liệu...</span>
          </div>
        )}

        {/* --- TAB CONTENT --- */}
        {!loading && (
          <>
            {/* 1. TAB DASHBOARD */}
            {activeTab === 'dashboard' && (
              <div>
                {/* Stats Grid */}
                <div className="stats-grid">
                  <div className="stat-card success">
                    <div className="stat-header">
                      <span className="stat-title">Doanh Thu</span>
                      <div className="stat-icon-box">
                        <TrendingUp size={18} />
                      </div>
                    </div>
                    <div className="stat-value">{formatVND(metrics.totalRevenue)}</div>
                    <div className="stat-footer">Tổng thu từ bán tài khoản</div>
                  </div>

                  <div className="stat-card danger">
                    <div className="stat-header">
                      <span className="stat-title">Vốn Gốc</span>
                      <div className="stat-icon-box">
                        <TrendingDown size={18} />
                      </div>
                    </div>
                    <div className="stat-value">{formatVND(metrics.totalCost)}</div>
                    <div className="stat-footer">Chi phí mua gốc phân bổ</div>
                  </div>

                  <div className="stat-card warning" style={{ cursor: 'pointer' }} onClick={() => setActiveTab('collaborators')}>
                    <div className="stat-header">
                      <span className="stat-title">Nợ Hoa Hồng CTV</span>
                      <div className="stat-icon-box" style={{ backgroundColor: 'var(--warning-light)', color: 'var(--warning)' }}>
                        <DollarSign size={18} />
                      </div>
                    </div>
                    <div className="stat-value">{formatVND(metrics.unpaidCommissions)}</div>
                    <div className="stat-footer">
                      Đã trả: <span style={{ fontWeight: 600, color: 'var(--success)' }}>{formatVND(metrics.paidCommissions)}</span>
                    </div>
                  </div>

                  <div className="stat-card primary">
                    <div className="stat-header">
                      <span className="stat-title">Lợi Nhuận Thuần</span>
                      <div className="stat-icon-box">
                        <DollarSign size={18} />
                      </div>
                    </div>
                    <div className="stat-value">{formatVND(metrics.totalProfit)}</div>
                    <div className="stat-footer">
                      Sau khi trừ Vốn & Hoa hồng: <span className="stat-trend-up">{metrics.profitMargin.toFixed(1)}%</span>
                    </div>
                  </div>

                  <div className="stat-card info">
                    <div className="stat-header">
                      <span className="stat-title">Khách Hoạt Động</span>
                      <div className="stat-icon-box">
                        <Users size={18} />
                      </div>
                    </div>
                    <div className="stat-value">{metrics.activeCount}</div>
                    <div className="stat-footer">Trong hạn bảo hành</div>
                  </div>

                  <div className="stat-card warning">
                    <div className="stat-header">
                      <span className="stat-title">Sắp Hết Hạn (≤5 ngày)</span>
                      <div className="stat-icon-box">
                        <Clock size={18} />
                      </div>
                    </div>
                    <div className="stat-value">{metrics.expiringSoonCount}</div>
                    <div className="stat-footer">Cần gia hạn hoặc xử lý</div>
                  </div>
                </div>

                {/* Dashboard Details (Chart & Alerts) */}
                <div className="dashboard-details">
                  {/* Left: Financial Chart */}
                  <div className="chart-card">
                    <div className="card-title-section">
                      <h3>Doanh Thu & Lợi Nhuận Hàng Tháng</h3>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500 }}>
                        (Đã tính khấu trừ hoa hồng CTV và giá vốn)
                      </span>
                    </div>
                    
                    {chartData.length === 0 ? (
                      <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                        Chưa có đủ dữ liệu giao dịch để vẽ biểu đồ doanh thu.
                      </div>
                    ) : (
                      <div style={{ width: '100%', height: '300px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                            <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} tickLine={false} />
                            <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} />
                            <Tooltip 
                              formatter={(value) => formatVND(value)} 
                              contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-main)', borderRadius: '8px' }} 
                            />
                            <Legend wrapperStyle={{ fontSize: '13px', paddingTop: '10px' }} />
                            <Bar dataKey="Doanh thu" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="Lợi nhuận" fill="var(--success)" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="Hoa hồng" fill="var(--warning)" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>

                  {/* Right: Warranty Expiry Alerts */}
                  <div className="chart-card">
                    <div className="card-title-section">
                      <h3>Cảnh Báo Bảo Hành Sắp Hết Hạn</h3>
                      <span className="badge warning" style={{ fontSize: '10px' }}>Gần Đây</span>
                    </div>
                    
                    <div className="recent-alert-list">
                      {expiringSubscriptions.length === 0 ? (
                        <div style={{ padding: '40px 10px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                          <CheckCircle size={32} style={{ color: 'var(--success)', marginBottom: '8px', opacity: 0.8 }} />
                          <p>Tuyệt vời! Không có khách hàng nào sắp hết hạn bảo hành trong 5 ngày tới.</p>
                        </div>
                      ) : (
                        expiringSubscriptions.map(sub => (
                          <div 
                            key={sub.id} 
                            className={`alert-item ${sub.warranty.days < 0 ? 'urgent' : 'soon'}`}
                            onClick={() => {
                              setSearchQuery(sub.customer_name);
                              setActiveTab('subscriptions');
                            }}
                            style={{ cursor: 'pointer' }}
                            title="Bấm để xem và sửa đổi đơn hàng này"
                          >
                            <div className="alert-icon-box">
                              <AlertTriangle size={15} />
                            </div>
                            <div className="alert-content">
                              <div className="alert-title">{sub.customer_name} ({sub.service_name})</div>
                              <div className="alert-desc">{sub.account_email || 'Chưa cập nhật email'}</div>
                              <span className="alert-date">
                                {sub.warranty.days < 0 ? `Đã quá hạn ${Math.abs(sub.warranty.days)} ngày` : `Hạn chót: ${sub.end_date}`}
                              </span>
                            </div>
                            <ChevronRight size={14} style={{ color: 'var(--text-muted)', alignSelf: 'center' }} />
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* Bottom: Service Profit breakdown */}
                <div className="chart-card">
                  <div className="card-title-section">
                    <h3>Xếp Hạng Gói Dịch Vụ Theo Lợi Nhuận</h3>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Tính sau khi trừ vốn & hoa hồng CTV</span>
                  </div>

                  {serviceStats.length === 0 ? (
                    <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>Chưa có dữ liệu bán hàng.</p>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                      {serviceStats.map((item, idx) => {
                        const maxProfit = serviceStats[0].profit || 1;
                        const percentage = (item.profit / maxProfit) * 100;
                        return (
                          <div key={item.service_name} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontWeight: 700, fontSize: '14px', flex: 1 }}>#{idx+1} {item.service_name}</span>
                              <span className="badge active" style={{ fontSize: '10px' }}>{item.count} lượt bán</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-muted)' }}>
                              <span>Doanh thu: {formatVND(item.revenue)}</span>
                              <span style={{ fontWeight: 600, color: 'var(--success)' }}>Lợi nhuận ròng: {formatVND(item.profit)}</span>
                            </div>
                            {/* Thanh phần trăm trực quan */}
                            <div style={{ height: '6px', backgroundColor: 'var(--bg-app)', borderRadius: '3px', overflow: 'hidden', marginTop: '4px' }}>
                              <div style={{ width: `${Math.max(0, percentage)}%`, height: '100%', backgroundColor: 'var(--primary)', borderRadius: '3px' }}></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 2. TAB SUBSCRIPTIONS (QUẢN LÝ KHÁCH HÀNG) */}
            {activeTab === 'subscriptions' && (
              <div>
                {/* Control bar */}
                <div className="controls-bar">
                  <div className="filters-group" style={{ flexWrap: 'wrap', gap: '8px' }}>
                    {/* Ô Tìm Kiếm */}
                    <div className="search-wrapper">
                      <Search className="search-icon" size={16} />
                      <input 
                        type="text" 
                        placeholder="Tìm tên, SĐT, email tài khoản..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="search-input"
                      />
                    </div>

                    {/* Lọc theo dịch vụ */}
                    <select 
                      value={filterService} 
                      onChange={(e) => setFilterService(e.target.value)}
                      className="select-filter"
                    >
                      <option value="all">Tất cả gói dịch vụ</option>
                      {Object.entries(groupedServices).map(([groupName, groupList]) => (
                        <optgroup key={groupName} label={groupName}>
                          {groupList.map(s => (
                            <option key={s.id} value={s.service_name}>{s.service_name}</option>
                          ))}
                        </optgroup>
                      ))}
                    </select>

                    {/* Lọc theo trạng thái bảo hành */}
                    <select 
                      value={filterStatus} 
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="select-filter"
                    >
                      <option value="all">Tất cả trạng thái bảo hành</option>
                      <option value="active">Đang hoạt động (trong hạn)</option>
                      <option value="expiring_soon">Sắp hết hạn (≤ 5 ngày)</option>
                      <option value="expired">Đã hết hạn bảo hành</option>
                      <option value="canceled">Đã hủy gói</option>
                    </select>

                    {/* Lọc theo Cộng tác viên */}
                    <select 
                      value={filterCollaborator} 
                      onChange={(e) => setFilterCollaborator(e.target.value)}
                      className="select-filter"
                    >
                      <option value="all">Tất cả đơn (Direct + CTV)</option>
                      <option value="direct">Bán trực tiếp (Không CTV)</option>
                      {collaborators.map(c => (
                        <option key={c.id} value={c.id}>Đơn của CTV: {c.name}</option>
                      ))}
                    </select>

                    {/* Lọc theo trạng thái hoa hồng */}
                    <select 
                      value={filterCommissionStatus} 
                      onChange={(e) => setFilterCommissionStatus(e.target.value)}
                      className="select-filter"
                    >
                      <option value="all">Tất cả trạng thái hoa hồng</option>
                      <option value="pending">Hoa hồng chưa thanh toán</option>
                      <option value="paid">Hoa hồng đã thanh toán</option>
                      <option value="none">Đơn không có hoa hồng</option>
                    </select>

                    {/* Sắp xếp */}
                    <select 
                      value={`${sortBy}-${sortOrder}`} 
                      onChange={(e) => {
                        const [field, order] = e.target.value.split('-');
                        setSortBy(field);
                        setSortOrder(order);
                      }}
                      className="select-filter"
                    >
                      <option value="end_date-asc">Hạn bảo hành tăng dần (gần nhất)</option>
                      <option value="end_date-desc">Hạn bảo hành giảm dần (xa nhất)</option>
                      <option value="profit-desc">Lợi nhuận ròng giảm dần</option>
                      <option value="profit-asc">Lợi nhuận ròng tăng dần</option>
                      <option value="customer_name-asc">Tên khách hàng A-Z</option>
                    </select>
                  </div>

                  <button 
                    className="btn btn-primary"
                    onClick={() => setSubModal({ isOpen: true, mode: 'add', data: null })}
                  >
                    <Plus size={16} />
                    <span>Thêm Khách Hàng</span>
                  </button>
                </div>

                {/* Bảng Dữ Liệu */}
                {processedSubscriptions.length === 0 ? (
                  <div className="empty-state">
                    <Users size={48} className="empty-state-icon" />
                    <h3>Không tìm thấy khách hàng nào</h3>
                    <p>Hãy điều chỉnh bộ lọc hoặc thêm tài khoản khách hàng mới để quản lý.</p>
                    <button className="btn btn-primary" onClick={() => setSubModal({ isOpen: true, mode: 'add', data: null })}>
                      <Plus size={16} /> Thêm khách hàng mới
                    </button>
                  </div>
                ) : (
                  <div className="table-container">
                    <div className="table-responsive">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Khách Hàng</th>
                            <th>Gói Mua</th>
                            <th>Thông Tin Acc</th>
                            <th>Số Tháng (Gốc/Bán/Dư)</th>
                            <th>Tài Chính (Vốn/Bán/Lãi)</th>
                            <th>Thu Khách</th>
                            <th>CTV & Hoa Hồng</th>
                            <th>Thời Hạn Bảo Hành</th>
                            <th style={{ width: '120px' }}>Hành Động</th>
                          </tr>
                        </thead>
                        <tbody>
                          {processedSubscriptions.map(sub => {
                            const warranty = getWarrantyStatus(sub.end_date);
                            
                            // Các thông số tháng
                            const costMonths = Number(sub.cost_months || 1);
                            const soldMonths = Number(sub.sold_months || 1);
                            const remainingMonths = costMonths - soldMonths;

                            // Tính ngày cần gia hạn / mua tiếp gói gốc (Dựa trên start_date + cost_months)
                            let nextPurchaseDate = '';
                            if (sub.start_date && costMonths > 0) {
                              const d = new Date(sub.start_date);
                              d.setMonth(d.getMonth() + costMonths);
                              nextPurchaseDate = d.toISOString().split('T')[0];
                            }
                            
                            // Cách tính vốn, hoa hồng và lãi thực tế theo số tháng đã bán
                            const monthlyCost = costMonths > 0 ? (Number(sub.cost_price || 0) / costMonths) : 0;
                            const matchingCost = monthlyCost * soldMonths;
                            const commAmount = sub.collaborator_id ? Number(sub.commission_amount || 0) : 0;
                            const netProfit = Number(sub.sell_price || 0) - matchingCost - commAmount;
                            
                            // Thanh toán khách hàng & công nợ
                            const amountPaid = Number(sub.amount_paid || 0);
                            const balance = Number(sub.sell_price || 0) - amountPaid;
                            
                            const serviceIcon = (services || []).find(s => s.service_name === sub.service_name)?.icon_name || 'box';
                            const collabObj = collaborators.find(c => c.id === sub.collaborator_id);
                            
                            // Check xem tài khoản thực tế có bị hết hạn hay không
                            const isReallyExpired = sub.status === 'expired' || warranty.days < 0;
                            const isCanceled = sub.status === 'canceled';

                            return (
                              <tr key={sub.id} style={{ opacity: isCanceled ? 0.6 : 1 }}>
                                {/* 1. Khách Hàng */}
                                <td>
                                  <div className="customer-cell">
                                    <span className="customer-name">{sub.customer_name}</span>
                                    {sub.customer_phone && (
                                      <a href={`tel:${sub.customer_phone}`} className="customer-phone" title="Gọi điện">
                                        <Phone size={10} style={{ marginRight: '4px' }} />
                                        {sub.customer_phone}
                                      </a>
                                    )}
                                    {collabObj && (
                                      <span className="collab-tag" title="Người giới thiệu">
                                        <Users size={9} /> {collabObj.name}
                                      </span>
                                    )}
                                  </div>
                                </td>

                                {/* 2. Gói Mua */}
                                <td>
                                  <span className="service-cell">
                                    {getServiceIcon(serviceIcon)}
                                    {sub.service_name}
                                  </span>
                                </td>

                                {/* 3. Tài Khoản Đăng Nhập */}
                                <td>
                                  <div className="credentials-cell">
                                    {sub.account_email && (
                                      <div 
                                        className="credential-item"
                                        onClick={() => copyToClipboard(sub.account_email, 'Email đăng nhập')}
                                        title="Click để copy email"
                                      >
                                        <Mail size={10} />
                                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '140px', whiteSpace: 'nowrap' }}>
                                          {sub.account_email}
                                        </span>
                                        <Copy size={10} style={{ marginLeft: 'auto', opacity: 0.6 }} />
                                      </div>
                                    )}

                                    {sub.account_password && (
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <div 
                                          className="credential-item password"
                                          onClick={() => copyToClipboard(sub.account_password, 'Mật khẩu')}
                                          title="Click để copy mật khẩu"
                                          style={{ flex: 1 }}
                                        >
                                          <Lock size={10} />
                                          <span>
                                            {visiblePasswords[sub.id] ? sub.account_password : '••••••••'}
                                          </span>
                                          <Copy size={10} style={{ marginLeft: 'auto', opacity: 0.6 }} />
                                        </div>
                                        <button 
                                          onClick={() => togglePasswordVisibility(sub.id)}
                                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: 'var(--text-muted)' }}
                                          title={visiblePasswords[sub.id] ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                                        >
                                          {visiblePasswords[sub.id] ? <EyeOff size={12} /> : <Eye size={12} />}
                                        </button>
                                      </div>
                                    )}

                                    {sub.notes && (
                                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', fontStyle: 'italic' }}>
                                        Ghi chú: {sub.notes}
                                      </div>
                                    )}
                                  </div>
                                </td>

                                {/* 4. Số Tháng */}
                                <td>
                                  <div className="months-cell">
                                    <div>Gói gốc: <strong>{costMonths}</strong> thg</div>
                                    <div>Đã bán: <strong>{soldMonths}</strong> thg</div>
                                    <div>
                                      Còn dư: {remainingMonths > 0 ? (
                                        <strong className="text-success">{remainingMonths} thg</strong>
                                      ) : remainingMonths === 0 ? (
                                        <span className="text-muted">Vừa đủ</span>
                                      ) : (
                                        <>
                                          <strong className="text-danger" title="Khách mua nhiều tháng hơn gói gốc hiện tại">Thiếu {Math.abs(remainingMonths)} thg</strong>
                                          {nextPurchaseDate && (
                                            <div style={{ fontSize: '11px', color: 'var(--danger)', marginTop: '4px', fontWeight: 500 }}>
                                              Mua tiếp trước: <strong style={{ textDecoration: 'underline' }}>{nextPurchaseDate}</strong>
                                            </div>
                                          )}
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </td>

                                {/* 5. Tài Chính */}
                                <td>
                                  <div className="finance-cell">
                                    <div style={{ fontSize: '11px' }}>Phân bổ vốn: <span className="price-text">{formatVND(matchingCost)}</span></div>
                                    <div style={{ fontSize: '11px' }}>Giá bán ra: <span className="price-text" style={{ fontWeight: 600 }}>{formatVND(sub.sell_price)}</span></div>
                                    {sub.collaborator_id && (
                                      <div style={{ fontSize: '11px' }}>Hoa hồng: <span className="price-text" style={{ color: 'var(--warning)' }}>-{formatVND(sub.commission_amount)}</span></div>
                                    )}
                                    <div style={{ fontSize: '12px', fontWeight: 700, borderTop: '1px dashed var(--border)', paddingTop: '2px', marginTop: '2px' }}>
                                      Lãi ròng: <span className={`price-profit ${netProfit >= 0 ? 'plus' : 'minus'}`}>
                                        {netProfit >= 0 ? '+' : ''}{formatVND(netProfit)}
                                      </span>
                                    </div>
                                  </div>
                                </td>

                                {/* 6. Khách Trả */}
                                <td>
                                  <div className="payment-cell">
                                    <div>Đã thu: <strong className="text-success">{formatVND(amountPaid)}</strong></div>
                                    {balance > 0 ? (
                                      <div style={{ fontSize: '11px', color: 'var(--danger)', marginTop: '2px' }}>
                                        Nợ khách: <strong>{formatVND(balance)}</strong>
                                      </div>
                                    ) : (
                                      <span className="badge success-badge" style={{ marginTop: '4px', display: 'inline-block', padding: '2px 6px', fontSize: '10px' }}>Đủ tiền</span>
                                    )}
                                  </div>
                                </td>

                                {/* 7. CTV & Hoa Hồng */}
                                <td>
                                  {sub.collaborator_id ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                                      <span className="price-text" style={{ fontWeight: 600 }}>{formatVND(sub.commission_amount)}</span>
                                      <button 
                                        className={`badge ${sub.commission_status === 'paid' ? 'paid' : 'pending'}`}
                                        onClick={() => handleToggleCommissionStatus(sub.id, sub.commission_status)}
                                        title="Bấm để đổi trạng thái thanh toán hoa hồng"
                                        style={{ border: 'none', cursor: 'pointer', padding: '3px 8px', fontSize: '10px' }}
                                      >
                                        {sub.commission_status === 'paid' ? 'Đã trả' : 'Chưa trả'}
                                      </button>
                                    </div>
                                  ) : (
                                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Bán trực tiếp</span>
                                  )}
                                </td>

                                {/* 8. Bảo Hành */}
                                <td>
                                  <div className="date-text">
                                    <div style={{ fontWeight: 500 }} title="Ngày bắt đầu">
                                      <Calendar size={10} style={{ marginRight: '4px' }} />
                                      {sub.start_date}
                                    </div>
                                    <div style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '2px' }} title="Ngày hết hạn">
                                      đến {sub.end_date}
                                    </div>
                                    
                                    {isCanceled ? (
                                      <span className="badge canceled" style={{ marginTop: '4px' }}>Đã hủy gói</span>
                                    ) : (
                                      <span className={`date-remaining ${warranty.statusClass}`} style={{ marginTop: '4px' }}>
                                        {warranty.label}
                                      </span>
                                    )}
                                  </div>
                                </td>

                                {/* 9. Hành Động */}
                                <td>
                                  <div className="actions-cell">
                                    {isReallyExpired && !isCanceled && (
                                      <button 
                                        className="icon-btn" 
                                        style={{ borderColor: 'var(--warning)', color: 'var(--warning)' }}
                                        onClick={() => handleOpenRenew(sub)}
                                        title="Gia hạn nhanh tài khoản này"
                                      >
                                        <RefreshCw size={14} />
                                      </button>
                                    )}
                                    <button 
                                      className="icon-btn"
                                      onClick={() => setSubModal({ isOpen: true, mode: 'edit', data: sub })}
                                      title="Sửa thông tin"
                                    >
                                      <Edit size={14} />
                                    </button>
                                    <button 
                                      className="icon-btn"
                                      onClick={() => handleDeleteSub(sub.id)}
                                      title="Xóa khách hàng"
                                      style={{ color: 'var(--danger)', borderColor: 'rgba(239,68,68,0.2)' }}
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Table Footer Stats */}
                    <div className="table-footer-info">
                      <span>Hiển thị <strong>{processedSubscriptions.length}</strong> / <strong>{subscriptions.length}</strong> khách hàng</span>
                      <span>
                        Tổng lãi ròng bộ lọc: <strong style={{ color: 'var(--success)' }}>
                          {formatVND(processedSubscriptions.reduce((acc, sub) => {
                            if (sub.status === 'canceled') return acc;
                            const costMonths = Number(sub.cost_months || 1);
                            const soldMonths = Number(sub.sold_months || 1);
                            const itemCost = costMonths > 0 ? (Number(sub.cost_price || 0) / costMonths) * soldMonths : 0;
                            const commAmount = sub.collaborator_id ? Number(sub.commission_amount || 0) : 0;
                            const netProfit = Number(sub.sell_price || 0) - itemCost - commAmount;
                            return acc + netProfit;
                          }, 0))}
                        </strong>
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 3. TAB COLLABORATORS (CỘNG TÁC VIÊN) */}
            {activeTab === 'collaborators' && (
              <div>
                <div className="controls-bar">
                  <div>
                    <h2 style={{ fontSize: '18px', fontWeight: 700 }}>Danh Sách Cộng Tác Viên (CTV)</h2>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                      Quản lý thông tin CTV, doanh số giới thiệu, hoa hồng tích lũy và thực hiện quyết toán hoa hồng.
                    </p>
                  </div>
                  <button 
                    className="btn btn-primary"
                    onClick={() => setCollabModal({ isOpen: true, mode: 'add', data: null })}
                  >
                    <Plus size={16} />
                    <span>Thêm CTV Mới</span>
                  </button>
                </div>

                {collaborators.length === 0 ? (
                  <div className="empty-state">
                    <UserCheck size={48} className="empty-state-icon" />
                    <h3>Chưa có cộng tác viên nào</h3>
                    <p>Hãy tạo cộng tác viên đầu tiên để theo dõi doanh số bán hàng của họ.</p>
                    <button className="btn btn-primary" onClick={() => setCollabModal({ isOpen: true, mode: 'add', data: null })}>
                      <Plus size={16} /> Thêm CTV
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="collaborators-grid">
                      {collaboratorStats.map(collab => (
                        <div 
                          key={collab.id} 
                          className={`collaborator-card ${selectedCollabId === collab.id ? 'active' : ''}`}
                          style={{ borderLeft: selectedCollabId === collab.id ? '4px solid var(--primary)' : '1px solid var(--border)' }}
                        >
                          <div className="collaborator-card-header">
                            <div className="collaborator-card-title">
                              <h4>{collab.name}</h4>
                              {collab.phone ? (
                                <p title="Gọi điện">
                                  <Phone size={11} /> {collab.phone}
                                </p>
                              ) : (
                                <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Chưa có SĐT</p>
                              )}
                            </div>
                            <span className="badge active" style={{ fontSize: '11px' }}>{collab.ordersCount} đơn</span>
                          </div>

                          <div className="collaborator-financials">
                            <div className="financial-metric">
                              <span className="financial-metric-label">Doanh Số</span>
                              <span className="financial-metric-value">{formatVND(collab.revenue)}</span>
                            </div>
                            <div className="financial-metric">
                              <span className="financial-metric-label">Tổng Hoa Hồng</span>
                              <span className="financial-metric-value" style={{ color: 'var(--primary)' }}>{formatVND(collab.commissionsEarned)}</span>
                            </div>
                            <div className="financial-metric">
                              <span className="financial-metric-label">Đã Thanh Toán</span>
                              <span className="financial-metric-value" style={{ color: 'var(--success)' }}>{formatVND(collab.commissionsPaid)}</span>
                            </div>
                            <div className="financial-metric">
                              <span className="financial-metric-label">Chưa Trả (Nợ)</span>
                              <span className={`financial-metric-value ${collab.commissionsPending > 0 ? 'unpaid' : ''}`}>
                                {formatVND(collab.commissionsPending)}
                              </span>
                            </div>
                          </div>

                          <div className="collaborator-card-footer">
                            <span className="collaborator-notes" title={collab.notes}>
                              {collab.notes || 'Không có ghi chú.'}
                            </span>
                            <div className="collaborator-actions">
                              <button 
                                className="btn btn-secondary"
                                style={{ padding: '4px 10px', fontSize: '11px' }}
                                onClick={() => setSelectedCollabId(selectedCollabId === collab.id ? null : collab.id)}
                              >
                                {selectedCollabId === collab.id ? 'Ẩn Đơn' : 'Xem Đơn'}
                              </button>
                              <button 
                                className="icon-btn"
                                style={{ width: '28px', height: '28px', borderRadius: '6px' }}
                                onClick={() => setCollabModal({ isOpen: true, mode: 'edit', data: collab })}
                                title="Sửa thông tin"
                              >
                                <Edit size={12} />
                              </button>
                              <button 
                                className="icon-btn"
                                style={{ width: '28px', height: '28px', borderRadius: '6px', color: 'var(--danger)', borderColor: 'rgba(239,68,68,0.2)' }}
                                onClick={() => handleDeleteCollab(collab.id)}
                                title="Xóa CTV"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Chi Tiết Đơn Hàng Của CTV Được Chọn */}
                    {selectedCollabId && (
                      <div className="collab-detail-view">
                        {(() => {
                          const targetCollab = collaborators.find(c => c.id === selectedCollabId) || { name: 'CTV Đã Xóa' };
                          const collabSubs = subscriptions.filter(s => s.collaborator_id === selectedCollabId && s.status !== 'canceled');
                          const unpaidCount = collabSubs.filter(s => s.commission_status === 'pending').length;
                          const unpaidSum = collabSubs.filter(s => s.commission_status === 'pending').reduce((sum, s) => sum + Number(s.commission_amount || 0), 0);

                          return (
                            <>
                              <div className="collab-detail-header">
                                <div className="collab-detail-info">
                                  <h3>Danh Sách Đơn Hàng: {targetCollab.name}</h3>
                                  <p>Hiển thị các đơn hàng đang bảo hành hoặc hết hạn được giới thiệu bởi CTV này</p>
                                </div>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                  {unpaidCount > 0 && (
                                    <button 
                                      className="btn btn-primary"
                                      onClick={() => handlePayAllCommissions(selectedCollabId)}
                                    >
                                      Thanh Toán Tất Cả ({formatVND(unpaidSum)})
                                    </button>
                                  )}
                                  <button 
                                    className="btn btn-secondary"
                                    onClick={() => setSelectedCollabId(null)}
                                  >
                                    Đóng
                                  </button>
                                </div>
                              </div>

                              {collabSubs.length === 0 ? (
                                <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '24px' }}>
                                  Cộng tác viên này chưa có đơn hàng nào được kích hoạt.
                                </p>
                              ) : (
                                <div className="collab-table-container">
                                  <table className="data-table" style={{ margin: 0 }}>
                                    <thead>
                                      <tr>
                                        <th>Khách Hàng</th>
                                        <th>Gói Dịch Vụ</th>
                                        <th>Ngày Bán</th>
                                        <th>Giá Bán</th>
                                        <th>Tiền Hoa Hồng</th>
                                        <th>Trạng Thái Hoa Hồng</th>
                                        <th>Trạng Thái Đơn</th>
                                        <th style={{ width: '130px' }}>Hành Động</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {collabSubs.map(s => {
                                        const warranty = getWarrantyStatus(s.end_date);
                                        return (
                                          <tr key={s.id}>
                                            <td><strong>{s.customer_name}</strong></td>
                                            <td>{s.service_name}</td>
                                            <td>{s.start_date}</td>
                                            <td>{formatVND(s.sell_price)}</td>
                                            <td><strong>{formatVND(s.commission_amount)}</strong></td>
                                            <td>
                                              <span className={`badge ${s.commission_status === 'paid' ? 'paid' : 'pending'}`}>
                                                {s.commission_status === 'paid' ? 'Đã thanh toán' : 'Chưa thanh toán'}
                                              </span>
                                            </td>
                                            <td>
                                              <span className={`date-remaining ${s.status === 'active' && warranty.days >= 0 ? 'ok' : 'expired'}`}>
                                                {s.status === 'active' && warranty.days >= 0 ? 'Còn hạn' : 'Hết hạn'}
                                              </span>
                                            </td>
                                            <td>
                                              <button 
                                                className="btn btn-secondary"
                                                style={{ padding: '4px 8px', fontSize: '11px' }}
                                                onClick={() => handleToggleCommissionStatus(s.id, s.commission_status)}
                                              >
                                                {s.commission_status === 'paid' ? 'Đánh dấu Chưa Trả' : 'Đánh dấu Đã Trả'}
                                              </button>
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* 4. TAB SERVICES (CẤU HÌNH GÓI DỊCH VỤ) */}
            {activeTab === 'services' && (
              <div>
                <div className="controls-bar">
                  <div>
                    <h2 style={{ fontSize: '18px', fontWeight: 700 }}>Danh Mục Gói Dịch Vụ Mẫu</h2>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                      Tạo các mẫu dịch vụ để tự động hóa việc tính giá vốn, giá bán và hoa hồng CTV mặc định khi tạo mới đơn hàng.
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      className="btn btn-secondary"
                      onClick={() => setIsBulkImportOpen(true)}
                    >
                      <Sparkles size={16} />
                      <span>Nhập Nhanh Nhiều Gói</span>
                    </button>
                    <button 
                      className="btn btn-primary"
                      onClick={() => setServiceModal({ isOpen: true, mode: 'add', data: null })}
                    >
                      <Plus size={16} />
                      <span>Thêm Gói Mới</span>
                    </button>
                  </div>
                </div>

                {services.length === 0 ? (
                  <div className="empty-state">
                    <Box size={48} className="empty-state-icon" />
                    <h3>Chưa có dịch vụ cấu hình nào</h3>
                    <p>Hãy tạo cấu hình dịch vụ đầu tiên để giúp nhập liệu khách hàng nhanh hơn.</p>
                    <button className="btn btn-primary" onClick={() => setServiceModal({ isOpen: true, mode: 'add', data: null })}>
                      <Plus size={16} /> Tạo dịch vụ mẫu
                    </button>
                  </div>
                ) : (
                  <div>
                    {Object.entries(groupedServices).map(([groupName, groupList]) => (
                      <div key={groupName} className="service-group-container" style={{ marginBottom: '32px' }}>
                        <h3 style={{ 
                          fontSize: '15px', 
                          fontWeight: 700, 
                          color: 'var(--text-main)', 
                          margin: '24px 0 12px 0', 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '8px',
                          borderBottom: '1px solid var(--border)',
                          paddingBottom: '8px'
                        }}>
                          <span style={{ width: '4px', height: '14px', backgroundColor: 'var(--primary)', borderRadius: '2px' }}></span>
                          {groupName} ({groupList.length})
                        </h3>
                        
                        <div className="services-list-grid" style={{ marginTop: '12px' }}>
                          {groupList.map(serv => {
                            const defaultComm = Number(serv.default_commission || 0);
                            const estimatedProfit = serv.default_sell_price - serv.default_cost_price;
                            const estimatedNetProfit = estimatedProfit - defaultComm;
                            return (
                              <div key={serv.id} className="service-config-card">
                                <div className="service-config-info">
                                  <div className="service-icon-wrapper">
                                    {getServiceIcon(serv.icon_name)}
                                  </div>
                                  <div className="service-config-detail">
                                    <h4>{serv.service_name}</h4>
                                    <p title="Giá gốc mua vào">Vốn gốc: <strong>{formatVND(serv.default_cost_price)}</strong></p>
                                    <p title="Giá bán ra cho khách hàng">Giá bán: <strong>{formatVND(serv.default_sell_price)}</strong></p>
                                    <p title="Hoa hồng cho CTV">Hoa hồng CTV: <strong style={{ color: 'var(--warning)' }}>{formatVND(defaultComm)}</strong></p>
                                    <p style={{ color: 'var(--success)', fontWeight: 700, marginTop: '2px' }}>
                                      Lãi ròng ước tính: +{formatVND(estimatedNetProfit)}
                                    </p>
                                    {serv.notes && (
                                      <div style={{ 
                                        fontSize: '11px', 
                                        color: 'var(--text-muted)', 
                                        marginTop: '8px', 
                                        backgroundColor: 'var(--bg-app)', 
                                        padding: '8px 10px', 
                                        borderRadius: 'var(--radius-sm)',
                                        borderLeft: '3px solid var(--primary)',
                                        lineHeight: '1.4',
                                        whiteSpace: 'pre-wrap',
                                        wordBreak: 'break-word'
                                      }}>
                                        <strong>Ghi chú:</strong> {serv.notes}
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                  <button 
                                    className="icon-btn"
                                    onClick={() => setServiceModal({ isOpen: true, mode: 'edit', data: serv })}
                                    title="Chỉnh sửa dịch vụ"
                                  >
                                    <Edit size={12} />
                                  </button>
                                  <button 
                                    className="icon-btn"
                                    onClick={() => handleDeleteService(serv.id)}
                                    title="Xóa dịch vụ"
                                    style={{ color: 'var(--danger)', borderColor: 'rgba(239,68,68,0.2)' }}
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB DATABASE CONFIG (KẾT NỐI SUPABASE)
            <div className="chart-card" style={{ marginTop: '48px', borderStyle: 'dashed' }}>
              <div className="card-title-section">
                <h3>Cấu Hình Độc Lập Cloud Supabase</h3>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Cho phép lưu trữ dữ liệu tập trung & đa thiết bị</span>
              </div>
              <form onSubmit={handleConnectSupabase} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '16px', alignItems: 'end' }}>
                <div className="form-group">
                  <label className="form-label">Supabase URL</label>
                  <input 
                    type="text" 
                    placeholder="https://xxxxxx.supabase.co" 
                    value={dbConfigUrl} 
                    onChange={(e) => setDbConfigUrl(e.target.value)}
                    className="form-input" 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Supabase Anon Key</label>
                  <input 
                    type="password" 
                    placeholder="eyJhbGciOi..." 
                    value={dbConfigKey} 
                    onChange={(e) => setDbConfigKey(e.target.value)}
                    className="form-input" 
                  />
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="submit" className="btn btn-primary" style={{ height: '42px' }}>Kết Nối</button>
                  {dbStatus.type === 'supabase' && (
                    <button 
                      type="button" 
                      onClick={handleDisconnectSupabase} 
                      className="btn btn-secondary" 
                      style={{ height: '42px', color: 'var(--danger)', borderColor: 'rgba(239,68,68,0.2)' }}
                    >
                      Ngắt Kết Nối
                    </button>
                  )}
                </div>
              </form>
              
              {dbStatus.type === 'supabase' && (
                <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-app)', padding: '12px 18px', borderRadius: 'var(--radius-md)' }}>
                  <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                    <strong>Đã kết nối dữ liệu đám mây.</strong> Bạn có thể đồng bộ các thay đổi cục bộ hiện tại (nếu có) lên Supabase.
                  </span>
                  <button 
                    onClick={handleSyncToSupabase} 
                    className="btn btn-secondary animate-pulse"
                    disabled={syncing}
                    style={{ fontSize: '12px', padding: '6px 14px' }}
                  >
                    <RefreshCw size={12} className={syncing ? 'spin-anim' : ''} style={{ marginRight: '6px' }} />
                    {syncing ? 'Đang đồng bộ...' : 'Đồng Bộ Lên Cloud'}
                  </button>
                </div>
              )}
            </div>
            */}
          </>
        )}
      </div>

      {/* --- TOAST NOTIFICATIONS --- */}
      {toast && (
        <div className="toast-container">
          <div className={`toast ${toast.type}`}>
            {toast.type === 'success' && <CheckCircle size={16} style={{ color: 'var(--success)' }} />}
            {toast.type === 'danger' && <AlertCircle size={16} style={{ color: 'var(--danger)' }} />}
            {toast.type === 'warning' && <AlertTriangle size={16} style={{ color: 'var(--warning)' }} />}
            {toast.type === 'info' && <Info size={16} style={{ color: 'var(--info)' }} />}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* --- MODAL DIALOGS --- */}
      
      {/* 1. Modal Thêm / Sửa / Gia hạn Khách hàng */}
      {subModal.isOpen && (
        <SubscriptionModalForm 
          mode={subModal.mode}
          data={subModal.data}
          services={services}
          collaborators={collaborators}
          onClose={() => setSubModal({ isOpen: false, mode: 'add', data: null })}
          onSave={handleSaveSub}
          formatVND={formatVND}
        />
      )}

      {/* 2. Modal Thêm / Sửa Gói Dịch vụ */}
      {serviceModal.isOpen && (
        <ServiceModalForm 
          mode={serviceModal.mode}
          data={serviceModal.data}
          onClose={() => setServiceModal({ isOpen: false, mode: 'add', data: null })}
          onSave={handleSaveService}
        />
      )}

      {/* 3. Modal Thêm / Sửa Cộng tác viên */}
      {collabModal.isOpen && (
        <CollaboratorModalForm 
          mode={collabModal.mode}
          data={collabModal.data}
          onClose={() => setCollabModal({ isOpen: false, mode: 'add', data: null })}
          onSave={handleSaveCollab}
        />
      )}

      {/* 4. Modal Nhập Nhanh Nhiều Gói */}
      {isBulkImportOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '900px', width: '95%' }}>
            <div className="modal-header">
              <h3>Nhập Nhanh Nhiều Gói Dịch Vụ</h3>
              <button 
                className="icon-btn" 
                onClick={() => {
                  setIsBulkImportOpen(false);
                  setBulkInputText('');
                  setParsedServices([]);
                }} 
                style={{ border: 'none', fontSize: '18px' }}
              >
                ×
              </button>
            </div>
            
            <div className="modal-body" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
              <div style={{ marginBottom: '16px' }}>
                <label className="form-label" style={{ fontWeight: 600 }}>Dán danh sách sản phẩm, giá & hoa hồng:</label>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                  Hệ thống tự động phát hiện tên gói, giá bán và hoa hồng tương ứng.
                </p>
                <textarea
                  value={bulkInputText}
                  onChange={(e) => setBulkInputText(e.target.value)}
                  className="form-input"
                  style={{ minHeight: '150px', fontFamily: 'monospace', fontSize: '12px', padding: '12px' }}
                  placeholder="Ví dụ:&#13;+ Canva Education (1 Năm - Kích hoạt slot): 100.000 ₫ (bảo hành)&#13;&#13;Đây là hoa hồng/đơn nhé&#13;+ Canva Education (1 Năm - Slot): 20.000 ₫ / đơn"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
                <button type="button" className="btn btn-secondary" onClick={handleParseBulk}>
                  <Sparkles size={14} style={{ marginRight: '6px' }} />
                  Phân Tích Dữ Liệu
                </button>
              </div>

              {parsedServices.length > 0 && (
                <div>
                  <label className="form-label" style={{ fontWeight: 600, marginBottom: '8px', display: 'block' }}>
                    Kết quả phân tích ({parsedServices.length} gói):
                  </label>
                  <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
                    <table className="data-table" style={{ margin: 0, minWidth: '800px' }}>
                      <thead>
                        <tr>
                          <th style={{ width: '40px', textAlign: 'center' }}>
                            <input 
                              type="checkbox" 
                              checked={parsedServices.every(s => s.checked)}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setParsedServices(prev => prev.map(s => ({ ...s, checked })));
                              }}
                            />
                          </th>
                          <th>Tên Gói Dịch Vụ</th>
                          <th style={{ width: '120px' }}>Giá Vốn (VND)</th>
                          <th style={{ width: '120px' }}>Giá Bán (VND)</th>
                          <th style={{ width: '120px' }}>Hoa Hồng CTV (VND)</th>
                          <th style={{ width: '140px' }}>Biểu Tượng</th>
                          <th>Ghi Chú</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parsedServices.map((item, idx) => (
                          <tr key={idx} style={{ opacity: item.checked ? 1 : 0.5 }}>
                            <td style={{ textAlign: 'center' }}>
                              <input 
                                type="checkbox" 
                                checked={item.checked}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  setParsedServices(prev => prev.map((s, i) => i === idx ? { ...s, checked } : s));
                                }}
                              />
                            </td>
                            <td>
                              <input 
                                type="text" 
                                value={item.service_name}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setParsedServices(prev => prev.map((s, i) => i === idx ? { ...s, service_name: val } : s));
                                }}
                                className="form-input"
                                style={{ padding: '4px 8px', fontSize: '12px' }}
                              />
                            </td>
                            <td>
                              <input 
                                type="number" 
                                value={item.default_cost_price}
                                onChange={(e) => {
                                  const val = Number(e.target.value);
                                  setParsedServices(prev => prev.map((s, i) => i === idx ? { ...s, default_cost_price: val } : s));
                                }}
                                className="form-input"
                                style={{ padding: '4px 8px', fontSize: '12px' }}
                              />
                            </td>
                            <td>
                              <input 
                                type="number" 
                                value={item.default_sell_price}
                                onChange={(e) => {
                                  const val = Number(e.target.value);
                                  setParsedServices(prev => prev.map((s, i) => i === idx ? { ...s, default_sell_price: val } : s));
                                }}
                                className="form-input"
                                style={{ padding: '4px 8px', fontSize: '12px' }}
                              />
                            </td>
                            <td>
                              <input 
                                type="number" 
                                value={item.default_commission}
                                onChange={(e) => {
                                  const val = Number(e.target.value);
                                  setParsedServices(prev => prev.map((s, i) => i === idx ? { ...s, default_commission: val } : s));
                                }}
                                className="form-input"
                                style={{ padding: '4px 8px', fontSize: '12px' }}
                              />
                            </td>
                            <td>
                              <select 
                                value={item.icon_name}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setParsedServices(prev => prev.map((s, i) => i === idx ? { ...s, icon_name: val } : s));
                                }}
                                className="form-input"
                                style={{ padding: '4px 8px', fontSize: '12px' }}
                              >
                                <option value="zap">Sấm sét (Grok AI...)</option>
                                <option value="play">Xem (Youtube...)</option>
                                <option value="video">Video (CapCut...)</option>
                                <option value="message-square">Chat (ChatGPT...)</option>
                                <option value="globe">Web (Google...)</option>
                                <option value="image">Ảnh (Canva...)</option>
                                <option value="box">Hộp / Khác</option>
                              </select>
                            </td>
                            <td>
                              <input 
                                type="text" 
                                value={item.notes}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setParsedServices(prev => prev.map((s, i) => i === idx ? { ...s, notes: val } : s));
                                }}
                                className="form-input"
                                placeholder="Ghi chú gói..."
                                style={{ padding: '4px 8px', fontSize: '12px' }}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => {
                  setIsBulkImportOpen(false);
                  setBulkInputText('');
                  setParsedServices([]);
                }}
              >
                Hủy Bỏ
              </button>
              <button 
                type="button" 
                className="btn btn-primary" 
                onClick={handleSaveBulkImport}
                disabled={parsedServices.filter(s => s.checked).length === 0}
              >
                Lưu {parsedServices.filter(s => s.checked).length} Gói Dịch Vụ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// COMPONENT FORM CHI TIẾT KHÁCH HÀNG (MODAL)
// ==========================================
function SubscriptionModalForm({ mode, data, services, collaborators, onClose, onSave, formatVND }) {
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_phone: '',
    service_name: '',
    account_email: '',
    account_password: '',
    cost_price: 0,
    cost_months: 1,
    sold_months: 1,
    sell_price: 0,
    amount_paid: 0,
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    status: 'active',
    notes: '',
    collaborator_id: '',
    commission_amount: 0,
    commission_status: 'none'
  });

  // Tự động gán dữ liệu nếu chế độ là Sửa hoặc Gia hạn
  useEffect(() => {
    if (data) {
      setFormData({
        customer_name: data.customer_name || '',
        customer_phone: data.customer_phone || '',
        service_name: data.service_name || '',
        account_email: data.account_email || '',
        account_password: data.account_password || '',
        cost_price: data.cost_price || 0,
        cost_months: data.cost_months || 1,
        sold_months: data.sold_months || 1,
        sell_price: data.sell_price || 0,
        amount_paid: data.amount_paid !== undefined ? data.amount_paid : (data.sell_price || 0),
        start_date: data.start_date || new Date().toISOString().split('T')[0],
        end_date: data.end_date || '',
        status: data.status || 'active',
        notes: data.notes || '',
        collaborator_id: data.collaborator_id || '',
        commission_amount: data.commission_amount || 0,
        commission_status: data.commission_status || 'none'
      });
    } else {
      if (services.length > 0) {
        selectServiceTemplate(services[0].service_name);
      }
    }
  }, [data, services]);

  const groupedServices = useMemo(() => {
    const groups = {};
    services.forEach(s => {
      const group = getServiceGroup(s.service_name);
      if (!groups[group]) groups[group] = [];
      groups[group].push(s);
    });
    return Object.keys(groups).sort((a, b) => {
      if (a === 'Dịch vụ khác') return 1;
      if (b === 'Dịch vụ khác') return -1;
      return a.localeCompare(b);
    }).reduce((acc, key) => {
      acc[key] = groups[key];
      return acc;
    }, {});
  }, [services]);

  const handleServiceChange = (e) => {
    const sName = e.target.value;
    selectServiceTemplate(sName);
  };

  const selectServiceTemplate = (serviceName) => {
    const template = services.find(s => s.service_name === serviceName);
    
    const stDate = formData.start_date ? new Date(formData.start_date) : new Date();
    const edDate = new Date();
    edDate.setDate(stDate.getDate() + 30);
    const calculatedEndDate = edDate.toISOString().split('T')[0];

    const defaultCost = template ? template.default_cost_price : 0;
    const defaultSell = template ? template.default_sell_price : 0;
    
    const defaultComm = (template && formData.collaborator_id) ? Number(template.default_commission || 0) : 0;
    const defaultCommStatus = formData.collaborator_id ? 'pending' : 'none';

    setFormData(prev => ({
      ...prev,
      service_name: serviceName,
      cost_price: defaultCost,
      cost_months: 1,
      sold_months: 1,
      sell_price: defaultSell,
      amount_paid: defaultSell,
      end_date: prev.end_date || calculatedEndDate,
      commission_amount: prev.collaborator_id ? defaultComm : 0,
      commission_status: prev.collaborator_id ? defaultCommStatus : 'none'
    }));
  };

  const handleCollabChange = (e) => {
    const collabId = e.target.value;
    const template = services.find(s => s.service_name === formData.service_name);
    const defaultComm = (template && collabId) ? Number(template.default_commission || 0) : 0;
    const defaultCommStatus = collabId ? 'pending' : 'none';

    setFormData(prev => ({
      ...prev,
      collaborator_id: collabId,
      commission_amount: defaultComm,
      commission_status: defaultCommStatus
    }));
  };

  // Các nút phím tắt tăng thời hạn nhanh
  const addDurationDays = (days) => {
    const baseDate = formData.start_date ? new Date(formData.start_date) : new Date();
    const newEnd = new Date(baseDate.getTime());
    newEnd.setDate(baseDate.getDate() + days);
    setFormData(prev => ({
      ...prev,
      end_date: newEnd.toISOString().split('T')[0]
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.customer_name || !formData.service_name || !formData.end_date) {
      alert('Vui lòng điền đủ Tên Khách, Loại Gói và Hạn Bảo Hành!');
      return;
    }
    onSave(formData);
  };

  const costMonths = Number(formData.cost_months || 1);
  const soldMonths = Number(formData.sold_months || 1);
  const monthlyCost = costMonths > 0 ? (Number(formData.cost_price || 0) / costMonths) : 0;
  const matchingCost = monthlyCost * soldMonths;
  const commAmount = formData.collaborator_id ? Number(formData.commission_amount || 0) : 0;
  const estimatedProfit = formData.sell_price - matchingCost - commAmount;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>
            {mode === 'add' && 'Thêm Đơn Hàng Khách Hàng Mới'}
            {mode === 'edit' && 'Cập Nhật Thông Tin Khách Hàng'}
            {mode === 'renew' && `Gia Hạn Gói Cho: ${formData.customer_name}`}
          </h3>
          <button className="icon-btn" onClick={onClose} style={{ border: 'none', fontSize: '18px' }}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
            <div className="form-grid">
              
              {/* Tên khách hàng */}
              <div className="form-group full-width">
                <label className="form-label">Tên Khách Hàng *</label>
                <input 
                  type="text" 
                  value={formData.customer_name} 
                  onChange={(e) => setFormData(prev => ({ ...prev, customer_name: e.target.value }))}
                  className="form-input" 
                  placeholder="Ví dụ: Nguyễn Văn A"
                  required
                  disabled={mode === 'renew'}
                />
              </div>

              {/* SĐT liên hệ */}
              <div className="form-group">
                <label className="form-label">Số Điện Thoại</label>
                <input 
                  type="tel" 
                  value={formData.customer_phone} 
                  onChange={(e) => setFormData(prev => ({ ...prev, customer_phone: e.target.value }))}
                  className="form-input" 
                  placeholder="Ví dụ: 0912345678"
                  disabled={mode === 'renew'}
                />
              </div>

              {/* Chọn dịch vụ bán */}
              <div className="form-group">
                <label className="form-label">Gói Dịch Vụ Premium *</label>
                <select 
                  value={formData.service_name}
                  onChange={handleServiceChange}
                  className="form-input"
                  required
                  disabled={mode === 'renew'}
                >
                  <option value="" disabled>-- Chọn gói dịch vụ --</option>
                  {Object.entries(groupedServices).map(([groupName, groupList]) => (
                    <optgroup key={groupName} label={groupName}>
                      {groupList.map(s => (
                        <option key={s.id} value={s.service_name}>{s.service_name}</option>
                      ))}
                    </optgroup>
                  ))}
                  {formData.service_name && !services.some(s => s.service_name === formData.service_name) && (
                    <option value={formData.service_name}>{formData.service_name}</option>
                  )}
                </select>
              </div>

              {/* Tài khoản bàn giao (Email) */}
              <div className="form-group">
                <label className="form-label">Email Đăng Nhập Tài Khoản</label>
                <input 
                  type="email" 
                  value={formData.account_email} 
                  onChange={(e) => setFormData(prev => ({ ...prev, account_email: e.target.value }))}
                  className="form-input" 
                  placeholder="email@account.com"
                />
              </div>

              {/* Mật khẩu bàn giao */}
              <div className="form-group">
                <label className="form-label">Mật Khẩu Tài Khoản</label>
                <input 
                  type="text" 
                  value={formData.account_password} 
                  onChange={(e) => setFormData(prev => ({ ...prev, account_password: e.target.value }))}
                  className="form-input" 
                  placeholder="Mật khẩu tài khoản"
                />
              </div>

              {/* Cộng Tác Viên */}
              <div className="form-group">
                <label className="form-label">Cộng Tác Viên (Nếu có)</label>
                <select 
                  value={formData.collaborator_id}
                  onChange={handleCollabChange}
                  className="form-input"
                >
                  <option value="">Bán trực tiếp (Không qua CTV)</option>
                  {collaborators.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Hoa Hồng CTV */}
              {formData.collaborator_id && (
                <>
                  <div className="form-group">
                    <label className="form-label">Tiền Hoa Hồng CTV (VND) *</label>
                    <input 
                      type="number" 
                      value={formData.commission_amount} 
                      onChange={(e) => setFormData(prev => ({ ...prev, commission_amount: Number(e.target.value) }))}
                      className="form-input" 
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Thanh Toán Hoa Hồng CTV</label>
                    <select 
                      value={formData.commission_status} 
                      onChange={(e) => setFormData(prev => ({ ...prev, commission_status: e.target.value }))}
                      className="form-input"
                    >
                      <option value="pending">Chưa thanh toán (Ghi nợ)</option>
                      <option value="paid">Đã thanh toán xong</option>
                    </select>
                  </div>
                </>
              )}

              {/* Giá gốc mua vào */}
              <div className="form-group">
                <label className="form-label">Giá Vốn Tổng Gói Gốc (VND) *</label>
                <input 
                  type="number" 
                  value={formData.cost_price} 
                  onChange={(e) => setFormData(prev => ({ ...prev, cost_price: Number(e.target.value) }))}
                  className="form-input" 
                  required
                />
              </div>

              {/* Số tháng mua gốc */}
              <div className="form-group">
                <label className="form-label">Số Tháng Mua Gói Gốc *</label>
                <input 
                  type="number" 
                  value={formData.cost_months} 
                  onChange={(e) => setFormData(prev => ({ ...prev, cost_months: Math.max(1, Number(e.target.value)) }))}
                  className="form-input" 
                  required
                  min="1"
                />
              </div>

              {/* Giá bán cho khách */}
              <div className="form-group">
                <label className="form-label">Giá Bán Cho Khách (VND) *</label>
                <input 
                  type="number" 
                  value={formData.sell_price} 
                  onChange={(e) => {
                    const newSell = Number(e.target.value);
                    setFormData(prev => ({ 
                      ...prev, 
                      sell_price: newSell,
                      amount_paid: prev.amount_paid === prev.sell_price ? newSell : prev.amount_paid 
                    }));
                  }}
                  className="form-input" 
                  required
                />
              </div>

              {/* Số tháng bán cho khách */}
              <div className="form-group">
                <label className="form-label">Số Tháng Đã Bán *</label>
                <input 
                  type="number" 
                  value={formData.sold_months} 
                  onChange={(e) => setFormData(prev => ({ ...prev, sold_months: Math.max(1, Number(e.target.value)) }))}
                  className="form-input" 
                  required
                  min="1"
                />
              </div>

              {/* Đã thanh toán */}
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                  Khách Đã Trả (VND) *
                  <span 
                    style={{ fontSize: '11px', color: 'var(--primary)', cursor: 'pointer', fontWeight: 600 }}
                    onClick={() => setFormData(prev => ({ ...prev, amount_paid: prev.sell_price }))}
                  >
                    [Thu Đủ]
                  </span>
                </label>
                <input 
                  type="number" 
                  value={formData.amount_paid} 
                  onChange={(e) => setFormData(prev => ({ ...prev, amount_paid: Number(e.target.value) }))}
                  className="form-input" 
                  required
                />
              </div>

              {/* Ngày bắt đầu */}
              <div className="form-group">
                <label className="form-label">Ngày Bắt Đầu Bảo Hành *</label>
                <input 
                  type="date" 
                  value={formData.start_date} 
                  onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                  className="form-input" 
                  required
                />
              </div>

              {/* Ngày hết hạn */}
              <div className="form-group">
                <label className="form-label">Ngày Hết Hạn Bảo Hành *</label>
                <input 
                  type="date" 
                  value={formData.end_date} 
                  onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                  className="form-input" 
                  required
                />
              </div>

              {/* Phím tắt điền thời hạn nhanh */}
              <div className="form-group full-width" style={{ marginBottom: '8px' }}>
                <span className="form-label" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Tính ngày hết hạn nhanh kể từ Ngày bắt đầu:</span>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
                  <button type="button" className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => addDurationDays(30)}>+30 Ngày</button>
                  <button type="button" className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => addDurationDays(90)}>+3 Tháng (90 ngày)</button>
                  <button type="button" className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => addDurationDays(180)}>+6 Tháng (180 ngày)</button>
                  <button type="button" className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => addDurationDays(365)}>+1 Năm (365 ngày)</button>
                </div>
              </div>

              {/* Trạng thái đơn hàng */}
              <div className="form-group">
                <label className="form-label">Trạng Thái Đăng Ký</label>
                <select 
                  value={formData.status} 
                  onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                  className="form-input"
                >
                  <option value="active">Đang hoạt động (Bảo hành)</option>
                  <option value="expired">Đã hết hạn bảo hành</option>
                  <option value="canceled">Đã hủy gói / Đã hoàn tiền</option>
                </select>
              </div>

              {/* Ước tính lợi nhuận ròng */}
              <div className="form-group" style={{ display: 'flex', justifyContent: 'center', flexDirection: 'column' }}>
                <span className="form-label" style={{ color: 'var(--text-muted)' }}>Lãi ròng thu về:</span>
                <span style={{ fontSize: '16px', fontWeight: 800, color: estimatedProfit >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                  {formatVND(estimatedProfit)}
                </span>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>(Giá bán - Phân bổ vốn - Hoa hồng CTV)</span>
              </div>

              {/* Ghi chú */}
              <div className="form-group full-width">
                <label className="form-label">Ghi Chú Đơn Hàng / Profile dùng chung / Lịch sử đổi pass</label>
                <textarea 
                  value={formData.notes} 
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit(e);
                    }
                  }}
                  className="form-input form-textarea" 
                  placeholder="Ví dụ: Profile số 3, khách dùng chung với A B C..."
                />
              </div>

            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Hủy Bỏ</button>
            <button type="submit" className="btn btn-primary">
              {mode === 'add' ? 'Thêm Khách Hàng' : 'Lưu Thay Đổi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ==========================================
// COMPONENT FORM GÓI DỊCH VỤ MẪU (MODAL)
// ==========================================
function ServiceModalForm({ mode, data, onClose, onSave }) {
  const [formData, setFormData] = useState({
    service_name: '',
    default_cost_price: 0,
    default_sell_price: 0,
    default_commission: 0,
    icon_name: 'box',
    notes: ''
  });

  useEffect(() => {
    if (data) {
      setFormData({
        service_name: data.service_name || '',
        default_cost_price: data.default_cost_price || 0,
        default_sell_price: data.default_sell_price || 0,
        default_commission: data.default_commission || 0,
        icon_name: data.icon_name || 'box',
        notes: data.notes || ''
      });
    }
  }, [data]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.service_name) {
      alert('Vui lòng điền tên dịch vụ!');
      return;
    }
    onSave(formData);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '450px' }}>
        <div className="modal-header">
          <h3>
            {mode === 'add' ? 'Thêm Cấu Hình Dịch Vụ Mới' : 'Sửa Cấu Hình Dịch Vụ'}
          </h3>
          <button className="icon-btn" onClick={onClose} style={{ border: 'none', fontSize: '18px' }}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            
            <div className="form-group">
              <label className="form-label">Tên Gói Dịch Vụ Premium *</label>
              <input 
                type="text" 
                value={formData.service_name}
                onChange={(e) => setFormData(prev => ({ ...prev, service_name: e.target.value }))}
                className="form-input"
                placeholder="Ví dụ: ChatGPT Plus, Youtube Premium..."
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Giá Vốn Mặc Định (VND)</label>
              <input 
                type="number" 
                value={formData.default_cost_price}
                onChange={(e) => setFormData(prev => ({ ...prev, default_cost_price: Number(e.target.value) }))}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Giá Bán Mặc Định (VND)</label>
              <input 
                type="number" 
                value={formData.default_sell_price}
                onChange={(e) => setFormData(prev => ({ ...prev, default_sell_price: Number(e.target.value) }))}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Hoa Hồng CTV Mặc Định (VND)</label>
              <input 
                type="number" 
                value={formData.default_commission}
                onChange={(e) => setFormData(prev => ({ ...prev, default_commission: Number(e.target.value) }))}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Biểu Tượng Đại Diện</label>
              <select 
                value={formData.icon_name}
                onChange={(e) => setFormData(prev => ({ ...prev, icon_name: e.target.value }))}
                className="form-input"
              >
                <option value="message-square">Hội thoại (ChatGPT, Gemini...)</option>
                <option value="video">Video (CapCut Pro, Meitu VIP...)</option>
                <option value="play">Xem / Nhạc (Youtube Premium, Duolingo...)</option>
                <option value="globe">Trình duyệt / Cloud (Google AI Pro...)</option>
                <option value="zap">Sấm sét / Tốc độ (Grok Super...)</option>
                <option value="image">Hình ảnh / Thiết kế (Canva...)</option>
                <option value="box">Hộp / Khác</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Ghi Chú Gói Dịch Vụ</label>
              <textarea 
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
                className="form-input"
                placeholder="Ví dụ: Giao tài khoản trong 5 phút, bảo hành trọn đời..."
                rows={3}
                style={{ resize: 'vertical', minHeight: '80px', padding: '10px 12px' }}
              />
            </div>

          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Hủy Bỏ</button>
            <button type="submit" className="btn btn-primary">Lưu Lại</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ==========================================
// COMPONENT FORM CỘNG TÁC VIÊN (MODAL)
// ==========================================
function CollaboratorModalForm({ mode, data, onClose, onSave }) {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    notes: ''
  });

  useEffect(() => {
    if (data) {
      setFormData({
        name: data.name || '',
        phone: data.phone || '',
        notes: data.notes || ''
      });
    }
  }, [data]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name) {
      alert('Vui lòng điền tên cộng tác viên!');
      return;
    }
    onSave(formData);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '420px' }}>
        <div className="modal-header">
          <h3>
            {mode === 'add' ? 'Thêm Cộng Tác Viên Mới' : 'Sửa Thông Tin Cộng Tác Viên'}
          </h3>
          <button className="icon-btn" onClick={onClose} style={{ border: 'none', fontSize: '18px' }}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            
            <div className="form-group">
              <label className="form-label">Tên Cộng Tác Viên *</label>
              <input 
                type="text" 
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="form-input"
                placeholder="Ví dụ: Nguyễn Văn CTV..."
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Số Điện Thoại</label>
              <input 
                type="tel" 
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                className="form-input"
                placeholder="Ví dụ: 0987xxx..."
              />
            </div>

            <div className="form-group">
              <label className="form-label">Ghi Chú</label>
              <textarea 
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
                className="form-input"
                placeholder="Ví dụ: Khu vực hoạt động, số tài khoản nhận tiền..."
                rows={3}
                style={{ resize: 'vertical', minHeight: '80px', padding: '10px 12px' }}
              />
            </div>

          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Hủy Bỏ</button>
            <button type="submit" className="btn btn-primary">Lưu Lại</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default App;
