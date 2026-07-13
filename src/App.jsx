import React, { useState, useEffect, useMemo } from 'react';
import { 
  TrendingUp, TrendingDown, DollarSign, Users, Clock, AlertTriangle, 
  Search, Plus, Edit, Trash2, RefreshCw, Copy, ExternalLink, 
  Database, Sun, Moon, Check, Box, MessageSquare, Video, Globe, Zap, 
  Image, Play, CheckCircle, Info, Calendar, Phone, Lock, Eye, EyeOff, Mail,
  Sparkles, Layers, ChevronRight, AlertCircle, HelpCircle
} from 'lucide-react';
import {
  fetchSubscriptions, addSubscription, updateSubscription, deleteSubscription,
  fetchServicesConfig, addServiceConfig, updateServiceConfig, deleteServiceConfig,
  getDbStatus, saveSupabaseConfig, clearSupabaseConfig, syncLocalToSupabase
} from './db';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area
} from 'recharts';

function App() {
  // --- STATE ---
  const [subscriptions, setSubscriptions] = useState([]);
  const [services, setServices] = useState([]);
  const [dbStatus, setDbStatus] = useState(getDbStatus());
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  
  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [filterService, setFilterService] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('end_date'); // 'end_date' | 'profit' | 'customer_name'
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc' | 'desc'
  
  // Modals state
  const [subModal, setSubModal] = useState({ isOpen: false, mode: 'add', data: null });
  const [serviceModal, setServiceModal] = useState({ isOpen: false, mode: 'add', data: null });
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
      const [subsData, servicesData] = await Promise.all([
        fetchSubscriptions(),
        fetchServicesConfig()
      ]);
      setSubscriptions(subsData);
      setServices(servicesData);
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

    subscriptions.forEach(s => {
      // Bỏ qua các đơn hàng bị hủy khi tính doanh thu/lợi nhuận
      if (s.status !== 'canceled') {
        revenue += Number(s.sell_price || 0);
        
        const costMonths = Number(s.cost_months || 1);
        const soldMonths = Number(s.sold_months || 1);
        const itemCost = costMonths > 0 ? (Number(s.cost_price || 0) / costMonths) * soldMonths : 0;
        cost += itemCost;
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

    const profit = revenue - cost;
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

    return {
      totalRevenue: revenue,
      totalCost: cost,
      totalProfit: profit,
      profitMargin: margin,
      activeCount: active,
      expiredCount: expired,
      expiringSoonCount: expiringSoon
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
        // Định dạng "Tháng MM/YYYY" để hiển thị trực quan
        const key = `${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
        const sortKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        if (!monthlyMap[key]) {
          monthlyMap[key] = {
            name: key,
            'Doanh thu': 0,
            'Vốn': 0,
            'Lợi nhuận': 0,
            sortKey
          };
        }
        
        const costMonths = Number(s.cost_months || 1);
        const soldMonths = Number(s.sold_months || 1);
        const itemCost = costMonths > 0 ? (Number(s.cost_price || 0) / costMonths) * soldMonths : 0;
        const itemProfit = Number(s.sell_price || 0) - itemCost;

        monthlyMap[key]['Doanh thu'] += Number(s.sell_price || 0);
        monthlyMap[key]['Vốn'] += itemCost;
        monthlyMap[key]['Lợi nhuận'] += itemProfit;
      });

    return Object.values(monthlyMap).sort((a, b) => a.sortKey.localeCompare(b.sortKey));
  }, [subscriptions]);

  // Thống kê lợi nhuận theo từng loại Dịch vụ
  const serviceStats = useMemo(() => {
    const map = {};
    subscriptions.forEach(s => {
      if (s.status === 'canceled') return;
      
      const costMonths = Number(s.cost_months || 1);
      const soldMonths = Number(s.sold_months || 1);
      const itemCost = costMonths > 0 ? (Number(s.cost_price || 0) / costMonths) * soldMonths : 0;
      const profit = Number(s.sell_price || 0) - itemCost;

      if (!map[s.service_name]) {
        map[s.service_name] = { service_name: s.service_name, revenue: 0, profit: 0, count: 0 };
      }
      map[s.service_name].revenue += Number(s.sell_price || 0);
      map[s.service_name].profit += profit;
      map[s.service_name].count += 1;
    });

    return Object.values(map).sort((a, b) => b.profit - a.profit);
  }, [subscriptions]);

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

        // Lọc theo trạng thái
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

        return matchesSearch && matchesService && matchesStatus;
      })
      .sort((a, b) => {
        let fieldA = a[sortBy];
        let fieldB = b[sortBy];

        // Custom sort logic
        if (sortBy === 'profit') {
          const costMonthsA = Number(a.cost_months || 1);
          const soldMonthsA = Number(a.sold_months || 1);
          const itemCostA = costMonthsA > 0 ? (Number(a.cost_price || 0) / costMonthsA) * soldMonthsA : 0;
          fieldA = Number(a.sell_price || 0) - itemCostA;

          const costMonthsB = Number(b.cost_months || 1);
          const soldMonthsB = Number(b.sold_months || 1);
          const itemCostB = costMonthsB > 0 ? (Number(b.cost_price || 0) / costMonthsB) * soldMonthsB : 0;
          fieldB = Number(b.sell_price || 0) - itemCostB;
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
  }, [subscriptions, searchQuery, filterService, filterStatus, sortBy, sortOrder]);

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
        // Gia hạn thực chất là cập nhật lại ngày và trạng thái hoặc tạo mới.
        // Ở đây ta cập nhật lại bản ghi cũ với chu kỳ mới
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
    // Mặc định tăng thêm 30 ngày từ hôm nay (hoặc từ ngày hết hạn cũ nếu ngày cũ vẫn còn hạn)
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
      showToast(`Đồng bộ thành công! Đã tải lên ${res.servicesCount} dịch vụ & ${res.subsCount} đơn hàng.`);
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
            onClick={() => setActiveTab('dashboard')}
          >
            <Layers size={16} />
            <span>Thống Kê Doanh Thu</span>
          </button>
          <button 
            className={`tab-btn ${activeTab === 'subscriptions' ? 'active' : ''}`}
            onClick={() => setActiveTab('subscriptions')}
          >
            <Users size={16} />
            <span>Quản Lý Khách Hàng</span>
          </button>
          <button 
            className={`tab-btn ${activeTab === 'services' ? 'active' : ''}`}
            onClick={() => setActiveTab('services')}
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
                      <span className="stat-title">Tiền Vốn (Giá gốc)</span>
                      <div className="stat-icon-box">
                        <TrendingDown size={18} />
                      </div>
                    </div>
                    <div className="stat-value">{formatVND(metrics.totalCost)}</div>
                    <div className="stat-footer">Chi phí mua buôn từ nguồn</div>
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
                      Tỷ suất: <span className="stat-trend-up">{metrics.profitMargin.toFixed(1)}%</span>
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
                    <div className="stat-footer">Tài khoản trong hạn bảo hành</div>
                  </div>

                  <div className="stat-card warning">
                    <div className="stat-header">
                      <span className="stat-title">Sắp Hết Hạn (≤5 ngày)</span>
                      <div className="stat-icon-box">
                        <Clock size={18} />
                      </div>
                    </div>
                    <div className="stat-value">{metrics.expiringSoonCount}</div>
                    <div className="stat-footer">Cần báo gia hạn hoặc xử lý</div>
                  </div>
                </div>

                {/* Dashboard Details (Chart & Alerts) */}
                <div className="dashboard-details">
                  {/* Left: Financial Chart */}
                  <div className="chart-card">
                    <div className="card-title-section">
                      <h3>Doanh Thu & Lợi Nhuận Hàng Tháng</h3>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500 }}>
                        (Chỉ tính các đơn hoàn thành, bỏ qua đơn hủy)
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
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Chi tiết hiệu quả kinh doanh</span>
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
                            <div style={{ display: 'flex', justifyBetween: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontWeight: 700, fontSize: '14px', flex: 1 }}>#{idx+1} {item.service_name}</span>
                              <span className="badge active" style={{ fontSize: '10px' }}>{item.count} lượt bán</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-muted)' }}>
                              <span>Doanh thu: {formatVND(item.revenue)}</span>
                              <span style={{ fontWeight: 600, color: 'var(--success)' }}>Lãi: {formatVND(item.profit)}</span>
                            </div>
                            {/* Thanh phần trăm trực quan */}
                            <div style={{ height: '6px', backgroundColor: 'var(--bg-app)', borderRadius: '3px', overflow: 'hidden', marginTop: '4px' }}>
                              <div style={{ width: `${percentage}%`, height: '100%', backgroundColor: 'var(--primary)', borderRadius: '3px' }}></div>
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
                  <div className="filters-group">
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
                      {services.map(s => (
                        <option key={s.id} value={s.service_name}>{s.service_name}</option>
                      ))}
                    </select>

                    {/* Lọc theo trạng thái bảo hành */}
                    <select 
                      value={filterStatus} 
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="select-filter"
                    >
                      <option value="all">Tất cả trạng thái</option>
                      <option value="active">Đang hoạt động (trong hạn)</option>
                      <option value="expiring_soon">Sắp hết hạn (≤ 5 ngày)</option>
                      <option value="expired">Đã hết hạn bảo hành</option>
                      <option value="canceled">Đã hủy gói</option>
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
                      <option value="profit-desc">Lợi nhuận giảm dần</option>
                      <option value="profit-asc">Lợi nhuận tăng dần</option>
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
                            <th>Thanh Toán</th>
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
                            
                            // Cách tính vốn và lãi thực tế theo số tháng đã bán
                            const monthlyCost = costMonths > 0 ? (Number(sub.cost_price || 0) / costMonths) : 0;
                            const matchingCost = monthlyCost * soldMonths;
                            const profit = Number(sub.sell_price || 0) - matchingCost;
                            
                            // Thanh toán & công nợ
                            const amountPaid = Number(sub.amount_paid || 0);
                            const balance = Number(sub.sell_price || 0) - amountPaid;
                            
                            const serviceIcon = (services || []).find(s => s.service_name === sub.service_name)?.icon_name || 'box';
                            
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
                                          <strong className="text-danger" title="Khách trả trước nhiều tháng hơn gói gốc hiện tại (Bạn nợ khách tháng)">Thiếu {Math.abs(remainingMonths)} thg</strong>
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
                                    <div style={{ fontSize: '12px' }}>Gốc (Gói): <span className="price-text">{formatVND(sub.cost_price)}</span></div>
                                    <div style={{ fontSize: '12px' }}>Bán ra: <span className="price-text" style={{ fontWeight: 600 }}>{formatVND(sub.sell_price)}</span></div>
                                    <div style={{ fontSize: '12px', fontWeight: 500 }}>
                                      Lãi/Lỗ: <span className={`price-profit ${profit >= 0 ? 'plus' : 'minus'}`}>
                                        {profit >= 0 ? '+' : ''}{formatVND(profit)}
                                      </span>
                                    </div>
                                  </div>
                                </td>

                                {/* 6. Thanh Toán */}
                                <td>
                                  <div className="payment-cell">
                                    <div>Đã trả: <strong className="text-success">{formatVND(amountPaid)}</strong></div>
                                    {balance > 0 ? (
                                      <div style={{ fontSize: '11px', color: 'var(--danger)', marginTop: '2px' }}>
                                        Còn nợ: <strong>{formatVND(balance)}</strong>
                                      </div>
                                    ) : (
                                      <span className="badge success-badge" style={{ marginTop: '4px', display: 'inline-block', padding: '2px 6px', fontSize: '10px' }}>Đã thu đủ</span>
                                    )}
                                  </div>
                                </td>

                                {/* 7. Bảo Hành */}
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

                                {/* 8. Hành Động */}
                                <td>
                                  <div className="actions-cell">
                                    {/* Nút Gia Hạn Nhanh nếu hết hạn */}
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
                        Tổng lãi nhóm lọc: <strong style={{ color: 'var(--success)' }}>
                          {formatVND(processedSubscriptions.reduce((acc, sub) => {
                            if (sub.status === 'canceled') return acc;
                            const costMonths = Number(sub.cost_months || 1);
                            const soldMonths = Number(sub.sold_months || 1);
                            const itemCost = costMonths > 0 ? (Number(sub.cost_price || 0) / costMonths) * soldMonths : 0;
                            const itemProfit = Number(sub.sell_price || 0) - itemCost;
                            return acc + itemProfit;
                          }, 0))}
                        </strong>
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 3. TAB SERVICES (CẤU HÌNH GÓI DỊCH VỤ) */}
            {activeTab === 'services' && (
              <div>
                <div className="controls-bar">
                  <div>
                    <h2 style={{ fontSize: '18px', fontWeight: 700 }}>Danh Mục Gói Dịch Vụ Mẫu</h2>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                      Tạo các mẫu dịch vụ (ví dụ: CapCut, ChatGPT Plus) để tự động hóa việc tính giá gốc, giá bán khi thêm khách hàng.
                    </p>
                  </div>
                  <button 
                    className="btn btn-primary"
                    onClick={() => setServiceModal({ isOpen: true, mode: 'add', data: null })}
                  >
                    <Plus size={16} />
                    <span>Thêm Gói Mới</span>
                  </button>
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
                  <div className="services-list-grid">
                    {services.map(serv => {
                      const estimatedProfit = serv.default_sell_price - serv.default_cost_price;
                      return (
                        <div key={serv.id} className="service-config-card">
                          <div className="service-config-info">
                            <div className="service-icon-wrapper">
                              {getServiceIcon(serv.icon_name)}
                            </div>
                            <div className="service-config-detail">
                              <h4>{serv.service_name}</h4>
                              <p title="Giá gốc mua vào">Vốn: <strong>{formatVND(serv.default_cost_price)}</strong></p>
                              <p title="Giá bán ra cho khách hàng">Bán: <strong>{formatVND(serv.default_sell_price)}</strong></p>
                              <p style={{ color: 'var(--success)', fontWeight: 600 }}>Lãi ước tính: +{formatVND(estimatedProfit)}</p>
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
                )}
              </div>
            )}


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
    </div>
  );
}

// ==========================================
// COMPONENT FORM CHI TIẾT KHÁCH HÀNG (MODAL)
// ==========================================
function SubscriptionModalForm({ mode, data, services, onClose, onSave, formatVND }) {
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
    notes: ''
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
        notes: data.notes || ''
      });
    } else {
      // Mặc định chọn dịch vụ đầu tiên nếu có
      if (services.length > 0) {
        selectServiceTemplate(services[0].service_name);
      }
    }
  }, [data, services]);

  // Khi người dùng chọn dịch vụ mẫu: tự động điền giá vốn và giá bán
  const handleServiceChange = (e) => {
    const sName = e.target.value;
    selectServiceTemplate(sName);
  };

  const selectServiceTemplate = (serviceName) => {
    const template = services.find(s => s.service_name === serviceName);
    
    // Tự động tính end_date là +30 ngày kể từ start_date nếu chưa có end_date
    const stDate = formData.start_date ? new Date(formData.start_date) : new Date();
    const edDate = new Date();
    edDate.setDate(stDate.getDate() + 30);
    const calculatedEndDate = edDate.toISOString().split('T')[0];

    const defaultCost = template ? template.default_cost_price : 0;
    const defaultSell = template ? template.default_sell_price : 0;

    setFormData(prev => ({
      ...prev,
      service_name: serviceName,
      cost_price: defaultCost,
      cost_months: 1,
      sold_months: 1,
      sell_price: defaultSell,
      amount_paid: defaultSell,
      end_date: prev.end_date || calculatedEndDate
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
  const estimatedProfit = formData.sell_price - matchingCost;

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
          <div className="modal-body">
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
                  {services.map(s => (
                    <option key={s.id} value={s.service_name}>{s.service_name}</option>
                  ))}
                  {/* Tránh lỗi nếu dịch vụ bị xóa nhưng khách cũ vẫn dùng */}
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
                  placeholder="Mật khẩu của tài khoản bán"
                />
              </div>

              {/* Giá gốc mua vào */}
              <div className="form-group">
                <label className="form-label">Giá Gốc (Tổng Vốn Gói Gốc) (VND) *</label>
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

              {/* Ước tính lợi nhuận tức thời */}
              <div className="form-group" style={{ display: 'flex', justifyContent: 'center', flexDirection: 'column' }}>
                <span className="form-label" style={{ color: 'var(--text-muted)' }}>Lãi Thu Về Ước Tính:</span>
                <span style={{ fontSize: '16px', fontWeight: 800, color: estimatedProfit >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                  {formatVND(estimatedProfit)}
                </span>
              </div>

              {/* Ghi chú */}
              <div className="form-group full-width">
                <label className="form-label">Ghi Chú Đơn Hàng / Thông Tin Backup cookie / Profile khách dùng chung</label>
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
                  placeholder="Ví dụ: Profile số 3, khách dùng chung với A B C. Hoặc backup cookie đăng nhập..."
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
    icon_name: 'box',
    notes: ''
  });

  useEffect(() => {
    if (data) {
      setFormData({
        service_name: data.service_name || '',
        default_cost_price: data.default_cost_price || 0,
        default_sell_price: data.default_sell_price || 0,
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
              <label className="form-label">Biểu Tượng Đại Diện</label>
              <select 
                value={formData.icon_name}
                onChange={(e) => setFormData(prev => ({ ...prev, icon_name: e.target.value }))}
                className="form-input"
              >
                <option value="message-square">Hội thoại (Chatbot, ChatGPT, Claude...)</option>
                <option value="video">Phim / Video (CapCut Pro, Netflix...)</option>
                <option value="play">Xem / Nhạc (Youtube Premium, Spotify...)</option>
                <option value="globe">Trình duyệt / Cloud (Google One...)</option>
                <option value="zap">Sấm sét / Tốc độ (Grok AI...)</option>
                <option value="image">Hình ảnh / Thiết kế (Canva Pro, Midjourney...)</option>
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

export default App;
