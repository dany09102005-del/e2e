import React, { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js'
import { Line, Bar, Doughnut } from 'react-chartjs-2'
import { Routes, Route, useNavigate, useLocation, Navigate, Link } from 'react-router-dom'
import StudentProfileSidePanel from './StudentProfileSidePanel'
import './App.css'
import './index.css'

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, Filler, Tooltip, Legend
)

// ─────────── API CONFIGURATION ───────────
const API = 'http://localhost:5001'

// Create centralized axios instance
const apiClient = axios.create({
  baseURL: API
})

// Add token to requests
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle 401 Unauthorized globally
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear token and reload to show login page
      localStorage.removeItem('token')
      window.location.href = '/'
    }
    return Promise.reject(error)
  }
)


// ─────────── SVG ICONS ───────────
const Icons = {
  dashboard: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
    </svg>
  ),
  users: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  ),
  alert: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
  ),
  detect: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 3.75H6A2.25 2.25 0 003.75 6v1.5M16.5 3.75H18A2.25 2.25 0 0120.25 6v1.5m0 9V18A2.25 2.25 0 0118 20.25h-1.5m-9 0H6A2.25 2.25 0 013.75 18v-1.5M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  chart: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  ),
  settings: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  search: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
    </svg>
  ),
  bell: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
    </svg>
  ),
  shield: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </svg>
  ),
  logout: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
    </svg>
  ),
  sun: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
    </svg>
  ),
  moon: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
    </svg>
  ),
  brain: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-3.012 3.011m11.004-3.011a3 3 0 013.012 3.011M9 10a3 3 0 116 0m-6 0a3 3 0 006 0m-6 0V7a3 3 0 116 0v3m-6 0H9m6 0h.5M9 10v4.5m6-4.5V14.5m-6 0h6m-6 0a3 3 0 01-3 3m9-3a3 3 0 003 3" />
    </svg>
  ),
  plus: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  ),
  chevronLeft: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
    </svg>
  ),
  chevronRight: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
    </svg>
  ),
}

// ─────────── SPARKLINE COMPONENT ───────────
function Sparkline({ data, color = '#007AFF', width = 120, height = 32 }) {
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  const step = width / (data.length - 1)

  const points = data.map((v, i) => ({
    x: i * step,
    y: height - ((v - min) / range) * (height - 4) - 2,
  }))

  const pathD = points
    .map((p, i) => {
      if (i === 0) return `M ${p.x} ${p.y}`
      const prev = points[i - 1]
      const cpx1 = prev.x + step / 3
      const cpx2 = p.x - step / 3
      return `C ${cpx1} ${prev.y}, ${cpx2} ${p.y}, ${p.x} ${p.y}`
    })
    .join(' ')

  const areaD = pathD + ` L ${width} ${height} L 0 ${height} Z`

  return (
    <svg viewBox={`0 0 ${width} ${height}`} fill="none">
      <defs>
        <linearGradient id={`sparkGrad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#sparkGrad-${color.replace('#', '')})`} />
      <path d={pathD} stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

// ─────────── THEME TOGGLE ───────────
function ThemeToggle({ dark, onToggle }) {
  return (
    <button className={`theme-toggle${dark ? ' dark' : ''}`} onClick={onToggle} aria-label="Toggle theme">
      <div className="theme-toggle-knob">
        {dark
          ? <span className="moon-icon">{Icons.moon}</span>
          : <span className="sun-icon">{Icons.sun}</span>
        }
      </div>
    </button>
  )
}

// ─────────── LOGIN ───────────
function LoginPage({ onLogin }) {
  const [user, setUser] = useState('')
  const [pass, setPass] = useState('')
  const [err, setErr] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErr('')
    try {
      const res = await apiClient.post('/api/auth/login', { username: user, password: pass })
      onLogin(res.data.data.access_token)
    } catch {
      setErr('Invalid credentials')
    }
  }

  return (
    <div className="login-wrapper">
      <div className="login-card">
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: 'linear-gradient(135deg, #007AFF, #5856D6)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', marginBottom: 16, boxShadow: '0 4px 16px rgba(0,122,255,0.3)'
          }}>
            {Icons.shield}
          </div>
        </div>
        <h2>AttendGuard</h2>
        <p>Sign in to your account</p>
        {err && <p className="login-error">{err}</p>}
        <form onSubmit={handleSubmit}>
          <input placeholder="Username" value={user} onChange={e => setUser(e.target.value)} />
          <input placeholder="Password" type="password" value={pass} onChange={e => setPass(e.target.value)} />
          <button type="submit">Sign In</button>
        </form>
      </div>
    </div>
  )
}

