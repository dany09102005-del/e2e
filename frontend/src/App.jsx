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
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
      <path d="M11.47 3.84a.75.75 0 011.06 0l8.69 8.69a.75.75 0 101.06-1.06l-8.689-8.69a2.25 2.25 0 00-3.182 0l-8.69 8.69a.75.75 0 001.061 1.06l8.69-8.69z" />
      <path d="M12 5.432l8.159 8.159c.03.03.06.058.091.086v6.198c0 1.035-.84 1.875-1.875 1.875H15a.75.75 0 01-.75-.75v-4.5a.75.75 0 00-.75-.75h-3a.75.75 0 00-.75.75V21a.75.75 0 01-.75.75H5.625a1.875 1.875 0 01-1.875-1.875v-6.198a2.29 2.29 0 00.091-.086L12 5.432z" />
    </svg>
  ),
  users: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
      <path d="M4.5 6.375a4.125 4.125 0 118.25 0 4.125 4.125 0 01-8.25 0zM14.25 8.625a3.375 3.375 0 116.75 0 3.375 3.375 0 01-6.75 0zM1.5 19.125a7.125 7.125 0 0114.25 0v.003l-.001.119a.75.75 0 01-.363.63 13.067 13.067 0 01-6.761 1.873c-2.472 0-4.786-.684-6.76-1.873a.75.75 0 01-.364-.63l-.001-.122zM17.25 19.128l-.001.144a2.25 2.25 0 01-.233.96 10.088 10.088 0 005.06-1.01.75.75 0 00.42-.643 4.875 4.875 0 00-6.957-4.611 8.586 8.586 0 011.71 5.157v.003z" />
    </svg>
  ),
  activity: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
      <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM12.75 6a.75.75 0 00-1.5 0v6c0 .414.336.75.75.75h4.5a.75.75 0 000-1.5h-3.75V6z" clipRule="evenodd" />
    </svg>
  ),
  mapPin: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
      <path fillRule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
    </svg>
  ),
  alert: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
      <path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
    </svg>
  ),
  detect: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 9a3.75 3.75 0 100 7.5A3.75 3.75 0 0012 9z" />
      <path fillRule="evenodd" d="M9.344 3.071a49.52 49.52 0 015.312 0c.967.052 1.83.585 2.332 1.39l.821 1.317c.24.383.645.643 1.11.71.386.054.77.113 1.152.177 1.432.239 2.429 1.493 2.429 2.909V18a3 3 0 01-3 3H4.5a3 3 0 01-3-3V9.574c0-1.416.997-2.67 2.429-2.909.382-.064.766-.123 1.151-.178a1.56 1.56 0 001.11-.71l.822-1.315a2.942 2.942 0 012.332-1.39zM12 17.25a4.5 4.5 0 100-9 4.5 4.5 0 000 9z" clipRule="evenodd" />
    </svg>
  ),
  chart: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
      <path fillRule="evenodd" d="M2.25 13.5a8.25 8.25 0 018.25-8.25.75.75 0 01.75.75v6.75H18a.75.75 0 01.75.75 8.25 8.25 0 01-16.5 0z" clipRule="evenodd" />
      <path fillRule="evenodd" d="M12.75 3a.75.75 0 01.75-.75 8.25 8.25 0 018.25 8.25.75.75 0 01-.75.75h-7.5a.75.75 0 01-.75-.75V3z" clipRule="evenodd" />
    </svg>
  ),
  settings: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
      <path fillRule="evenodd" d="M11.078 2.25c-.917 0-1.699.663-1.85 1.567L9.05 4.889c-.02.12-.115.26-.297.348a7.493 7.493 0 00-.986.57c-.166.115-.334.126-.45.083L6.3 5.508a1.875 1.875 0 00-2.282.819l-.922 1.597a1.875 1.875 0 00.432 2.385l.84.692c.095.078.17.229.154.43a7.598 7.598 0 000 1.139c.015.2-.059.352-.153.43l-.841.692a1.875 1.875 0 00-.432 2.385l.922 1.597a1.875 1.875 0 002.282.818l1.019-.382c.115-.043.283-.031.45.082.312.214.641.405.985.57.182.088.277.228.297.35l.178 1.071c.151.904.933 1.567 1.85 1.567h1.844c.916 0 1.699-.663 1.85-1.567l.178-1.072c.02-.12.114-.26.297-.349.344-.165.673-.356.985-.57.167-.114.335-.125.45-.082l1.02.382a1.875 1.875 0 002.28-.819l.923-1.597a1.875 1.875 0 00-.432-2.385l-.84-.692c-.095-.078-.17-.229-.154-.43a7.614 7.614 0 000-1.139c-.016-.2.059-.352.153-.43l.84-.692c.708-.582.891-1.59.433-2.385l-.922-1.597a1.875 1.875 0 00-2.282-.818l-1.02.382c-.114.043-.282.031-.449-.083a7.49 7.49 0 00-.985-.57c-.183-.087-.277-.227-.297-.348l-.179-1.072a1.875 1.875 0 00-1.85-1.567h-1.843zM12 15.75a3.75 3.75 0 100-7.5 3.75 3.75 0 000 7.5z" clipRule="evenodd" />
    </svg>
  ),
  search: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
      <path fillRule="evenodd" d="M10.5 3.75a6.75 6.75 0 100 13.5 6.75 6.75 0 000-13.5zM2.25 10.5a8.25 8.25 0 1114.59 5.28l4.69 4.69a.75.75 0 11-1.06 1.06l-4.69-4.69A8.25 8.25 0 012.25 10.5z" clipRule="evenodd" />
    </svg>
  ),
  bell: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
      <path fillRule="evenodd" d="M5.25 9a6.75 6.75 0 0113.5 0v.75c0 2.123.8 4.057 2.118 5.52a.75.75 0 01-.297 1.206c-1.544.57-3.16.99-4.831 1.243a3.75 3.75 0 11-7.48 0 24.585 24.585 0 01-4.831-1.244.75.75 0 01-.298-1.205A8.217 8.217 0 005.25 9.75V9zm4.502 8.9a2.25 2.25 0 104.496 0 25.057 25.057 0 01-4.496 0z" clipRule="evenodd" />
    </svg>
  ),
  shield: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
      <path fillRule="evenodd" d="M12.516 2.17a.75.75 0 00-1.032 0 11.209 11.209 0 01-7.877 3.08.75.75 0 00-.722.515A12.74 12.74 0 002.25 9.75c0 5.942 4.064 10.933 9.563 12.348a.749.749 0 00.374 0c5.499-1.415 9.563-6.406 9.563-12.348 0-1.39-.223-2.73-.635-3.985a.75.75 0 00-.722-.516l-.143.001c-2.996 0-5.717-1.17-7.734-3.08zm3.094 8.016a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
    </svg>
  ),
  logout: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
      <path fillRule="evenodd" d="M7.5 3.75A1.5 1.5 0 006 5.25v13.5a1.5 1.5 0 001.5 1.5h6a1.5 1.5 0 001.5-1.5V15a.75.75 0 011.5 0v3.75a3 3 0 01-3 3h-6a3 3 0 01-3-3V5.25a3 3 0 013-3h6a3 3 0 013 3V9a.75.75 0 01-1.5 0V5.25a1.5 1.5 0 00-1.5-1.5h-6zm10.72 4.72a.75.75 0 011.06 0l3 3a.75.75 0 010 1.06l-3 3a.75.75 0 11-1.06-1.06l1.72-1.72H9a.75.75 0 010-1.5h10.94l-1.72-1.72a.75.75 0 010-1.06z" clipRule="evenodd" />
    </svg>
  ),
  sun: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.758 17.303a.75.75 0 00-1.061-1.06l-1.591 1.59a.75.75 0 001.06 1.061l1.591-1.59zM6 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 12zM6.697 7.757a.75.75 0 001.06-.06l1.59-1.591a.75.75 0 00-1.06-1.06l-1.59 1.59a.75.75 0 000 1.06v.061z" />
    </svg>
  ),
  moon: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
      <path fillRule="evenodd" d="M9.528 1.718a.75.75 0 01.162.819A8.97 8.97 0 009 6a9 9 0 009 9 8.97 8.97 0 003.463-.69.75.75 0 01.981.98 10.503 10.503 0 01-9.694 6.46c-5.799 0-10.5-4.701-10.5-10.5 0-4.368 2.667-8.112 6.46-9.694a.75.75 0 01.818.162z" clipRule="evenodd" />
    </svg>
  ),
  brain: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
      <path fillRule="evenodd" d="M12.516 2.17a.75.75 0 00-1.032 0 11.209 11.209 0 01-7.877 3.08.75.75 0 00-.722.515A12.74 12.74 0 002.25 9.75c0 5.942 4.064 10.933 9.563 12.348a.749.749 0 00.374 0c5.499-1.415 9.563-6.406 9.563-12.348 0-1.39-.223-2.73-.635-3.985a.75.75 0 00-.722-.516l-.143.001c-2.996 0-5.717-1.17-7.734-3.08zm3.094 8.016a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
    </svg>
  ),
  plus: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
      <path fillRule="evenodd" d="M12 3.75a.75.75 0 01.75.75v6.75h6.75a.75.75 0 010 1.5h-6.75v6.75a.75.75 0 01-1.5 0v-6.75H5.25a.75.75 0 010-1.5h6.75V4.5a.75.75 0 01.75-.75z" clipRule="evenodd" />
    </svg>
  ),
  chevronLeft: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
      <path fillRule="evenodd" d="M7.72 12.53a.75.75 0 010-1.06l7.5-7.5a.75.75 0 111.06 1.06L9.31 12l6.97 6.97a.75.75 0 11-1.06 1.06l-7.5-7.5z" clipRule="evenodd" />
    </svg>
  ),
  chevronRight: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
      <path fillRule="evenodd" d="M16.28 11.47a.75.75 0 010 1.06l-7.5 7.5a.75.75 0 01-1.06-1.06L14.69 12 7.72 5.03a.75.75 0 011.06-1.06l7.5 7.5z" clipRule="evenodd" />
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
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" style={{ width: 28, height: 28 }}>
            <path fillRule="evenodd" d="M18.685 19.097A9.723 9.723 0 0021.75 12c0-5.385-4.365-9.75-9.75-9.75S2.25 6.615 2.25 12a9.723 9.723 0 003.065 7.097A9.716 9.716 0 0012 21.75a9.716 9.716 0 006.685-2.653zm-12.54-1.285A7.486 7.486 0 0112 15a7.486 7.486 0 015.855 2.812A8.224 8.224 0 0112 20.25a8.224 8.224 0 01-5.855-2.438zM15.75 9a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" clipRule="evenodd" />
          </svg>
        </div>
      </div>
    </header>
  )
}

