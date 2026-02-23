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

const API = 'http://localhost:5000'

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
      const res = await axios.post(`${API}/login`, { username: user, password: pass })
      onLogin(res.data.token)
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
function Sidebar({ isCollapsed, onToggle, onLogout }) {
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
    <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <button className="sidebar-toggle" onClick={onToggle}>
        {isCollapsed ? Icons.chevronRight : Icons.chevronLeft}
      </button>

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
        return { title: 'Violations', subtitle: 'Review recorded incidents.' };
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
        <div className="avatar">SR</div>
      </div>
    </header>
  )
}

// ─────────── DASHBOARD ───────────
function Dashboard() {
  // KPI data
  const kpis = [
    {
      label: 'Students Monitored', value: '2,847', badge: '+12%', badgeType: 'up',
      color: 'blue', icon: Icons.users,
      sparkline: [18, 22, 19, 25, 27, 23, 29],
      accentColor: '#007AFF',
    },
    {
      label: 'Daily Violations', value: '23', badge: '-8%', badgeType: 'down',
      color: 'orange', icon: Icons.alert,
      sparkline: [30, 28, 35, 25, 22, 27, 23],
      accentColor: '#FF9500',
    }
  ]

  // Line chart – Violations Trend
  const lineData = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [{
      label: 'Violations',
      data: [18, 25, 20, 32, 28, 15, 23],
      borderColor: '#007AFF',
      backgroundColor: (ctx) => {
        const chart = ctx.chart
        const { ctx: context, chartArea } = chart
        if (!chartArea) return 'rgba(0,122,255,0.1)'
        const gradient = context.createLinearGradient(0, chartArea.top, 0, chartArea.bottom)
        gradient.addColorStop(0, 'rgba(0, 122, 255, 0.15)')
        gradient.addColorStop(1, 'rgba(0, 122, 255, 0.0)')
        return gradient
      },
      fill: true,
      tension: 0.45,
      borderWidth: 2.5,
      pointRadius: 0,
      pointHoverRadius: 6,
      pointHoverBackgroundColor: '#007AFF',
      pointHoverBorderColor: '#fff',
      pointHoverBorderWidth: 2,
    }],
  }

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(255,255,255,0.92)',
        titleColor: '#1D1D1F',
        bodyColor: '#86868B',
        borderColor: 'rgba(0,0,0,0.08)',
        borderWidth: 1,
        cornerRadius: 12,
        padding: 12,
        titleFont: { family: 'Inter', size: 13, weight: '600' },
        bodyFont: { family: 'Inter', size: 12 },
        displayColors: false,
        callbacks: {
          title: (items) => items[0].label,
          label: (item) => `${item.parsed.y} violations`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        border: { display: false },
        ticks: {
          color: '#AEAEB2', font: { family: 'Inter', size: 12 },
          padding: 8,
        },
      },
      y: {
        grid: { color: 'rgba(0,0,0,0.04)', drawBorder: false },
        border: { display: false },
        ticks: {
          color: '#AEAEB2', font: { family: 'Inter', size: 12 },
          padding: 12, maxTicksLimit: 5,
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
        'rgba(0, 122, 255, 0.7)',
        'rgba(88, 86, 214, 0.7)',
        'rgba(175, 82, 222, 0.7)',
        'rgba(52, 199, 89, 0.7)',
        'rgba(255, 149, 0, 0.7)',
        'rgba(255, 59, 48, 0.7)',
      ],
      borderRadius: 8,
      borderSkipped: false,
      barPercentage: 0.6,
      categoryPercentage: 0.7,
    }],
  }

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(255,255,255,0.92)',
        titleColor: '#1D1D1F',
        bodyColor: '#86868B',
        borderColor: 'rgba(0,0,0,0.08)',
        borderWidth: 1,
        cornerRadius: 12,
        padding: 12,
        titleFont: { family: 'Inter', size: 13, weight: '600' },
        bodyFont: { family: 'Inter', size: 12 },
        displayColors: false,
      },
    },
    scales: {
      x: {
        grid: { display: false },
        border: { display: false },
        ticks: {
          color: '#AEAEB2', font: { family: 'Inter', size: 12 },
          padding: 8,
        },
      },
      y: {
        grid: { color: 'rgba(0,0,0,0.04)', drawBorder: false },
        border: { display: false },
        ticks: {
          color: '#AEAEB2', font: { family: 'Inter', size: 12 },
          padding: 12, maxTicksLimit: 5,
        },
      },
    },
  }

  // Donut chart – Violation Types
  const donutData = {
    labels: ['Late Arrival', 'Dress Code', 'Bunk'],
    datasets: [{
      data: [38, 20, 17],
      backgroundColor: [
        '#007AFF',
        '#AF52DE',
        '#FF3B30',
      ],
      borderWidth: 0,
      spacing: 3,
      borderRadius: 4,
    }],
  }

  const donutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '72%',
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(255,255,255,0.92)',
        titleColor: '#1D1D1F',
        bodyColor: '#86868B',
        borderColor: 'rgba(0,0,0,0.08)',
        borderWidth: 1,
        cornerRadius: 12,
        padding: 12,
        titleFont: { family: 'Inter', size: 13, weight: '600' },
        bodyFont: { family: 'Inter', size: 12 },
      },
    },
  }

  const donutLegend = [
    { label: 'Late Arrival', color: '#007AFF' },
    { label: 'Dress Code', color: '#AF52DE' },
    { label: 'Bunk', color: '#FF3B30' },
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
      {/* KPI Cards */}
      <div className="kpi-grid">
        {kpis.map((kpi, i) => (
          <div className={`kpi-card ${kpi.color}`} key={i}>
            <div className="kpi-header">
              <div className={`kpi-icon ${kpi.color}`}>{kpi.icon}</div>
              <span className={`kpi-badge ${kpi.badgeType}`}>{kpi.badge}</span>
            </div>
            <div className="kpi-value">{kpi.value}</div>
            <div className="kpi-label">{kpi.label}</div>
            <div className="kpi-sparkline">
              <Sparkline data={kpi.sparkline} color={kpi.accentColor} />
            </div>
          </div>
        ))}

        {/* Insight Card */}
        <div className="kpi-card insight">
          <div className="kpi-header">
            <div className="kpi-icon purple">{Icons.brain}</div>
            <span className="kpi-badge up" style={{ background: 'var(--accent-purple-soft)', color: 'var(--accent-purple)' }}>Insight</span>
          </div>
          <div className="insight-text">
            Mechanical department shows <strong>18% higher</strong> bunk rate this week.
          </div>
          <div className="kpi-label" style={{ marginTop: 'auto' }}>AI Analysis</div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="charts-grid">
        <div className="chart-card">
          <div className="chart-card-header">
            <h3>Violations Trend</h3>
            <span>Last 7 Days</span>
          </div>
          <div className="chart-wrapper">
            <Line data={lineData} options={lineOptions} />
          </div>
        </div>

        <div className="chart-card">
          <div className="chart-card-header">
            <h3>By Department</h3>
            <span>This Semester</span>
          </div>
          <div className="chart-wrapper">
            <Bar data={barData} options={barOptions} />
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="bottom-grid">
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
    name: '', roll_no: '', dept: 'CSE', year: '3rd Year', phone: '', email: '', threshold: '75', image: null
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

  // Derived stats for summary
  const summaryStats = [
    { label: 'Total Students', value: students.length || '2,847', icon: '👥', color: 'blue' },
    { label: 'Late Arrivals', value: '14', icon: '⏰', color: 'orange' },
    { label: 'Dress Code', value: '08', icon: '👔', color: 'purple' },
    { label: 'Bunk', value: '03', icon: '🏃', color: 'red' },
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
                  {students.map((s, i) => {
                    const status = getStatus(s.violation_count || i % 3)
                    return (
                      <tr key={i} onClick={() => onStudentClick && onStudentClick(s)}>
                        <td>
                          <img className="profile-img-small" src={`https://i.pravatar.cc/150?u=${s.roll_no}`} alt="avatar" />
                        </td>
                        <td style={{ fontWeight: 600 }}>{s.roll_no}</td>
                        <td>{s.name}</td>
                        <td>{filter.section}</td>
                        <td style={{ textAlign: 'center', fontWeight: 600 }}>{s.violation_count || i % 3}</td>
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

            <form className="registration-form" onSubmit={(e) => {
              e.preventDefault()
              setShowRegisterModal(false)
              alert('Student registration submitted for ' + regForm.name)
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
                  if (file) setRegForm({ ...regForm, image: URL.createObjectURL(file) })
                }}
                onClick={() => document.getElementById('file-input').click()}
              >
                <input
                  id="file-input"
                  type="file"
                  hidden
                  onChange={e => {
                    const file = e.target.files[0]
                    if (file) setRegForm({ ...regForm, image: URL.createObjectURL(file) })
                  }}
                />
                {regForm.image ? (
                  <img src={regForm.image} className="upload-preview" alt="preview" />
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
                    <option>CSE</option><option>ECE</option><option>EEE</option><option>MECH</option>
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
              <img className="modal-profile-img" src={`https://i.pravatar.cc/300?u=${selectedStudent.roll_no}`} alt="profile" />
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
  const [classId, setClassId] = useState('')
  const [period, setPeriod] = useState('')
  const [file, setFile] = useState(null)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!file) return alert('Select an image')
    setLoading(true)
    setResult(null)
    try {
      const fd = new FormData()
      fd.append('image', file)
      fd.append('class_id', classId)
      fd.append('period', period)
      const res = await axios.post(`${API}/detect`, fd)
      setResult(res.data)
    } catch {
      alert('Detection error')
    }
    setLoading(false)
  }

  const handleConfirm = async () => {
    if (!result) return
    try {
      await axios.post(`${API}/confirm`, result)
      alert('Violation confirmed!')
      setResult(null)
      if (onDetect) onDetect()
    } catch {
      alert('Confirmation error')
    }
  }

  return (
    <div className="page-content">
      <div className="form-card" style={{ maxWidth: 600 }}>
        <h3>Detect Violations</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Class ID</label>
            <input value={classId} onChange={e => setClassId(e.target.value)} placeholder="e.g. CSE-A" required />
          </div>
          <div className="form-group">
            <label>Period</label>
            <input value={period} onChange={e => setPeriod(e.target.value)} placeholder="e.g. 1" required />
          </div>
          <div className="form-group">
            <label>Classroom Image</label>
            <input type="file" accept="image/*" onChange={e => setFile(e.target.files[0])} />
          </div>
          <button type="submit" className="btn-premium btn-primary" style={{ width: '100%', marginTop: 8 }} disabled={loading}>
            {loading ? 'Analyzing...' : 'Analyze Image'}
          </button>
        </form>
        {result && (
          <div style={{ marginTop: 24, padding: 20, background: 'var(--bg)', borderRadius: 'var(--radius-sm)' }}>
            <h3 style={{ marginBottom: 12 }}>Detection Result</h3>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 8 }}>
              Absent students: <strong style={{ color: 'var(--text-primary)' }}>{result.absentees?.join(', ') || 'None'}</strong>
            </p>
            <button className="btn-premium btn-primary" onClick={handleConfirm} style={{ marginTop: 8, width: '100%' }}>Confirm & Save</button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────── VIOLATIONS PAGE ───────────
function ViolationsPage({ violations }) {
  return (
    <div className="page-content">
      <table className="data-table">
        <thead>
          <tr><th>Student</th><th>Roll No</th><th>Type</th><th>Date</th><th>Status</th></tr>
        </thead>
        <tbody>
          {violations.map((v, i) => (
            <tr key={i}>
              <td>{v.student_name}</td>
              <td>{v.roll_no}</td>
              <td>{v.type}</td>
              <td>{v.date}</td>
              <td><span className={`status-badge ${v.resolved ? 'active' : 'inactive'}`}>{v.resolved ? 'Resolved' : 'Pending'}</span></td>
            </tr>
          ))}
          {violations.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: 40 }}>No violations recorded</td></tr>}
        </tbody>
      </table>
    </div>
  )
}

// ─────────── REPORTS PAGE ───────────
function ReportsPage({ students, violations }) {
  const deptMap = {}
  violations.forEach(v => {
    deptMap[v.department || 'Unknown'] = (deptMap[v.department || 'Unknown'] || 0) + 1
  })

  return (
    <div className="page-content">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <div className="chart-card">
          <div className="chart-card-header"><h3>Summary</h3></div>
          <div style={{ display: 'grid', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--border-subtle)' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Total Students</span>
              <strong>{students.length}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--border-subtle)' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Total Violations</span>
              <strong>{violations.length}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Resolved</span>
              <strong>{violations.filter(v => v.resolved).length}</strong>
            </div>
          </div>
        </div>
        <div className="chart-card">
          <div className="chart-card-header"><h3>By Department</h3></div>
          <div style={{ display: 'grid', gap: 12 }}>
            {Object.entries(deptMap).map(([dept, count], i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: 14 }}>{dept}</span>
                <span className="kpi-badge up" style={{ background: 'var(--accent-blue-soft)', color: 'var(--accent-blue)' }}>{count}</span>
              </div>
            ))}
            {Object.keys(deptMap).length === 0 && <p style={{ color: 'var(--text-tertiary)', fontSize: 14, textAlign: 'center', padding: 20 }}>No data</p>}
          </div>
        </div>
      </div>
    </div>
  )
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
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
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
        axios.get(`${API}/students`).catch(() => ({ data: [] })),
        axios.get(`${API}/violations`).catch(() => ({ data: [] })),
      ])
      setStudents(sRes.data || [])
      setViolations(vRes.data || [])
    } catch { }
  }

  const handleLogin = (t) => {
    localStorage.setItem('token', t)
    setToken(t)
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    setToken(null)
    navigate('/login')
  }

  if (!token) return <LoginPage onLogin={handleLogin} />

  const headerProps = { dark, onToggleTheme: toggleTheme }

  return (
    <div className="app-layout" style={{ '--sidebar-width': isSidebarCollapsed ? '80px' : '230px' }}>
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        onLogout={handleLogout}
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