// ─────────── SIDEBAR ───────────
function Sidebar({ isCollapsed, onLogout, onMouseEnter, onMouseLeave }) {
  const location = useLocation();
  const menu = [
    { id: 'dashboard', label: 'Dashboard', icon: Icons.dashboard, path: '/dashboard' },
    { id: 'students', label: 'Students', icon: Icons.users, path: '/students' },
    { id: 'detect', label: 'Detect', icon: Icons.detect, path: '/detect' },
    { id: 'violations', label: 'Violations', icon: Icons.alert, path: '/violations' },
    { id: 'reports', label: 'Reports', icon: Icons.chart, path: '/reports' },
    { id: 'settings', label: 'Settings', icon: Icons.settings, path: '/settings' },
  ]

  return (
    <aside
      className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >

      <div className="sidebar-brand">
        <div className="logo-icon">{Icons.brain}</div>
        <div className="brand-info">
          <h2>AttendGuard</h2>
          <span>Monitoring System</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {menu.map(item => (
          <Link
            key={item.id}
            to={item.path}
            className={`sidebar-item ${location.pathname === item.path ? 'active' : ''}`}
            title={isCollapsed ? item.label : ''}
          >
            {item.icon}
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button className="logout-btn" onClick={onLogout} title={isCollapsed ? 'Logout' : ''}>
          {Icons.logout}
          <span>Logout</span>
        </button>
      </div>
    </aside>
  )
}

// ─────────── HEADER ───────────
function Header({ dark, onToggleTheme, onAction }) {
  const location = useLocation();

  const getHeaderContent = (path) => {
    switch (path) {
      case '/dashboard':
        return { title: 'Dashboard', subtitle: "Welcome back. Here's your overview." };
      case '/students':
        return { title: 'Students', subtitle: 'Registered and monitored students.' };
      case '/detect':
        return { title: 'Detect', subtitle: 'Identify student violations.' };
      case '/violations':
        return { title: 'Violations', subtitle: 'Review recorded incidents and monitoring logs.' };
      case '/reports':
        return { title: 'Reports', subtitle: 'Generate monitoring reports.' };
      case '/settings':
        return { title: 'Settings', subtitle: 'Configure system preferences.' };
      default:
        return { title: 'Dashboard', subtitle: "Welcome back. Here's your overview." };
    }
  };

  const { title, subtitle } = getHeaderContent(location.pathname);

  return (
    <header className="header">
      <div className="header-left">
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      <div className="header-right">
        {location.pathname === '/students' && onAction && (
          <button className="btn-register-premium" onClick={onAction} style={{ padding: '8px 16px', fontSize: '13px', borderRadius: '12px' }}>
            {Icons.plus} Register
          </button>
        )}
        {onToggleTheme && <ThemeToggle dark={dark} onToggle={onToggleTheme} />}
        <button className="notification-btn">
          {Icons.bell}
          <span className="notification-dot"></span>
        </button>
        <div className="avatar">
          {Icons.users}
        </div>
      </div>
    </header>
  )
}

// ─────────── DASHBOARD ───────────
function Dashboard() {
  const [dashboardData, setDashboardData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Fetch dynamic KPIs
    apiClient.get('/api/dashboard/kpis')
      .then(res => {
        setDashboardData(res.data.data)
        setLoading(false)
      })
      .catch(err => {
        console.error("Error fetching dashboard kpis", err)
        setLoading(false)
      })
  }, [])

  if (loading) {
    return (
      <div className="page-content" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <div className="spinner" style={{ width: 40, height: 40, border: '4px solid var(--accent-blue)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
      </div>
    )
  }

  // Ensure safe fallback if API fails
  const safeData = dashboardData || {
    total_students: 0,
    total_violations: 0,
    today_activity: 0,
    monthly_chart: { labels: [], data: [] },
    most_active_location: { name: "N/A", count: 0 }
  }

  // KPI data
  const kpis = [
    {
      title: 'Students Monitored',
      value: safeData.total_students.toLocaleString(),
      subtext: 'Total registered profiles',
      icon: Icons.users
    },
    {
      title: 'Total Violations',
      value: safeData.total_violations.toLocaleString(),
      subtext: 'Accumulated record',
      icon: Icons.alert
    },
    {
      title: "Today's Activity",
      value: safeData.today_activity.toLocaleString(),
      subtext: 'Incidents today',
      icon: Icons.activity
    },
    {
      title: 'Most Active Location',
      value: safeData.most_active_location.name,
      subtext: `${safeData.most_active_location.count} total incidents`,
      icon: Icons.mapPin
    }
  ];

  // Line chart – Violations Trend
  const monthlyData = {
    labels: safeData.monthly_chart.labels,
    datasets: [{
      label: 'Monthly Violations',
      data: safeData.monthly_chart.data,
      fill: true,
      borderColor: '#007AFF',
      backgroundColor: 'rgba(0, 122, 255, 0.04)',
      tension: 0.4,
      pointRadius: 0,
      pointHoverRadius: 6,
      pointHoverBackgroundColor: '#007AFF',
      pointHoverBorderColor: '#fff',
      pointHoverBorderWidth: 3,
      borderWidth: 3
    }]
  };

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(255,255,255,0.9)',
        backdropFilter: 'blur(10px)',
        titleColor: '#1D1D1F',
        bodyColor: '#6E6E73',
        borderColor: '#E5E5EA',
        borderWidth: 1,
        cornerRadius: 16,
        padding: 16,
        titleFont: { family: 'Inter', size: 14, weight: '600' },
        bodyFont: { family: 'Inter', size: 13 },
        displayColors: false,
        usePointStyle: true,
        callbacks: {
          title: (items) => items[0].label,
          label: (item) => `${item.parsed.y} incidents`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        border: { display: false },
        ticks: {
          color: '#8E8E93', font: { family: 'Inter', size: 12 },
          padding: 12,
        },
      },
      y: {
        grid: { color: 'rgba(0, 0, 0, 0.03)', drawBorder: false },
        border: { display: false },
        ticks: {
          color: '#8E8E93', font: { family: 'Inter', size: 11, weight: '500' },
          padding: 12, maxTicksLimit: 4,
          callback: (v) => v === 0 ? '' : v
        },
      },
    },
  }

  // Bar chart – Violations by Department
  const barData = {
    labels: ['CSE', 'ECE', 'MECH', 'CIVIL', 'EEE', 'IT'],
    datasets: [{
      label: 'Violations',
      data: [42, 28, 35, 18, 24, 31],
      backgroundColor: [
        'rgba(10, 132, 255, 0.3)', // CSE - Light Blue
        'rgba(175, 82, 222, 0.3)', // ECE - Light Purple
        'rgba(255, 149, 0, 0.3)',  // MECH - Light Orange
        'rgba(52, 199, 89, 0.3)',  // CIVIL - Light Green
        'rgba(255, 59, 48, 0.3)',  // EEE - Light Red
        'rgba(88, 86, 214, 0.3)',  // IT - Indigo
      ],
      hoverBackgroundColor: [
        'rgba(10, 132, 255, 0.5)',
        'rgba(175, 82, 222, 0.5)',
        'rgba(255, 149, 0, 0.5)',
        'rgba(52, 199, 89, 0.5)',
        'rgba(255, 59, 48, 0.5)',
        'rgba(88, 86, 214, 0.5)',
      ],
      borderRadius: 12,
      borderSkipped: false,
      barPercentage: 0.5,
      categoryPercentage: 0.6,
    }],
  }

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(255,255,255,0.9)',
        backdropFilter: 'blur(10px)',
        titleColor: '#1D1D1F',
        bodyColor: '#6E6E73',
        borderColor: '#E5E5EA',
        borderWidth: 1,
        cornerRadius: 16,
        padding: 16,
        titleFont: { family: 'Inter', size: 14, weight: '600' },
        bodyFont: { family: 'Inter', size: 13 },
        displayColors: false,
      },
    },
    scales: {
      x: {
        grid: { display: false },
        border: { display: false },
        ticks: {
          color: '#8E8E93', font: { family: 'Inter', size: 12 },
          padding: 12,
        },
      },
      y: {
        grid: { display: false },
        border: { display: false },
        ticks: { display: false },
      },
    },
  }

  // Donut chart – Violation Types
  const donutData = {
    labels: ['Late Arrival', 'Dress Code', 'Bunk'],
    datasets: [{
      data: [38, 20, 17],
      backgroundColor: [
        '#0A84FF',
        '#AF52DE',
        '#FF453A',
      ],
      borderWidth: 0,
      spacing: 6,
      borderRadius: 10,
    }],
  }

  const donutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '85%',
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(255,255,255,0.9)',
        backdropFilter: 'blur(10px)',
        titleColor: '#1D1D1F',
        bodyColor: '#6E6E73',
        borderColor: '#E5E5EA',
        borderWidth: 1,
        cornerRadius: 16,
        padding: 16,
        titleFont: { family: 'Inter', size: 14, weight: '600' },
        bodyFont: { family: 'Inter', size: 13 },
      },
    },
  }

  const donutLegend = [
    { label: 'Late Arrival', color: '#0A84FF' },
    { label: 'Dress Code', color: '#AF52DE' },
    { label: 'Bunk', color: '#FF453A' },
  ]

  // Recent Activity
  const activities = [
    { dot: 'red', text: <><strong>John Doe</strong> received 3rd dress code violation</>, time: '2 min ago', badge: 'critical', badgeLabel: 'Critical' },
    { dot: 'orange', text: <><strong>Jane Smith</strong> marked late for Engineering Math</>, time: '15 min ago', badge: 'warning', badgeLabel: 'Warning' },
    { dot: 'blue', text: <><strong>Prof. Kumar</strong> submitted attendance for CSE-A</>, time: '32 min ago', badge: 'info', badgeLabel: 'Info' },
    { dot: 'green', text: <><strong>Mike Chen</strong> violation resolved after counseling</>, time: '1 hr ago', badge: 'resolved', badgeLabel: 'Resolved' },
    { dot: 'orange', text: <><strong>Sarah Lee</strong> absent from 3 consecutive classes</>, time: '2 hrs ago', badge: 'warning', badgeLabel: 'Warning' },
    { dot: 'red', text: <><strong>Alex Park</strong> flagged as high-risk student</>, time: '3 hrs ago', badge: 'critical', badgeLabel: 'Critical' },
  ]

  return (
    <>
      {/* Row 1: KPI Cards */}
      <div className="kpi-grid-new">
        {kpis.map((kpi, i) => (
          <div className="kpi-card-new" key={i}>
            <div className="kpi-icon-new-small">{kpi.icon}</div>
            <div className="kpi-card-inner">
              <div className="kpi-value-new">{kpi.value}</div>
              <div className="kpi-title-new">{kpi.title}</div>
              <div className="kpi-subtext-new">{kpi.subtext}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Row 2: Violations Trend Chart */}
      <div className="chart-row">
        <div className="chart-card">
          <div className="chart-card-header">
            <h3>Violations Trend</h3>
            <span>Monthly View</span>
          </div>
          <div className="chart-wrapper">
            <Line data={monthlyData} options={lineOptions} />
          </div>
        </div>
      </div>

      {/* Row 3: Violations by Department & Violation Types */}
      <div className="charts-grid">
        <div className="chart-card">
          <div className="chart-card-header">
            <h3>By Department</h3>
            <span>This Semester</span>
          </div>
          <div className="chart-wrapper">
            <Bar data={barData} options={barOptions} />
          </div>
        </div>

        <div className="bottom-card">
          <div className="bottom-card-header">
            <h3>Violation Types</h3>
            <a>View All</a>
          </div>
          <div className="donut-wrapper">
            <Doughnut data={donutData} options={donutOptions} />
            <div className="donut-center">
              <div className="donut-number">100</div>
              <div className="donut-label">Total</div>
            </div>
          </div>
          <div className="donut-legend">
            {donutLegend.map((item, i) => (
              <div className="donut-legend-item" key={i}>
                <div className="donut-legend-dot" style={{ background: item.color }}></div>
                {item.label}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 4: Recent Activity */}
      <div className="chart-row">
        <div className="bottom-card">
          <div className="bottom-card-header">
            <h3>Recent Activity</h3>
            <a>View All</a>
          </div>
          <div className="activity-list">
            {activities.map((act, i) => (
              <div className="activity-item" key={i}>
                <div className={`activity-dot ${act.dot}`}></div>
                <div className="activity-content">
                  <div className="activity-text">{act.text}</div>
                  <div className="activity-time">{act.time}</div>
                </div>
                <span className={`activity-badge ${act.badge}`}>{act.badgeLabel}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}

// ─────────── STUDENTS PAGE ───────────
function StudentsPage({ students, token, onRefresh, onStudentClick, showRegisterModal, setShowRegisterModal }) {
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [filter, setFilter] = useState({
    program: 'B.Tech',
    batch: '2021-25',
    dept: 'CSE',
    sem: '6',
    section: 'A'
  })
  const [isApplied, setIsApplied] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [regForm, setRegForm] = useState({
    name: '', roll_no: '', dept: 'CSE', section: 'A', year: '3rd Year', phone: '', email: '', threshold: '75', imagePreview: null, imageFile: null
  })
  const [dragging, setDragging] = useState(false)

  // Sophisticated Mock Data for Illustration
  const mockDetails = {
    'B.Tech': ['2020-24', '2021-25', '2022-26', '2023-27'],
    'CSE': ['A', 'B', 'C', 'D'],
    'Violations': [
      { date: 'Oct 12, 2023', type: 'Late Entry', remark: 'Arrived 15 mins after session start.' },
      { date: 'Sep 28, 2023', type: 'Bunk', remark: 'Left campus during 3rd period without exit pass.' },
      { date: 'Sep 05, 2023', type: 'Dress Code', remark: 'Wearing informal footwear in lab.' },
    ]
  }

  // Filter students by active dropdown selections
  const filteredStudents = students.filter(s => {
    const roll = (s.roll_no || '').toUpperCase()

    // Program Filter: B.Tech must have 'BQ' in roll number
    const matchesProgram = !filter.program || filter.program !== 'B.Tech' || roll.includes('BQ')

    // Batch Filter Logic
    let matchesBatch = true
    if (filter.batch) {
      if (filter.batch === '2023-27') {
        matchesBatch = roll.startsWith('23') || roll.startsWith('24BQ5A')
      } else if (filter.batch === '2022-26') {
        matchesBatch = roll.startsWith('22') || roll.startsWith('23BQ5A')
      } else if (filter.batch === '2021-25') {
        matchesBatch = roll.startsWith('21') || roll.startsWith('22BQ5A')
      } else if (filter.batch === '2020-24') {
        matchesBatch = roll.startsWith('20') || roll.startsWith('21BQ5A')
      }
    }

    const matchesDept = !filter.dept || (s.department || '').toUpperCase() === filter.dept.toUpperCase()
    const matchesSection = !filter.section || (s.section || '').toUpperCase() === filter.section.toUpperCase()

    return matchesProgram && matchesBatch && matchesDept && matchesSection
  })

  // Derived stats for summary
  const totalLate = filteredStudents.reduce((sum, s) => sum + (s.late_count || 0), 0)
  const totalDress = filteredStudents.reduce((sum, s) => sum + (s.dress_code_count || 0), 0)
  const totalBunk = filteredStudents.reduce((sum, s) => sum + (s.bunk_count || 0), 0)

  const summaryStats = [
    { label: 'Total Students', value: filteredStudents.length || '0', icon: '👥', color: 'blue' },
    { label: 'Late Arrivals', value: totalLate.toString().padStart(2, '0'), icon: '⏰', color: 'orange' },
    { label: 'Dress Code', value: totalDress.toString().padStart(2, '0'), icon: '👔', color: 'purple' },
    { label: 'Bunk', value: totalBunk.toString().padStart(2, '0'), icon: '🏃', color: 'red' },
  ]

  const getStatus = (count) => {
    if (count > 5) return { label: 'High Risk', class: 'status-p-high' }
    if (count > 2) return { label: 'Monitor', class: 'status-p-monitor' }
    return { label: 'Clean', class: 'status-p-clean' }
  }

  return (
    <div className="page-content">
      <div className="students-container">
        {/* Filter Bar */}
        <div className="filter-bar">
          <div className="filter-group">
            <span className="filter-label">Program</span>
            <select className="filter-input" value={filter.program} onChange={e => setFilter({ ...filter, program: e.target.value })}>
              <option>B.Tech</option><option>BBA</option><option>MBA</option><option>M.Tech</option>
            </select>
          </div>
          <div className="filter-group">
            <span className="filter-label">Batch</span>
            <select className="filter-input" value={filter.batch} onChange={e => setFilter({ ...filter, batch: e.target.value })}>
              {mockDetails['B.Tech'].map(b => <option key={b}>{b}</option>)}
            </select>
          </div>
          <div className="filter-group">
            <span className="filter-label">Department</span>
            <select className="filter-input" value={filter.dept} onChange={e => setFilter({ ...filter, dept: e.target.value })}>
              <option>CSE</option><option>ECE</option><option>EEE</option><option>MECH</option><option>CIVIL</option>
            </select>
          </div>
          <div className="filter-group">
            <span className="filter-label">Semester</span>
            <select className="filter-input" value={filter.sem} onChange={e => setFilter({ ...filter, sem: e.target.value })}>
              {[1, 2, 3, 4, 5, 6, 7, 8].map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="filter-group">
            <span className="filter-label">Section</span>
            <select className="filter-input" value={filter.section} onChange={e => setFilter({ ...filter, section: e.target.value })}>
              {mockDetails['CSE'].map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <button className="btn-primary" onClick={() => setIsApplied(true)}>
            Fetch Records
          </button>
        </div>

        {!isApplied ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '100px 20px', textAlign: 'center', background: 'var(--surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
            <h3 style={{ marginBottom: 8 }}>Select Student Parameters</h3>
            <p style={{ color: 'var(--text-secondary)', maxWidth: 400 }}>Choose the program, department, and semester to view the active monitoring list.</p>
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="student-summary-grid">
              {summaryStats.map((stat, i) => (
                <div className="summary-stat-card" key={i}>
                  <div className={`summary-stat-icon ${stat.color}-soft`}>{stat.icon}</div>
                  <div className="summary-stat-info">
                    <h4>{stat.label}</h4>
                    <div className="stat-value">{stat.value}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Student Table */}
            <div className="student-table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: 60 }}>Photo</th>
                    <th>Roll Number</th>
                    <th>Name</th>
                    <th>Section</th>
                    <th style={{ textAlign: 'center' }}>Violations</th>
                    <th>Status</th>
                    <th style={{ width: 80, textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((s, i) => {
                    const actualViolations = s.violations_count || 0
                    const status = getStatus(actualViolations)
                    return (
                      <tr key={i} onClick={() => onStudentClick && onStudentClick(s)}>
                        <td>
                          <img
                            className="profile-img-small"
                            src={`${API}/api/students/${s.roll_no}/image`}
                            onError={(e) => { e.target.src = `https://ui-avatars.com/api/?name=${s.name}&background=random` }}
                            alt="avatar"
                          />
                        </td>
                        <td style={{ fontWeight: 600 }}>{s.roll_no}</td>
                        <td>{s.name}</td>
                        <td>{s.section || 'A'}</td>
                        <td style={{ textAlign: 'center', fontWeight: 600 }}>{actualViolations}</td>
                        <td><span className={`status-pill ${status.class}`}>{status.label}</span></td>
                        <td style={{ textAlign: 'center' }}>
                          <button className="icon-btn">{Icons.shield}</button>
                        </td>
                      </tr>
                    )
                  })}
                  {students.length === 0 && (
                    <tr><td colSpan={7} style={{ textAlign: 'center', padding: 100, color: 'var(--text-tertiary)' }}>No students found in this selection</td></tr>
                  )}
                </tbody>
              </table>
              <div className="pagination">
                <button className="pagination-btn" disabled>Previous</button>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Page 1 of 1</span>
                <button className="pagination-btn" disabled>Next</button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Register Student Modal */}
      {showRegisterModal && (
        <div className="modal-overlay" onClick={() => setShowRegisterModal(false)}>
          <div className="modal-content registration-modal" onClick={e => e.stopPropagation()} style={{ display: 'block' }}>
            <div className="modal-header" style={{ marginBottom: 24 }}>
              <h2>Register New Student</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Enter student credentials to add them to the monitoring system.</p>
            </div>

            <form className="registration-form" onSubmit={async (e) => {
              e.preventDefault()

              if (!regForm.imageFile) {
                alert('Please upload a student photo first')
                return
              }

              const fd = new FormData();
              fd.append('name', regForm.name);
              fd.append('roll_no', regForm.roll_no);
              fd.append('department', regForm.dept);
              fd.append('section', regForm.section);
              fd.append('year', regForm.year);
              fd.append('phone', regForm.phone);
              fd.append('email', regForm.email);
              fd.append('threshold', regForm.threshold);
              fd.append('image', regForm.imageFile);

              try {
                await apiClient.post('/api/students/', fd);
                alert('Student registration submitted for ' + regForm.name)
                setShowRegisterModal(false)
                if (onRefresh) onRefresh()
              } catch (err) {
                alert('Registration failed: ' + (err.response?.data?.error || err.message))
              }
            }}>
              {/* Image Upload */}
              <div
                className={`upload-zone ${dragging ? 'dragging' : ''}`}
                onDragOver={e => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={e => {
                  e.preventDefault()
                  setDragging(false)
                  const file = e.dataTransfer.files[0]
                  if (file) setRegForm({ ...regForm, imagePreview: URL.createObjectURL(file), imageFile: file })
                }}
                onClick={() => document.getElementById('file-input').click()}
              >
                <input
                  id="file-input"
                  type="file"
                  hidden
                  onChange={e => {
                    const file = e.target.files[0]
                    if (file) setRegForm({ ...regForm, imagePreview: URL.createObjectURL(file), imageFile: file })
                  }}
                />
                {regForm.imagePreview ? (
                  <img src={regForm.imagePreview} className="upload-preview" alt="preview" />
                ) : (
                  <div className="upload-placeholder">
                    {Icons.detect}
                    <span>Drag & drop or Click to upload profile photo</span>
                  </div>
                )}
              </div>

              <div className="form-grid">
                <div className="filter-group">
                  <span className="filter-label">Full Name</span>
                  <input className="filter-input" placeholder="e.g. John Doe" value={regForm.name} onChange={e => setRegForm({ ...regForm, name: e.target.value })} required />
                </div>
                <div className="filter-group">
                  <span className="filter-label">Roll Number</span>
                  <input className="filter-input" placeholder="e.g. 21CS042" value={regForm.roll_no} onChange={e => setRegForm({ ...regForm, roll_no: e.target.value })} required />
                </div>
                <div className="filter-group">
                  <span className="filter-label">Department</span>
                  <select className="filter-input" value={regForm.dept} onChange={e => setRegForm({ ...regForm, dept: e.target.value })}>
                    <option>CSE</option><option>ECE</option><option>EEE</option><option>MECH</option><option>CIVIL</option>
                  </select>
                </div>
                <div className="filter-group">
                  <span className="filter-label">Section</span>
                  <select className="filter-input" value={regForm.section} onChange={e => setRegForm({ ...regForm, section: e.target.value })}>
                    <option>A</option><option>B</option><option>C</option><option>D</option>
                  </select>
                </div>
                <div className="filter-group">
                  <span className="filter-label">Year</span>
                  <select className="filter-input" value={regForm.year} onChange={e => setRegForm({ ...regForm, year: e.target.value })}>
                    <option>1st Year</option><option>2nd Year</option><option>3rd Year</option><option>4th Year</option>
                  </select>
                </div>
                <div className="filter-group">
                  <span className="filter-label">Phone Number</span>
                  <input className="filter-input" placeholder="+91 98765 43210" value={regForm.phone} onChange={e => setRegForm({ ...regForm, phone: e.target.value })} required />
                </div>
                <div className="filter-group">
                  <span className="filter-label">Email Address</span>
                  <input className="filter-input" type="email" placeholder="john@college.edu" value={regForm.email} onChange={e => setRegForm({ ...regForm, email: e.target.value })} required />
                </div>
                <div className="filter-group" style={{ gridColumn: 'span 2' }}>
                  <span className="filter-label">Attendance Alert Threshold (%)</span>
                  <input className="filter-input" type="range" min="50" max="100" value={regForm.threshold} onChange={e => setRegForm({ ...regForm, threshold: e.target.value })} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4 }}>
                    <span>50%</span>
                    <span style={{ color: 'var(--accent-blue)', fontWeight: 600 }}>Current: {regForm.threshold}%</span>
                    <span>100%</span>
                  </div>
                </div>
              </div>

              <div className="form-actions">
                <button type="button" className="btn-premium btn-secondary" onClick={() => setShowRegisterModal(false)}>Cancel</button>
                <button type="submit" className="btn-premium btn-primary">Save Student</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Profile Modal */}
      {selectedStudent && (
        <div className="modal-overlay" onClick={() => setSelectedStudent(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-sidebar">
              <img
                className="modal-profile-img"
                src={`${API}/api/students/${selectedStudent.roll_no}/image`}
                onError={(e) => { e.target.src = `https://ui-avatars.com/api/?name=${selectedStudent.name}&background=random` }}
                alt="profile"
              />
              <span className={`status-pill ${getStatus(selectedStudent.violation_count || 0).class}`}>{getStatus(selectedStudent.violation_count || 0).label}</span>
            </div>
            <div className="modal-main">
              <div className="modal-header">
                <h2>{selectedStudent.name}</h2>
                <div style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>ID: {selectedStudent.roll_no}</div>
              </div>

              <div className="modal-info-grid">
                <div className="modal-info-item">
                  <label>Program</label>
                  <span>{filter.program}</span>
                </div>
                <div className="modal-info-item">
                  <label>Department</label>
                  <span>{selectedStudent.department || filter.dept}</span>
                </div>
                <div className="modal-info-item">
                  <label>Batch</label>
                  <span>{filter.batch}</span>
                </div>
                <div className="modal-info-item">
                  <label>Semester / Section</label>
                  <span>Sem {filter.sem} · Sec {filter.section}</span>
                </div>
              </div>

              <div className="modal-tabs">
                <button className={`modal-tab ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>Overview</button>
                <button className={`modal-tab ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>Violation History</button>
                <button className={`modal-tab ${activeTab === 'remarks' ? 'active' : ''}`} onClick={() => setActiveTab('remarks')}>Remarks</button>
              </div>

              <div className="modal-body">
                {activeTab === 'overview' && (
                  <div style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6 }}>
                    This student has a consistent attendance record in the current semester.
                    Recent patterns show {selectedStudent.violation_count || 0} alerts related to disciplinary policies.
                  </div>
                )}
                {activeTab === 'history' && (
                  <div className="timeline">
                    {mockDetails.Violations.map((v, i) => (
                      <div className="timeline-item" key={i}>
                        <div className="timeline-date">{v.date}</div>
                        <div className="timeline-content">
                          <strong style={{ color: 'var(--accent-red)' }}>{v.type}</strong>: {v.remark}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {activeTab === 'remarks' && (
                  <textarea
                    className="filter-input"
                    placeholder="Enter counselor remarks here..."
                    style={{ width: '100%', height: 120, resize: 'none' }}
                  ></textarea>
                )}
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 'auto' }}>
                <button className="btn-premium btn-primary" style={{ flex: 1 }}>Issue Warning</button>
                <button className="btn-premium btn-secondary" onClick={() => setSelectedStudent(null)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────── DETECT PAGE ───────────
function DetectPage({ onDetect }) {
  const [location, setLocation] = useState('Central Block')
  const [period, setPeriod] = useState('1st Hour')
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [dragging, setDragging] = useState(false)
  const fileInputRef = useRef(null)

  const blockOptions = [
    'A Block', 'B Block', 'C Block', 'D Block',
    'U Block', 'Central Block', 'Playground'
  ];

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0]
    if (selectedFile) {
      setFile(selectedFile)
      setPreview(URL.createObjectURL(selectedFile))
      setResult(null)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) {
      setFile(droppedFile)
      setPreview(URL.createObjectURL(droppedFile))
      setResult(null)
    }
  }

  const handleSubmit = async (e) => {
    if (e) e.preventDefault()
    if (!file) return alert('Please upload an image first')
    setLoading(true)
    setResult(null)
    try {
      const fd = new FormData()
      fd.append('image', file)
      fd.append('location', location)
      fd.append('period', period)
      const res = await apiClient.post('/api/detection/match', fd)
      setResult(res.data)
    } catch {
      // Mock result for demonstration if API fails
      setResult({
        absentees: ['Roll 102', 'Roll 105', 'Roll 118'],
        detected_count: 42,
        violation_count: 3,
        types: ['Late Entrance', 'Dress Code']
      })
    }
    setLoading(false)
  }

  const handleConfirm = async () => {
    if (!result) return
    try {
      await apiClient.post('/api/violations/', result)
      alert('Violation confirmed!')
      setResult(null)
      if (onDetect) onDetect()
    } catch {
      alert('Confirmation error')
    }
  }

  return (
    <div className="page-content">
      <div className="detect-grid">
        {/* LEFT COLUMN: CONTROLS */}
        <div className="detect-card">
          <div className="detect-select-group">
            <span className="detect-select-label">Location</span>
            <select value={location} onChange={e => setLocation(e.target.value)} className="filter-input">
              {blockOptions.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>

          <div className="detect-select-group">
            <span className="detect-select-label">Session</span>
            <select value={period} onChange={e => setPeriod(e.target.value)} className="filter-input">
              <option>1st Hour</option>
              <option>2nd Hour</option>
              <option>3rd Hour</option>
              <option>4th Hour</option>
              <option>Afternoon Session</option>
            </select>
          </div>

          <div
            className={`upload-zone-detect ${dragging ? 'dragging' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              style={{ display: 'none' }}
            />
            <div className="upload-icon-wrapper">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
            </div>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Upload image</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Drag & drop or click to browse</div>
            {file && (
              <div style={{ marginTop: 12, fontSize: 12, color: 'var(--accent-blue)', fontWeight: 500 }}>
                ✓ {file.name}
              </div>
            )}
          </div>

          <button
            className="btn-premium btn-primary"
            style={{ width: '100%', padding: '16px', justifyContent: 'center' }}
            disabled={!file || loading}
            onClick={handleSubmit}
          >
            {loading ? (
              <>
                <div className="spinner" style={{ width: 18, height: 18, border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', marginRight: 10 }}></div>
                Analyzing...
              </>
            ) : 'Analyze Image'}
          </button>
        </div>

        {/* RIGHT COLUMN: PREVIEW & RESULTS */}
        <div className="detection-display">
          {!preview ? (
            <div className="empty-state-detect">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
              </svg>
              <h3>No image uploaded yet</h3>
              <p style={{ color: 'var(--text-tertiary)', maxWidth: 280, fontSize: 14 }}>
                Upload photo to begin automated violation detection.
              </p>
            </div>
          ) : (
            <div className="detection-results-panel">
              <div className="preview-container-detect">
                <img src={preview} alt="Classroom Preview" />
              </div>

              {result && (
                <div className="detect-card" style={{ animation: 'fadeInUp 0.6s ease-out' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontSize: 18 }}>Detection Summary</h3>
                    <span className="violation-pill" style={{ background: 'var(--accent-green-soft)', color: 'var(--accent-green)' }}>
                      Completed
                    </span>
                  </div>

                  <div className="detection-summary-grid">
                    <div className="summary-stat-item">
                      <span className="label">Students Detected</span>
                      <span className="value">{result.detected_count || '0'}</span>
                    </div>
                    <div className="summary-stat-item">
                      <span className="label">Violations Found</span>
                      <span className="value" style={{ color: 'var(--accent-red)' }}>{result.violation_count || '0'}</span>
                    </div>
                  </div>

                  <div>
                    <span className="detect-select-label" style={{ display: 'block', marginBottom: 12 }}>Violation Types</span>
                    <div className="violation-tag-list">
                      {result.types?.map((t, i) => (
                        <span key={i} className="violation-tag active">{t}</span>
                      )) || <span className="violation-tag">None</span>}
                    </div>
                  </div>

                  <div style={{ marginTop: 8, padding: 16, background: 'var(--bg)', borderRadius: 12 }}>
                    <span className="label" style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500, display: 'block', marginBottom: 8 }}>Identified Absentees</span>
                    <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                      {result.absentees?.join(', ') || 'No absentees detected'}
                    </p>
                  </div>

                  <button className="btn-premium btn-primary" onClick={handleConfirm} style={{ marginTop: 8 }}>
                    Confirm & Record Violations
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─────────── VIOLATIONS PAGE ───────────
function ViolationsPage({ violations }) {
  const [filterType, setFilterType] = useState('All');
  const [filterLocation, setFilterLocation] = useState('All');
  const [filterDate, setFilterDate] = useState('');

  const locationMap = {
    'A Block': 'a-block',
    'B Block': 'b-block',
    'C Block': 'c-block',
    'D Block': 'd-block',
    'Central Block': 'central',
    'U Block': 'u-block',
    'N Block': 'n-block',
    'Playground': 'playground'
  };

  const locations = ['All', ...Object.keys(locationMap)];
  const types = ['All', 'Late Entry', 'Dress Code', 'Bunk', 'Discipline'];

  const filteredViolations = violations.filter(v => {
    const matchesType = filterType === 'All' || v.type === filterType;
    const matchesLocation = filterLocation === 'All' || v.location === filterLocation;
    const matchesDate = !filterDate || v.date?.includes(filterDate);
    return matchesType && matchesLocation && matchesDate;
  });

  // Calculate stats
  const today = new Date().toISOString().split('T')[0];
  const thisMonth = new Date().toISOString().slice(0, 7);

  const stats = [
    { label: 'Total Violations', value: violations.length },
    { label: 'Today', value: violations.filter(v => v.date?.includes(today)).length || 3 },
    { label: 'This Month', value: violations.filter(v => v.date?.includes(thisMonth)).length || 12 }
  ];

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    // Explicitly format to ensure "Feb 3, 2026" style
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  };

  return (
    <div className="page-content" style={{ animation: 'fadeIn 0.6s ease-out' }}>

      {/* Summary Section */}
      <div className="violation-summary-grid">
        {stats.map((s, i) => (
          <div key={i} className="premium-card summary-mini-card">
            <span className="label">{s.label}</span>
            <span className="value">{s.value}</span>
          </div>
        ))}
      </div>

      {/* Compact Filter Bar */}
      <div className="compact-filter-bar">
        <div className="date-picker">
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
          <input
            type="date"
            value={filterDate}
            onChange={e => setFilterDate(e.target.value)}
            className="date-input-clean"
          />
          <span className="date-placeholder">
            {filterDate ? formatDate(filterDate) : 'Date'}
          </span>
        </div>

        <select
          className="filter-input"
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
        >
          <option value="All">Types</option>
          {types.filter(t => t !== 'All').map(t => <option key={t} value={t}>{t}</option>)}
        </select>

        <select
          className="filter-input"
          value={filterLocation}
          onChange={e => setFilterLocation(e.target.value)}
        >
          <option value="All">Locations</option>
          {locations.filter(l => l !== 'All').map(l => <option key={l} value={l}>{l}</option>)}
        </select>

        <button
          className="btn-premium-reset"
          onClick={() => { setFilterType('All'); setFilterLocation('All'); setFilterDate(''); }}
        >
          Reset Filters
        </button>
      </div>

      {/* Table Section */}
      <div className="premium-card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: 60 }}>Photo</th>
              <th>Roll Number</th>
              <th>Student Name</th>
              <th>Violation</th>
              <th>Location</th>
              <th>Date & Time</th>
              <th>Status</th>
              <th style={{ width: 60, textAlign: 'center' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredViolations.map((v, i) => (
              <tr key={i}>
                <td>
                  <img
                    className="profile-img-small"
                    src={`${API}/api/students/${v.roll_no || v.student_id}/image`}
                    onError={(e) => { e.target.src = `https://ui-avatars.com/api/?name=${v.roll_no || 'Unknown'}&background=random` }}
                    alt="avatar"
                  />
                </td>
                <td style={{ fontWeight: 600 }}>{v.roll_no}</td>
                <td style={{ fontWeight: 500 }}>{v.student_name}</td>
                <td>
                  <span className="violation-tag active" style={{ fontSize: 11 }}>{v.type}</span>
                </td>
                <td>
                  <span className={`location-tag ${locationMap[v.location] || 'central'}`}>
                    {v.location || 'Central Block'}
                  </span>
                </td>
                <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                  {v.date}
                </td>
                <td>
                  <span className={`status-pill ${v.resolved ? 'status-p-clean' : 'status-p-high'}`}>
                    {v.resolved ? 'Resolved' : 'Pending'}
                  </span>
                </td>
                <td style={{ textAlign: 'center' }}>
                  <button className="icon-btn" title="View Details">{Icons.dashboard}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredViolations.length === 0 && (
          <div className="empty-state-v2">
            <div className="empty-state-icon">🛡️</div>
            <h3 className="empty-state-title">No Violations Recorded</h3>
            <p className="empty-state-subtitle">Try adjusting filters or check back later.</p>
            <button
              className="btn-premium btn-primary empty-state-btn"
              onClick={() => { setFilterType('All'); setFilterLocation('All'); setFilterDate(''); }}
            >
              Clear Filters
            </button>
          </div>
        )}

        <div className="pagination" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          <button className="pagination-btn" disabled>Previous</button>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Page 1 of 1</span>
          <button className="pagination-btn" disabled>Next</button>
        </div>
      </div>
    </div>
  )
}

// ─────────── REPORTS PAGE (SaaS ANALYTICS) ───────────
// ─────────── EVENT-DRIVEN REPORTS PAGE (v5.3) ───────────
function ReportsPage({ violations }) {
  const [reportType, setReportType] = useState('By Violation Type');
  const [dateRange, setDateRange] = useState('Last 30 Days');
  const [isGenerated, setIsGenerated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState(null);

  // Fixed Location Color Mapping
  const COLORS = {
    // Violation Types
    'Late Arrival': '#0A84FF', 'Dress Code': '#BF5AF2', 'Bunk': '#FF453A', 'Other': '#30D158', 'Late Entry': '#0A84FF',
    // Locations (Strict Hex Mapping)
    'A Block': '#3B82F6',
    'B Block': '#8B5CF6',
    'C Block': '#10B981',
    'D Block': '#F59E0B',
    'U Block': '#EF4444',
    'Central Block': '#EAB308',
    'Playground': '#06B6D4'
  };

  const handleGenerate = () => {
    setIsLoading(true);
    setIsGenerated(false);
    setTimeout(() => {
      setIsLoading(false);
      setIsGenerated(true);
    }, 1200);
  };

  const processed = React.useMemo(() => {
    if (!isGenerated) return null;

    const isLocationReport = reportType === 'By Location';
    const groupKey = isLocationReport ? 'location' : 'type';
    const filtered = violations;

    // Normalization Mapping
    const normalize = (val) => {
      if (!val) return 'Other';
      const v = val.trim();
      if (/^A($|\s|Block)/i.test(v)) return 'A Block';
      if (/^B($|\s|Block)/i.test(v)) return 'B Block';
      if (/^C($|\s|Block)/i.test(v)) return 'C Block';
      if (/^D($|\s|Block)/i.test(v)) return 'D Block';
      if (/^U($|\s|Block)/i.test(v)) return 'U Block';
      if (/Central|Main/i.test(v)) return 'Central Block';
      if (/Play|Ground/i.test(v)) return 'Playground';
      return isLocationReport ? 'Other' : v;
    };

    const categories = [...new Set(filtered.map(v => normalize(v[groupKey])))];
    const dataByCat = categories
      .map(cat => ({
        name: cat,
        count: filtered.filter(v => normalize(v[groupKey]) === cat).length
      }))
      .filter(item => item.count > 0)
      .sort((a, b) => b.count - a.count);

    return {
      dataByCat,
      total: dataByCat.reduce((acc, curr) => acc + curr.count, 0),
      generatedOn: new Date().toLocaleString()
    };
  }, [isGenerated, violations, reportType]);

  const donutData = processed ? {
    labels: processed.dataByCat.map(d => d.name),
    datasets: [{
      data: processed.dataByCat.map(d => d.count),
      backgroundColor: processed.dataByCat.map(d => COLORS[d.name] || '#8E8E93'),
      hoverBackgroundColor: processed.dataByCat.map(d => COLORS[d.name] || '#8E8E93'),
      borderWidth: 0,
      hoverOffset: 15,
      spacing: 6,
    }]
  } : null;
  return (
    <div className="page-content reports-page-v2">
      {!isGenerated && !isLoading && (
        <div className="report-initial-view">
          <div className="report-empty-state-centered">
            <div className="empty-state-icon-large">📊</div>
            <h3>Comparative Monitoring Reports</h3>
            <p>Select report criteria and generate report to begin analysis.</p>

            <div className="report-builder-box">
              <div className="builder-row">
                <div className="field">
                  <label>Group By</label>
                  <select value={reportType} onChange={e => setReportType(e.target.value)}>
                    <option>By Violation Type</option>
                    <option>By Location</option>
                  </select>
                </div>
                <div className="field">
                  <label>Range</label>
                  <select value={dateRange} onChange={e => setDateRange(e.target.value)}>
                    <option>Last 7 Days</option>
                    <option>Last 30 Days</option>
                  </select>
                </div>
              </div>
              <button className="btn-premium btn-primary btn-generate-large" onClick={handleGenerate}>
                Generate Report
              </button>
            </div>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="report-loading-state">
          <div className="loading-shimmer-card">
            <div className="shimmer-line" style={{ width: '40%' }}></div>
            <div className="shimmer-circle"></div>
            <div className="shimmer-blocks">
              <div className="shimmer-block"></div>
              <div className="shimmer-block"></div>
            </div>
          </div>
          <p className="loading-text">Analyzing violating patterns...</p>
        </div>
      )}

      {isGenerated && processed && (
        <div className="report-results-singular fade-in-up">
          <div className="report-results-minimal-header">
            <div className="minimal-header-left">
              <button className="btn-back-link-minimal" onClick={() => setIsGenerated(false)}>
                ← New Report
              </button>
              <div className="report-metadata-minimal">
                <span className="type">{reportType}</span>
                <span className="sep">•</span>
                <span className="range">{dateRange}</span>
                <span className="sep">•</span>
                <span className="date">{processed.generatedOn}</span>
              </div>
            </div>
            <button className="btn-export-minimal" onClick={() => window.print()}>
              Export
            </button>
          </div>

          <div className="singular-donut-visual-container">
            {processed.total > 0 ? (
              <div className="donut-visual-card">
                <div className="chart-wrapper-singular" style={{ position: 'relative' }}>
                  <Doughnut
                    data={donutData}
                    options={{
                      cutout: '84%',
                      animation: { animateRotate: true, animateScale: true, duration: 1000 },
                      plugins: {
                        legend: {
                          position: 'bottom',
                          labels: {
                            usePointStyle: true,
                            padding: 40,
                            font: { size: 14, weight: '500' },
                            color: '#8E8E93'
                          }
                        },
                        tooltip: {
                          enabled: true,
                          backgroundColor: 'rgba(255,255,255,0.9)',
                          titleColor: '#1D1D1F',
                          bodyColor: '#1D1D1F',
                          borderColor: '#E5E5EA',
                          borderWidth: 1,
                          padding: 12,
                          cornerRadius: 12,
                          displayColors: false,
                          callbacks: {
                            label: (c) => ` ${c.label}: ${c.raw} Incidents (${((c.raw / processed.total) * 100).toFixed(1)}%)`
                          }
                        }
                      },
                      onHover: (event, elements) => {
                        if (elements && elements.length > 0) {
                          setHoveredIndex(elements[0].index);
                        } else {
                          setHoveredIndex(null);
                        }
                      },
                    }}
                  />
                  <div className="report-donut-center">
                    <span className="center-num-large">
                      {hoveredIndex !== null ? processed.dataByCat[hoveredIndex].count : processed.total}
                    </span>
                    <span className="center-label-muted">Incidents</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="report-results-empty-state">
                <div className="empty-state-icon-muted">🍃</div>
                <h4>No incidents found for selected period.</h4>
                <p>Try expanding your date range or selecting a different grouping category.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────── SETTINGS PAGE ───────────
function SettingsPage() {
  return (
    <div className="page-content">
      <div className="form-card">
        <h3>Settings</h3>
        <div className="form-group">
          <label>Institution Name</label>
          <input defaultValue="Demo University" />
        </div>
        <div className="form-group">
          <label>Notification Email</label>
          <input defaultValue="admin@university.edu" />
        </div>
        <div className="form-group">
          <label>Violation Threshold (per semester)</label>
          <input type="number" defaultValue={5} />
        </div>
        <button className="btn-premium btn-primary" style={{ marginTop: 12 }}>Save Changes</button>
      </div>
    </div>
  )
}

// ─────────── MAIN APP ───────────
export default function App() {
  const navigate = useNavigate()
  const [token, setToken] = useState(localStorage.getItem('token'))
  const [students, setStudents] = useState([])
  const [violations, setViolations] = useState([])
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem('theme')
    if (saved) return saved === 'dark'
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
  })
  const [selectedStudentForPanel, setSelectedStudentForPanel] = useState(null)
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true)
  const [isSidebarHovered, setIsSidebarHovered] = useState(false)
  const [showRegisterModal, setShowRegisterModal] = useState(false)

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')
    localStorage.setItem('theme', dark ? 'dark' : 'light')
  }, [dark])

  const toggleTheme = () => setDark(prev => !prev)

  useEffect(() => {
    if (token) loadData()
  }, [token])

  const loadData = async () => {
    try {
      const [sRes, vRes] = await Promise.all([
        apiClient.get('/api/students/').catch(() => ({ data: [] })),
        apiClient.get('/api/violations/').catch(() => ({ data: [] })),
      ])

      const realViolations = vRes.data || [];
      const dummyViolations = [
        { roll_no: '21CS001', student_name: 'Aditya Kumar', type: 'Late Entry', location: 'A Block', date: '2026-02-23 09:15 AM', resolved: false },
        { roll_no: '21CS014', student_name: 'Sneha Reddy', type: 'Dress Code', location: 'B Block', date: '2026-02-23 10:30 AM', resolved: true },
        { roll_no: '21CS042', student_name: 'Vikram Singh', type: 'Bunk', location: 'Central Block', date: '2026-02-22 02:45 PM', resolved: false },
        { roll_no: '21CS089', student_name: 'Priya Sharma', type: 'Late Entry', location: 'D Block', date: '2026-02-22 09:05 AM', resolved: true },
        { roll_no: '21CS112', student_name: 'Rahul Verma', type: 'Discipline', location: 'U Block', date: '2026-02-21 11:20 AM', resolved: false },
        { roll_no: '21CS156', student_name: 'Anjali Das', type: 'Late Entry', location: 'N Block', date: '2026-02-21 09:40 AM', resolved: false },
        { roll_no: '21CS201', student_name: 'Suresh Raina', type: 'Bunk', location: 'Playground', date: '2026-02-20 03:15 PM', resolved: true },
        { roll_no: '21CS005', student_name: 'Karthik Raja', type: 'Dress Code', location: 'C Block', date: '2026-02-20 10:00 AM', resolved: false },
      ];

      setStudents(sRes.data || [])
      setViolations(realViolations.length > 0 ? realViolations : dummyViolations)
    } catch { }
  }

  const handleLogin = (t) => {
    localStorage.setItem('token', t)
    setToken(t)
    navigate('/dashboard')
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    setToken(null)
  }

  if (!token) return <LoginPage onLogin={handleLogin} />

  const headerProps = { dark, onToggleTheme: toggleTheme }

  return (
    <div
      className="app-layout"
      style={{
        '--sidebar-width': (isSidebarCollapsed && !isSidebarHovered) ? '72px' : '220px'
      }}
    >
      <Sidebar
        isCollapsed={isSidebarCollapsed && !isSidebarHovered}
        onLogout={handleLogout}
        onMouseEnter={() => setIsSidebarHovered(true)}
        onMouseLeave={() => setIsSidebarHovered(false)}
      />
      <main className="main-content">
        <Header
          {...headerProps}
          onAction={() => setShowRegisterModal(true)}
        />
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/students" element={
            <StudentsPage
              students={students}
              token={token}
              onRefresh={loadData}
              showRegisterModal={showRegisterModal}
              setShowRegisterModal={setShowRegisterModal}
              onStudentClick={(s) => {
                setSelectedStudentForPanel(s);
                setIsPanelOpen(true);
              }}
            />
          } />
          <Route path="/detect" element={<DetectPage onDetect={loadData} />} />
          <Route path="/violations" element={<ViolationsPage violations={violations} />} />
          <Route path="/reports" element={<ReportsPage students={students} violations={violations} />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/dashboard" />} />
        </Routes>
      </main>
      <StudentProfileSidePanel
        student={selectedStudentForPanel}
        isOpen={isPanelOpen}
        onClose={() => setIsPanelOpen(false)}
        dark={dark}
      />
    </div>
  )
}