// ─────────── DASHBOARD ───────────
function Dashboard() {
  const [dashboardData, setDashboardData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showAllActivity, setShowAllActivity] = useState(false)

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
    most_active_location: { name: "N/A", count: 0 },
    dept_breakdown: { labels: [], data: [] },
    type_breakdown: { labels: [], data: [] },
    recent_activity: []
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
          stepSize: 1,
          callback: (v) => Number.isInteger(v) ? (v === 0 ? '' : v) : ''
        },
      },
    },
  }

  // Bar chart – Violations by Department
  const deptColors = [
    'rgba(10, 132, 255, 0.3)', 'rgba(175, 82, 222, 0.3)', 'rgba(255, 149, 0, 0.3)',
    'rgba(52, 199, 89, 0.3)', 'rgba(255, 59, 48, 0.3)', 'rgba(88, 86, 214, 0.3)'
  ]
  const deptHoverColors = [
    'rgba(10, 132, 255, 0.5)', 'rgba(175, 82, 222, 0.5)', 'rgba(255, 149, 0, 0.5)',
    'rgba(52, 199, 89, 0.5)', 'rgba(255, 59, 48, 0.5)', 'rgba(88, 86, 214, 0.5)'
  ]
  const barData = {
    labels: safeData.dept_breakdown.labels,
    datasets: [{
      label: 'Violations',
      data: safeData.dept_breakdown.data,
      backgroundColor: safeData.dept_breakdown.labels.map((_, i) => deptColors[i % deptColors.length]),
      hoverBackgroundColor: safeData.dept_breakdown.labels.map((_, i) => deptHoverColors[i % deptHoverColors.length]),
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
  const typeColors = ['#0A84FF', '#AF52DE', '#FF453A', '#FF9500', '#34C759', '#5856D6']
  const donutData = {
    labels: safeData.type_breakdown.labels,
    datasets: [{
      data: safeData.type_breakdown.data,
      backgroundColor: safeData.type_breakdown.labels.map((_, i) => typeColors[i % typeColors.length]),
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

  const donutTotal = safeData.type_breakdown.data.reduce((sum, v) => sum + v, 0)

  const donutLegend = safeData.type_breakdown.labels.map((label, i) => ({
    label,
    color: typeColors[i % typeColors.length]
  }))

  // Recent Activity from API
  const activities = safeData.recent_activity.map(v => ({
    dot: v.dot,
    text: <><strong>{v.roll_no}</strong> — {v.type}: {v.remarks || 'No details'}</>,
    time: v.time,
    badge: v.badge,
    badgeLabel: v.type
  }))

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
            {/* <span>This Semester</span> */}
          </div>
          <div className="chart-wrapper">
            <Bar data={barData} options={barOptions} />
          </div>
        </div>

        <div className="bottom-card">
          <div className="bottom-card-header">
            <h3>Violation Types</h3>
            {/* <a>View All</a> */}
          </div>
          <div className="donut-wrapper">
            <Doughnut data={donutData} options={donutOptions} />
            <div className="donut-center">
              <div className="donut-number">{donutTotal}</div>
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
            <a style={{ cursor: 'pointer' }} onClick={() => setShowAllActivity(prev => !prev)}>{showAllActivity ? 'Show Less' : 'View All'}</a>
          </div>
          <div className="activity-list">
            {(showAllActivity ? activities : activities.slice(0, 5)).map((act, i) => (
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
    batch: '2023-27',
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
  const [profileAnalytics, setProfileAnalytics] = useState(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const [studentPage, setStudentPage] = useState(1)
  const studentsPerPage = 7

  // Fetch unique student analytics when a profile is selected
  useEffect(() => {
    if (selectedStudent?.roll_no) {
      setProfileLoading(true)
      apiClient.get(`/api/students/${selectedStudent.roll_no}/analytics`)
        .then(res => {
          setProfileAnalytics(res.data.data)
          setProfileLoading(false)
        })
        .catch(err => {
          console.error("Failed fetching profile analytics", err)
          setProfileLoading(false)
        })
    }
  }, [selectedStudent])



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
    if (count === 0) return { label: 'Clean', class: 'status-p-clean' }
    if (count < 3) return { label: 'Low Risk', class: 'status-p-low' }
    if (count < 7) return { label: 'Medium', class: 'status-p-monitor' }
    return { label: 'High Risk', class: 'status-p-high' }
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
              <option>2023-27</option><option>2024-28</option><option>2025-29</option><option>2026-30</option>
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
              <option>A</option><option>B</option><option>C</option><option>D</option>
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
                  {filteredStudents.slice((studentPage - 1) * studentsPerPage, studentPage * studentsPerPage).map((s, i) => {
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
                <button
                  className="pagination-btn"
                  disabled={studentPage === 1}
                  onClick={() => setStudentPage(prev => Math.max(1, prev - 1))}
                >
                  Previous
                </button>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Page {studentPage} of {Math.max(1, Math.ceil(filteredStudents.length / studentsPerPage))}</span>
                <button
                  className="pagination-btn"
                  disabled={studentPage >= Math.ceil(filteredStudents.length / studentsPerPage)}
                  onClick={() => setStudentPage(prev => prev + 1)}
                >
                  Next
                </button>
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
                {profileLoading ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
                    <div className="spinner" style={{ width: 30, height: 30, border: '3px solid var(--accent-blue)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                  </div>
                ) : (
                  <>
                    {activeTab === 'overview' && profileAnalytics && (
                      <div style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6 }}>
                        <div style={{ marginBottom: 16 }}>
                          Recent patterns show a total of <strong style={{ color: 'var(--text-primary)' }}>{profileAnalytics.total}</strong> alerts related to disciplinary policies.
                        </div>

                        {profileAnalytics.total > 0 && (
                          <div style={{ background: 'var(--bg)', padding: 16, borderRadius: 12 }}>
                            <h4 style={{ margin: '0 0 12px 0', fontSize: 14, color: 'var(--text-primary)' }}>Violation Breakdown</h4>
                            {Object.entries(profileAnalytics.breakdown).map(([type, count]) => (
                              <div key={type} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                                <span>{type}</span>
                                <span style={{ fontWeight: 600, color: 'var(--accent-red)' }}>{count}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    {activeTab === 'history' && profileAnalytics && (
                      <div className="timeline">
                        {profileAnalytics.timeline.length === 0 ? (
                          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-tertiary)', fontSize: 14 }}>
                            No violation history recorded.
                          </div>
                        ) : (
                          profileAnalytics.timeline.map((v, i) => (
                            <div className="timeline-item" key={i}>
                              <div className="timeline-date">{v.date}</div>
                              <div className="timeline-content">
                                <strong style={{ color: 'var(--accent-red)' }}>{v.type}</strong>: {v.remark}
                                <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>📍 {v.location}</div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                    {activeTab === 'remarks' && (
                      <textarea
                        className="filter-input"
                        placeholder="Enter counselor remarks here..."
                        style={{ width: '100%', height: 120, resize: 'none' }}
                      ></textarea>
                    )}
                  </>
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
  const [violationType, setViolationType] = useState('Late Arrival')
  const [remarks, setRemarks] = useState('Detected via camera')
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
    } catch (err) {
      alert("Analysis Failed: " + (err.response?.data?.error || err.message))
    }
    setLoading(false)
  }

  const handleConfirm = async () => {
    if (!result?.matched) return
    if (!violationType) return alert('Please select a violation type')
    if (!remarks) return alert('Please enter remarks')

    try {
      const payload = {
        type: violationType,
        location: location,
        remarks: remarks,
        roll_no: result.student.roll_no,
        department: result.student.department,
        section: result.student.section,
        status: "Pending"
      }

      await apiClient.post('/api/violations/', payload)
      alert('Violation confirmed and recorded!')
      setResult(null)
      setFile(null)
      setPreview(null)
      if (onDetect) onDetect()
    } catch (err) {
      alert('Confirmation error: ' + (err.response?.data?.error || err.message))
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
          ) : loading ? (
            <div className="detection-results-panel fade-in-up">
              <div className="detect-card" style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div className="shimmer-line" style={{ width: '40%', height: 24, borderRadius: 6 }}></div>
                <div style={{ display: 'flex', gap: 16 }}>
                  <div className="shimmer-block" style={{ flex: 1, height: 200, borderRadius: 12 }}></div>
                  <div className="shimmer-block" style={{ flex: 1, height: 200, borderRadius: 12 }}></div>
                </div>
                <div className="shimmer-line" style={{ width: '80%', height: 16, borderRadius: 4 }}></div>
                <div className="shimmer-line" style={{ width: '60%', height: 16, borderRadius: 4 }}></div>
                <div className="shimmer-block" style={{ height: 48, borderRadius: 12, marginTop: 'auto' }}></div>
              </div>
            </div>
          ) : (
            <div className="detection-results-panel fade-in-up">
              {result && (
                <div className="detect-card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>

                  {result.matched ? (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                        <h3 style={{ fontSize: 18 }}>Face Match Successful</h3>
                        <span className="violation-pill" style={{ background: 'var(--accent-green-soft)', color: 'var(--accent-green)' }}>
                          {result.confidence}% Match
                        </span>
                      </div>

                      <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
                        <div style={{ flex: 1, textAlign: 'center' }}>
                          <div className="preview-container-detect" style={{ height: 180, marginBottom: 8 }}>
                            <img src={preview} alt="Captured Upload" style={{ objectFit: 'cover', width: '100%', height: '100%' }} />
                          </div>
                          <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>Captured Image</span>
                        </div>
                        <div style={{ flex: 1, textAlign: 'center' }}>
                          <div className="preview-container-detect" style={{ height: 180, marginBottom: 8, border: '2px solid var(--accent-green)' }}>
                            <img src={`${API}/api/students/${result.student.roll_no}/image`} alt="DB Match" style={{ objectFit: 'cover', width: '100%', height: '100%' }} />
                          </div>
                          <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>Database Match</span>
                        </div>
                      </div>

                      <div style={{ padding: 16, background: 'var(--bg)', borderRadius: 12, marginBottom: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                          <span style={{ color: 'var(--text-secondary)' }}>Student Name</span>
                          <span style={{ fontWeight: 600 }}>{result.student.name}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                          <span style={{ color: 'var(--text-secondary)' }}>Roll Number</span>
                          <span style={{ fontWeight: 600 }}>{result.student.roll_no}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                          <span style={{ color: 'var(--text-secondary)' }}>Dept/Sec</span>
                          <span style={{ fontWeight: 600 }}>{result.student.department} - {result.student.section}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>Violations Count</span>
                          <span style={{ fontWeight: 600, color: 'var(--accent-red)' }}>{result.student.violations_count || 0}</span>
                        </div>
                      </div>

                      <div style={{ marginBottom: 16 }}>
                        <span className="detect-select-label" style={{ display: 'block', marginBottom: 8 }}>Violation Type</span>
                        <select
                          className="filter-input"
                          style={{ width: '100%' }}
                          value={violationType}
                          onChange={(e) => setViolationType(e.target.value)}
                        >
                          <option value="Late Arrival">Late Arrival</option>
                          <option value="Dress Code">Dress Code</option>
                          <option value="Bunk">Bunk</option>
                        </select>
                      </div>

                      <div style={{ marginBottom: 20 }}>
                        <span className="detect-select-label" style={{ display: 'block', marginBottom: 8 }}>Remarks</span>
                        <input
                          type="text"
                          className="filter-input"
                          style={{ width: '100%' }}
                          value={remarks}
                          onChange={(e) => setRemarks(e.target.value)}
                          placeholder="e.g. Detected via camera"
                        />
                      </div>

                      <button className="btn-premium btn-primary" onClick={handleConfirm}>
                        Log Violation for Student
                      </button>
                    </>
                  ) : (
                    <div className="empty-state-detect" style={{ margin: 'auto' }}>
                      <div className="empty-state-icon" style={{ background: 'var(--accent-red-soft)', color: 'var(--accent-red)' }}>⚠️</div>
                      <h3>No Match Identified</h3>
                      <p style={{ color: 'var(--text-tertiary)', fontSize: 14 }}>
                        {result.message || result.error || "The face could not be correlated securely to any registered student."}
                      </p>
                    </div>
                  )}

                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─────────── VIOLATIONS PAGE ── ─────────
function ViolationsPage({ violations }) {
  const [filterType, setFilterType] = useState('All');
  const [filterLocation, setFilterLocation] = useState('All');
  const [filterDate, setFilterDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

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
    const matchesDate = !filterDate || v.iso_date === filterDate;
    return matchesType && matchesLocation && matchesDate;
  });

  // Calculate pages
  const totalPages = Math.max(1, Math.ceil(filteredViolations.length / itemsPerPage));
  const paginatedViolations = filteredViolations.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Reset page to 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterType, filterLocation, filterDate]);

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
            </tr>
          </thead>
          <tbody>
            {paginatedViolations.map((v, i) => (
              <tr key={v._id || i}>
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
                  {v.date || 'Unknown Date'}
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
          <button
            className="pagination-btn"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
          >
            Previous
          </button>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Page {currentPage} of {totalPages}</span>
          <button
            className="pagination-btn"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
          >
            Next
          </button>
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

// ─────────── SETTINGS SUB-COMPONENTS ───────────
const SettingsToggle = ({ checked, onChange, label, description }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid var(--border-subtle)' }}>
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{label}</div>
      {description && <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 3 }}>{description}</div>}
    </div>
    <div
      onClick={() => onChange(!checked)}
      style={{
        width: 44, height: 24, borderRadius: 12, cursor: 'pointer',
        background: checked ? '#007AFF' : 'var(--border)',
        position: 'relative', transition: 'background 0.25s ease',
        flexShrink: 0, marginLeft: 16,
      }}
    >
      <div style={{
        width: 20, height: 20, borderRadius: '50%', background: '#fff',
        position: 'absolute', top: 2,
        left: checked ? 22 : 2,
        transition: 'left 0.25s ease',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
      }} />
    </div>
  </div>
)

const SettingsSlider = ({ label, description, value, onChange, min, max, unit, step = 1 }) => (
  <div style={{ padding: '16px 0', borderBottom: '1px solid var(--border-subtle)' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
      <div>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{label}</div>
        {description && <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 3 }}>{description}</div>}
      </div>
      <span style={{
        fontSize: 15, fontWeight: 700, color: '#007AFF',
        background: 'rgba(0,122,255,0.1)', padding: '4px 12px', borderRadius: 8,
      }}>
        {value}{unit}
      </span>
    </div>
    <input
      type="range" min={min} max={max} step={step} value={value}
      onChange={e => onChange(Number(e.target.value))}
      style={{
        width: '100%', height: 6, borderRadius: 3,
        appearance: 'none', WebkitAppearance: 'none',
        background: `linear-gradient(to right, #007AFF ${((value - min) / (max - min)) * 100}%, var(--border) ${((value - min) / (max - min)) * 100}%)`,
        outline: 'none', cursor: 'pointer',
      }}
    />
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4 }}>
      <span>{min}{unit}</span>
      <span>{max}{unit}</span>
    </div>
  </div>
)

const SettingsSection = ({ title, icon, children }) => (
  <div style={{
    background: 'var(--surface)', borderRadius: 20, padding: '28px 32px',
    border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)',
    marginBottom: 24,
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid var(--border-subtle)' }}>
      <div style={{
        width: 36, height: 36, borderRadius: 10,
        background: 'rgba(0,122,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#007AFF',
      }}>
        {icon}
      </div>
      <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{title}</h3>
    </div>
    {children}
  </div>
)

const SettingsInput = ({ label, description, value, onChange, type = 'text', placeholder }) => (
  <div style={{ padding: '14px 0', borderBottom: '1px solid var(--border-subtle)' }}>
    <label style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', display: 'block' }}>{label}</label>
    {description && <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 3, marginBottom: 8 }}>{description}</div>}
    <input
      type={type} value={value} placeholder={placeholder}
      onChange={e => onChange(e.target.value)}
      style={{
        width: '100%', padding: '10px 14px', borderRadius: 10,
        border: '1px solid var(--border)', background: 'var(--bg)',
        fontSize: 14, color: 'var(--text-primary)', marginTop: 6,
        outline: 'none', transition: 'border 0.2s', boxSizing: 'border-box',
      }}
    />
  </div>
)

// ─────────── SETTINGS PAGE ───────────
function SettingsPage() {
  const defaultSettings = {
    institutionName: 'KL University',
    institutionCode: 'KLU-2024',
    adminEmail: 'admin@kluniversity.in',
    academicYear: '2025-26',
    violationThreshold: 5,
    lateEntryGrace: 10,
    autoFlagRepeat: true,
    dressCodeEnabled: true,
    bunkDetection: true,
    emailNotify: true,
    smsNotify: false,
    pushNotify: true,
    dailyDigest: true,
    instantAlerts: true,
    weeklyReport: false,
    darkMode: document.documentElement.getAttribute('data-theme') === 'dark',
    compactView: false,
    animationsEnabled: true,
    autoRefresh: true,
    refreshInterval: 30,
  }

  const [settings, setSettings] = useState(() => {
    try {
      const stored = localStorage.getItem('app_settings')
      return stored ? { ...defaultSettings, ...JSON.parse(stored) } : defaultSettings
    } catch { return defaultSettings }
  })
  const [saved, setSaved] = useState(false)
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [isUnlocked, setIsUnlocked] = useState(false)
  const [enteredPin, setEnteredPin] = useState('')
  const [pinError, setPinError] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  const update = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }))
    setHasChanges(true)
    setSaved(false)
  }

  const handleSave = () => {
    localStorage.setItem('app_settings', JSON.stringify(settings))
    setSaved(true)
    setHasChanges(false)
    setTimeout(() => setSaved(false), 2500)
  }

  const handlePinInput = (num) => {
    if (enteredPin.length < 4) {
      const newPin = enteredPin + num
      setEnteredPin(newPin)
      if (newPin.length === 4) {
        if (newPin === '7781') {
          setIsUnlocked(true)
        } else {
          setPinError(true)
          setTimeout(() => {
            setPinError(false)
            setEnteredPin('')
          }, 600)
        }
      }
    }
  }

  const handleBackspace = () => setEnteredPin(prev => prev.slice(0, -1))

  if (!isUnlocked) {
    return (
      <div className="page-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', animation: 'fadeIn 0.4s ease' }}>
        <div style={{
          background: 'var(--surface)', padding: '40px', borderRadius: 24, border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-lg)', width: '100%', maxWidth: 360, textAlign: 'center',
          transform: pinError ? 'translateX(0)' : 'none',
          animation: pinError ? 'shake 0.4s ease-in-out' : 'none'
        }}>
          <div style={{
            width: 60, height: 60, borderRadius: 18, background: 'rgba(0,122,255,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#007AFF',
            margin: '0 auto 24px'
          }}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" style={{ width: 30, height: 30 }}>
              <path fillRule="evenodd" d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 3v6.75a3 3 0 003 3h10.5a3 3 0 003-3v-6.75a3 3 0 00-3-3v-3c0-2.9-2.35-5.25-5.25-5.25zm3.75 8.25v-3a3.75 3.75 0 10-7.5 0v3h7.5z" clipRule="evenodd" />
            </svg>
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 8px' }}>Enter PIN</h2>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 32 }}>Access to Settings is restricted.</p>

          {/* Dots */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginBottom: 40 }}>
            {[0, 1, 2, 3].map(i => (
              <div key={i} style={{
                width: 14, height: 14, borderRadius: '50%',
                background: i < enteredPin.length ? (pinError ? '#FF3B30' : '#007AFF') : 'var(--border)',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                transform: i < enteredPin.length ? 'scale(1.2)' : 'scale(1)'
              }} />
            ))}
          </div>

          {/* Keypad */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
              <button key={num} onClick={() => handlePinInput(num.toString())} className="btn-pin">
                {num}
              </button>
            ))}
            <div />
            <button onClick={() => handlePinInput('0')} className="btn-pin">0</button>
            <button onClick={handleBackspace} className="btn-pin" style={{ color: 'var(--text-secondary)' }}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" style={{ width: 22, height: 22 }}>
                <path fillRule="evenodd" d="M2.515 10.674a1.875 1.875 0 000 2.652L8.89 19.7c.352.351.829.549 1.326.549H19.5a3 3 0 003-3V6.75a3 3 0 00-3-3h-9.284c-.497 0-.974.198-1.326.55l-6.375 6.374zM12.53 9.22a.75.75 0 10-1.06 1.06L13.19 12l-1.72 1.72a.75.75 0 101.06 1.06l1.72-1.72 1.72 1.72a.75.75 0 101.06-1.06L15.31 12l1.72-1.72a.75.75 0 10-1.06-1.06L14.25 10.94l-1.72-1.72z" clipRule="evenodd" />
              </svg>
            </button>
          </div>

          <style>{`
            .btn-pin {
              height: 64px; border-radius: 16px; border: 1px solid var(--border);
              background: var(--bg); color: var(--text-primary);
              font-size: 20px; font-weight: 600; cursor: pointer;
              transition: all 0.2s; display: flex; align-items: center; justify-content: center;
              outline: none;
            }
            .btn-pin:hover { background: var(--surface); transform: translateY(-2px); border-color: #007AFF; }
            .btn-pin:active { transform: translateY(0) scale(0.95); background: rgba(0,122,255,0.05); }
            @keyframes shake {
              0%, 100% { transform: translateX(0); }
              20%, 60% { transform: translateX(-8px); }
              40%, 80% { transform: translateX(8px); }
            }
          `}</style>
        </div>
      </div>
    )
  }

  return (
    <div className="page-content" style={{ animation: 'fadeIn 0.6s ease-out', maxWidth: 720, margin: '0 auto', paddingBottom: 100 }}>

      {/* Page Header */}
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: -0.5 }}>Settings</h2>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>Configure institution preferences, monitoring rules, and system behavior.</p>
      </div>

      {/* Section 1: Institution Profile */}
      <SettingsSection
        title="Institution Profile"
        icon={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" style={{ width: 18, height: 18 }}><path d="M11.584 2.376a.75.75 0 01.832 0l9 6a.75.75 0 01-.832 1.248L12 3.901 3.416 9.624a.75.75 0 01-.832-1.248l9-6z" /><path fillRule="evenodd" d="M20.25 10.332v9.918H21a.75.75 0 010 1.5H3a.75.75 0 010-1.5h.75v-9.918a.75.75 0 01.634-.74A49.109 49.109 0 0112 9c2.59 0 5.134.202 7.616.592a.75.75 0 01.634.74zm-7.5 2.418a.75.75 0 00-1.5 0v6.75a.75.75 0 001.5 0v-6.75zm3-.75a.75.75 0 01.75.75v6.75a.75.75 0 01-1.5 0v-6.75a.75.75 0 01.75-.75zM9 12.75a.75.75 0 00-1.5 0v6.75a.75.75 0 001.5 0v-6.75z" clipRule="evenodd" /></svg>}
      >
        <SettingsInput label="Institution Name" description="Official name displayed across the dashboard" value={settings.institutionName} onChange={v => update('institutionName', v)} />
        <SettingsInput label="Institution Code" description="Unique identifier for reports and exports" value={settings.institutionCode} onChange={v => update('institutionCode', v)} />
        <SettingsInput label="Admin Email" description="Primary contact for system notifications" value={settings.adminEmail} onChange={v => update('adminEmail', v)} type="email" />
        <SettingsInput label="Academic Year" description="Current academic session for all records" value={settings.academicYear} onChange={v => update('academicYear', v)} />
      </SettingsSection>

      {/* Section 2: Monitoring Rules */}
      <SettingsSection
        title="Monitoring Rules"
        icon={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" style={{ width: 18, height: 18 }}><path fillRule="evenodd" d="M12.516 2.17a.75.75 0 00-1.032 0 11.209 11.209 0 01-7.877 3.08.75.75 0 00-.722.515A12.74 12.74 0 002.25 9.75c0 5.942 4.064 10.933 9.563 12.348a.749.749 0 00.374 0c5.499-1.415 9.563-6.406 9.563-12.348 0-1.39-.223-2.73-.635-3.985a.75.75 0 00-.722-.516l-.143.001c-2.996 0-5.717-1.17-7.734-3.08zm3.094 8.016a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" /></svg>}
      >
        <SettingsSlider label="Violation Threshold" description="Maximum violations before a student is flagged critical" value={settings.violationThreshold} onChange={v => update('violationThreshold', v)} min={1} max={15} unit="" />
        <SettingsSlider label="Late Entry Grace Period" description="Minutes after schedule before marking as late" value={settings.lateEntryGrace} onChange={v => update('lateEntryGrace', v)} min={0} max={30} unit=" min" />
        <SettingsToggle label="Auto-Flag Repeat Offenders" description="Automatically escalate students with recurring violations" checked={settings.autoFlagRepeat} onChange={v => update('autoFlagRepeat', v)} />
        <SettingsToggle label="Dress Code Monitoring" description="Enable AI-based dress code violation detection" checked={settings.dressCodeEnabled} onChange={v => update('dressCodeEnabled', v)} />
        <SettingsToggle label="Bunk Detection" description="Track and flag unauthorized absences from classes" checked={settings.bunkDetection} onChange={v => update('bunkDetection', v)} />
      </SettingsSection>

      {/* Section 3: Notifications */}
      <SettingsSection
        title="Notifications"
        icon={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" style={{ width: 18, height: 18 }}><path fillRule="evenodd" d="M5.25 9a6.75 6.75 0 0113.5 0v.75c0 2.123.8 4.057 2.118 5.52a.75.75 0 01-.297 1.206c-1.544.57-3.16.99-4.831 1.243a3.75 3.75 0 11-7.48 0 24.585 24.585 0 01-4.831-1.244.75.75 0 01-.298-1.205A8.217 8.217 0 005.25 9.75V9zm4.502 8.9a2.25 2.25 0 104.496 0 25.057 25.057 0 01-4.496 0z" clipRule="evenodd" /></svg>}
      >
        <SettingsToggle label="Email Notifications" description="Receive violation alerts via email" checked={settings.emailNotify} onChange={v => update('emailNotify', v)} />
        <SettingsToggle label="SMS Notifications" description="Get text message alerts for critical incidents" checked={settings.smsNotify} onChange={v => update('smsNotify', v)} />
        <SettingsToggle label="Push Notifications" description="Browser push alerts for real-time updates" checked={settings.pushNotify} onChange={v => update('pushNotify', v)} />
        <SettingsToggle label="Instant Alerts" description="Receive notifications immediately when violations occur" checked={settings.instantAlerts} onChange={v => update('instantAlerts', v)} />
        <SettingsToggle label="Daily Digest" description="Summary email at end of each day" checked={settings.dailyDigest} onChange={v => update('dailyDigest', v)} />
        <SettingsToggle label="Weekly Report" description="Comprehensive analytics report every Monday" checked={settings.weeklyReport} onChange={v => update('weeklyReport', v)} />
      </SettingsSection>

      {/* Section 4: System Preferences */}
      <SettingsSection
        title="System Preferences"
        icon={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" style={{ width: 18, height: 18 }}><path fillRule="evenodd" d="M11.078 2.25c-.917 0-1.699.663-1.85 1.567L9.05 4.889c-.02.12-.115.26-.297.348a7.493 7.493 0 00-.986.57c-.166.115-.334.126-.45.083L6.3 5.508a1.875 1.875 0 00-2.282.819l-.922 1.597a1.875 1.875 0 00.432 2.385l.84.692c.095.078.17.229.154.43a7.598 7.598 0 000 1.139c.015.2-.059.352-.153.43l-.841.692a1.875 1.875 0 00-.432 2.385l.922 1.597a1.875 1.875 0 002.282.818l1.019-.382c.115-.043.283-.031.45.082.312.214.641.405.985.57.182.088.277.228.297.35l.178 1.071c.151.904.933 1.567 1.85 1.567h1.844c.916 0 1.699-.663 1.85-1.567l.178-1.072c.02-.12.114-.26.297-.349.344-.165.673-.356.985-.57.167-.114.335-.125.45-.082l1.02.382a1.875 1.875 0 002.28-.819l.923-1.597a1.875 1.875 0 00-.432-2.385l-.84-.692c-.095-.078-.17-.229-.154-.43a7.614 7.614 0 000-1.139c-.016-.2.059-.352.153-.43l.84-.692c.708-.582.891-1.59.433-2.385l-.922-1.597a1.875 1.875 0 00-2.282-.818l-1.02.382c-.114.043-.282.031-.449-.083a7.49 7.49 0 00-.985-.57c-.183-.087-.277-.227-.297-.348l-.179-1.072a1.875 1.875 0 00-1.85-1.567h-1.843zM12 15.75a3.75 3.75 0 100-7.5 3.75 3.75 0 000 7.5z" clipRule="evenodd" /></svg>}
      >
        <SettingsToggle label="Compact View" description="Reduce spacing for denser information display" checked={settings.compactView} onChange={v => update('compactView', v)} />
        <SettingsToggle label="Animations" description="Enable smooth transitions and micro-animations" checked={settings.animationsEnabled} onChange={v => update('animationsEnabled', v)} />
        <SettingsToggle label="Auto Refresh" description="Automatically refresh data on dashboard" checked={settings.autoRefresh} onChange={v => update('autoRefresh', v)} />
        {settings.autoRefresh && (
          <SettingsSlider label="Refresh Interval" description="How often to refresh dashboard data" value={settings.refreshInterval} onChange={v => update('refreshInterval', v)} min={10} max={120} unit="s" step={5} />
        )}
      </SettingsSection>

      {/* Danger Zone */}
      <div style={{
        background: 'var(--surface)', borderRadius: 20, padding: '28px 32px',
        border: '1px solid rgba(255,59,48,0.3)', boxShadow: 'var(--shadow-sm)',
        marginBottom: 24,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid rgba(255,59,48,0.15)' }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'rgba(255,59,48,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#FF3B30',
          }}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" style={{ width: 18, height: 18 }}>
              <path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
            </svg>
          </div>
          <h3 style={{ fontSize: 17, fontWeight: 700, color: '#FF3B30', margin: 0 }}>Danger Zone</h3>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid rgba(255,59,48,0.1)' }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Reset All Violations</div>
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 3 }}>Permanently erase all violation records. This cannot be undone.</div>
          </div>
          {!showResetConfirm ? (
            <button
              onClick={() => setShowResetConfirm(true)}
              style={{
                padding: '8px 16px', borderRadius: 10, border: '1px solid rgba(255,59,48,0.4)',
                background: 'transparent', color: '#FF3B30', fontSize: 13, fontWeight: 600,
                cursor: 'pointer', transition: 'all 0.2s', flexShrink: 0, marginLeft: 16,
              }}
              onMouseEnter={e => { e.target.style.background = 'rgba(255,59,48,0.1)' }}
              onMouseLeave={e => { e.target.style.background = 'transparent' }}
            >
              Reset Data
            </button>
          ) : (
            <div style={{ display: 'flex', gap: 8, flexShrink: 0, marginLeft: 16 }}>
              <button
                onClick={() => setShowResetConfirm(false)}
                style={{ padding: '8px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={() => { setShowResetConfirm(false) }}
                style={{ padding: '8px 14px', borderRadius: 10, border: 'none', background: '#FF3B30', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
              >
                Confirm Reset
              </button>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0' }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Delete All Students</div>
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 3 }}>Remove all student profiles and associated data permanently.</div>
          </div>
          <button
            style={{
              padding: '8px 16px', borderRadius: 10, border: '1px solid rgba(255,59,48,0.4)',
              background: 'transparent', color: '#FF3B30', fontSize: 13, fontWeight: 600,
              cursor: 'pointer', transition: 'all 0.2s', flexShrink: 0, marginLeft: 16,
            }}
            onMouseEnter={e => { e.target.style.background = 'rgba(255,59,48,0.1)' }}
            onMouseLeave={e => { e.target.style.background = 'transparent' }}
          >
            Delete All
          </button>
        </div>
      </div>

      {/* Sticky Save Button */}
      <div style={{
        position: 'fixed', bottom: 0, left: 'var(--sidebar-width, 220px)', right: 0,
        padding: '16px 32px',
        background: 'var(--surface)',
        borderTop: '1px solid var(--border)',
        display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 16,
        zIndex: 100,
        transition: 'transform 0.3s ease, opacity 0.3s ease',
        transform: hasChanges || saved ? 'translateY(0)' : 'translateY(100%)',
        opacity: hasChanges || saved ? 1 : 0,
        boxShadow: '0 -4px 20px rgba(0,0,0,0.08)',
      }}>
        {saved && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#34C759', fontSize: 14, fontWeight: 600, animation: 'fadeIn 0.3s ease-out' }}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" style={{ width: 18, height: 18 }}>
              <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
            </svg>
            Settings saved successfully
          </span>
        )}
        {hasChanges && (
          <button
            onClick={handleSave}
            style={{
              padding: '10px 28px', borderRadius: 12, border: 'none',
              background: '#007AFF', color: '#fff', fontSize: 14, fontWeight: 600,
              cursor: 'pointer', transition: 'all 0.2s',
              boxShadow: '0 2px 12px rgba(0,122,255,0.3)',
            }}
            onMouseEnter={e => { e.target.style.transform = 'scale(1.03)' }}
            onMouseLeave={e => { e.target.style.transform = 'scale(1)' }}
          >
            Save Changes
          </button>
        )}
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

      setStudents(sRes.data || [])
      setViolations(realViolations)
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
