import React, { useState, useEffect } from 'react'
import axios from 'axios'
import './App.css'

const API = 'http://localhost:5000'

// Login Component
function LoginPage({ onLogin }) {
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('admin')
  const [isReg, setIsReg] = useState(false)
  const [role, setRole] = useState('Admin')
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (isReg) {
        await axios.post(`${API}/auth/register`, { username, password, role })
        setError('Account created! Try logging in.')
        setIsReg(false)
      } else {
        const res = await axios.post(`${API}/auth/login`, { username, password })
        localStorage.setItem('token', res.data.token)
        onLogin(res.data.token)
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Error')
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-box">
        <div className="auth-header">
          <div className="logo-large">🛡</div>
          <h1>AttendGuard</h1>
          <p>Attendance Violation Detection System</p>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Username</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
            />
          </div>
          {isReg && (
            <div className="form-group">
              <label>Role</label>
              <select value={role} onChange={(e) => setRole(e.target.value)}>
                <option>Admin</option>
                <option>Security</option>
                <option>Faculty</option>
              </select>
            </div>
          )}
          {error && <div className="error-msg">{error}</div>}
          <button type="submit" className="primary" style={{ width: '100%' }}>
            {isReg ? 'Create Account' : 'Login'}
          </button>
        </form>
        <div className="auth-toggle">
          {isReg ? 'Have account? ' : 'No account? '}
          <button
            type="button"
            onClick={() => {
              setIsReg(!isReg)
              setError('')
            }}
            style={{ background: 'none', color: 'var(--blue)', padding: 0, textDecoration: 'underline' }}
          >
            {isReg ? 'Login' : 'Register'}
          </button>
        </div>
      </div>
    </div>
  )
}

// Sidebar
function Sidebar({ active, setActive, onLogout }) {
  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <div className="logo">🛡</div>
        <div>
          <div className="app-name">AttendGuard</div>
          <div className="app-sub">Detection System</div>
        </div>
      </div>
      <nav className="nav">
        {[
          { id: 'dashboard', label: 'Dashboard' },
          { id: 'students', label: 'Students' },
          { id: 'timetable', label: 'Timetable' },
          { id: 'detect', label: 'Detect Violation' },
          { id: 'violations', label: 'Violations' },
          { id: 'reports', label: 'Reports' },
        ].map((item) => (
          <button
            key={item.id}
            className={`nav-item ${active === item.id ? 'active' : ''}`}
            onClick={() => setActive(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>
      <div className="sidebar-footer">
        <div className="user-info">admin@att.com</div>
        <button className="logout-btn" onClick={onLogout}>
          Logout
        </button>
      </div>
    </div>
  )
}

// Dashboard
function Dashboard({ students, violations }) {
  const highRisk = students.filter((s) => s.bunk_count >= 5).length
  return (
    <div className="page">
      <h2>Dashboard</h2>
      <p className="page-sub">Monitor attendance violations and student activity</p>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total Students</div>
          <div className="stat-value">{students.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Violations</div>
          <div className="stat-value">{violations.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Pending Review</div>
          <div className="stat-value">0</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">High Risk Students</div>
          <div className="stat-value">{highRisk}</div>
          <div className="stat-sub">5+ violations</div>
        </div>
      </div>
      <div className="panels">
        <div className="panel">
          <h3>Recent Violations</h3>
          {violations.length > 0 ? (
            <ul className="violation-list">
              {violations.slice(0, 5).map((v, i) => (
                <li key={i}>
                  <strong>{v.student_name}</strong> at {v.location}
                  <br />
                  <small>{new Date(v.timestamp).toLocaleString()}</small>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">No violations recorded yet</p>
          )}
        </div>
        <div className="panel">
          <h3>Top Offenders</h3>
          {students
            .filter((s) => s.bunk_count > 0)
            .sort((a, b) => b.bunk_count - a.bunk_count)
            .slice(0, 3)
            .map((s) => (
              <div key={s.student_id} className="offender-item">
                <strong>{s.name}</strong>
                <br />
                <small>{s.dept} • {s.bunk_count} violations</small>
              </div>
            ))}
        </div>
      </div>
    </div>
  )
}

// Students Page
function StudentsPage({ students, token, onRefresh }) {
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ student_id: '', name: '', dept: '', year: '', mobile: '' })
  const [file, setFile] = useState(null)

  const handleAdd = async (e) => {
    e.preventDefault()
    try {
      const fd = new FormData()
      Object.entries(form).forEach(([k, v]) => fd.append(k, v))
      if (file) fd.append('image', file)

      const headers = { Authorization: `Bearer ${token}` }
      await axios.post(`${API}/students`, fd, { headers })
      setForm({ student_id: '', name: '', dept: '', year: '', mobile: '' })
      setFile(null)
      setShowModal(false)
      onRefresh()
    } catch (err) {
      alert(err.response?.data?.error || 'Error adding student')
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>Students</h2>
          <p className="page-sub">{students.length} students registered</p>
        </div>
        <button className="primary" onClick={() => setShowModal(true)}>
          + Add Student
        </button>
      </div>
      <div className="students-grid">
        {students.map((s) => (
          <div className="student-card" key={s.student_id}>
            <img src={`${API}/storage/${s.image}`} alt={s.name} className="student-img" />
            <div className="student-info">
              <div className="student-name">{s.name}</div>
              <div className="student-id">{s.student_id}</div>
              <div className="student-meta">{s.dept} • Year {s.year}</div>
              <div className="student-contact">📞 {s.mobile}</div>
              <div className="bunks-badge">⚠ {s.bunk_count} bunks</div>
            </div>
          </div>
        ))}
      </div>
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Add Student</h3>
            <form onSubmit={handleAdd}>
              <div className="form-group">
                <label>Student ID</label>
                <input
                  value={form.student_id}
                  onChange={(e) => setForm({ ...form, student_id: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Name</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Department</label>
                <input
                  value={form.dept}
                  onChange={(e) => setForm({ ...form, dept: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Year</label>
                <input
                  value={form.year}
                  onChange={(e) => setForm({ ...form, year: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Mobile</label>
                <input
                  value={form.mobile}
                  onChange={(e) => setForm({ ...form, mobile: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Image</label>
                <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files[0])} />
              </div>
              <button type="submit" className="primary" style={{ width: '100%' }}>
                Add Student
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

// Timetable Page
function TimetablePage({ timetable }) {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
  const byDay = {}
  days.forEach((d) => (byDay[d] = []))
  timetable.forEach((t) => {
    if (byDay[t.day]) byDay[t.day].push(t)
  })

  return (
    <div className="page">
      <h2>Class Timetable</h2>
      <p className="page-sub">{timetable.length} classes scheduled</p>
      {days.map((day) => (
        <div key={day} className="day-section">
          <h3>{day}</h3>
          {byDay[day].length > 0 ? (
            <div className="classes-list">
              {byDay[day].map((t, i) => (
                <div key={i} className="class-item">
                  <div className="class-time">
                    {t.start} - {t.end}
                  </div>
                  <div className="class-details">
                    <strong>{t.subject}</strong>
                    <br />
                    <small>👨‍🏫 {t.faculty} • 📍 {t.room}</small>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted">No classes scheduled</p>
          )}
        </div>
      ))}
    </div>
  )
}

// Detect Violation Page
function DetectPage({ onDetect }) {
  const [file, setFile] = useState(null)
  const [location, setLocation] = useState('')
  const [result, setResult] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!file) return alert('Select an image')
    const fd = new FormData()
    fd.append('image', file)
    fd.append('location', location)
    try {
      const res = await axios.post(`${API}/match`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setResult(res.data)
      onDetect()
    } catch (err) {
      console.error('Match error:', err.response?.data || err.message)
      alert(`Error: ${err.response?.data?.error || 'Failed to match image'}`)
    }
  }

  return (
    <div className="page">
      <h2>Detect Violation</h2>
      <p className="page-sub">Upload captured image to identify bunking students</p>
      <div className="detect-grid">
        <form className="detect-form" onSubmit={handleSubmit}>
          <h3>Capture & Identify</h3>
          <div className="upload-box">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setFile(e.target.files[0])}
              id="fileInput"
              style={{ display: 'none' }}
            />
            <label htmlFor="fileInput" className="upload-label">
              📷 Choose Image
            </label>
            {file && <p className="selected-file">Selected: {file.name}</p>}
          </div>
          <input
            placeholder="Location (where student was found)"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
          <button type="submit" className="primary" style={{ width: '100%' }}>
            Identify Student
          </button>
        </form>
        <div className="detect-result">
          {result ? (
            <>
              {result.match ? (
                <div className="match-found">
                  <h4>✓ Match Found</h4>
                  <img src={`${API}/storage/${result.match.image}`} alt={result.match.name} />
                  <div>
                    <strong>{result.match.name}</strong>
                    <br />
                    {result.match.student_id}
                    <br />
                    {result.match.dept}
                  </div>
                  <div className="confidence">Confidence: {(result.confidence * 100).toFixed(0)}%</div>
                </div>
              ) : (
                <div className="no-match">
                  <h4>✗ No Match Found</h4>
                  <p>Confidence: {(result.confidence * 100).toFixed(0)}%</p>
                </div>
              )}
            </>
          ) : (
            <p className="muted">Upload an image to see identification results</p>
          )}
        </div>
      </div>
    </div>
  )
}

// Violations Page
function ViolationsPage({ violations }) {
  return (
    <div className="page">
      <h2>Violations</h2>
      <p className="page-sub">{violations.length} total violations recorded</p>
      {violations.length > 0 ? (
        <div className="violations-grid">
          {violations.map((v, i) => (
            <div className="violation-card" key={i}>
              <div className="violation-header">
                <strong>{v.student_name}</strong>
                <small>{v.student_id}</small>
              </div>
              <div className="violation-body">
                <div>📍 {v.location}</div>
                <div>🕐 {new Date(v.timestamp).toLocaleString()}</div>
                <div>{v.dept}</div>
                <div className="confidence-small">✓ {(v.confidence * 100).toFixed(0)}%</div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="muted">No violations found</p>
      )}
    </div>
  )
}

// Reports Page
function ReportsPage({ students, violations }) {
  const byDept = {}
  violations.forEach((v) => {
    byDept[v.dept] = (byDept[v.dept] || 0) + 1
  })

  return (
    <div className="page">
      <h2>Reports</h2>
      <div className="reports-grid">
        <div className="panel">
          <h3>Violations by Department</h3>
          {Object.entries(byDept).length > 0 ? (
            <ul>
              {Object.entries(byDept).map(([dept, count]) => (
                <li key={dept}>
                  {dept}: <strong>{count}</strong>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">No data</p>
          )}
        </div>
        <div className="panel">
          <h3>Student Statistics</h3>
          <div>
            <div>Total Students: <strong>{students.length}</strong></div>
            <div>Students with violations: <strong>{students.filter((s) => s.bunk_count > 0).length}</strong></div>
            <div>
              High-risk (5+ bunks):<strong>{students.filter((s) => s.bunk_count >= 5).length}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Main App
export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '')
  const [active, setActive] = useState('dashboard')
  const [students, setStudents] = useState([])
  const [violations, setViolations] = useState([])
  const [timetable, setTimetable] = useState([])

  const loadData = async () => {
    try {
      const [s, v, t] = await Promise.all([
        axios.get(`${API}/students`),
        axios.get(`${API}/violations`),
        axios.get(`${API}/timetable`),
      ])
      setStudents(s.data)
      setViolations(v.data)
      setTimetable(t.data)
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    if (token) {
      loadData()
      const interval = setInterval(loadData, 10000) // Refresh every 10s
      return () => clearInterval(interval)
    }
  }, [token])

  if (!token) {
    return <LoginPage onLogin={(t) => { setToken(t); loadData() }} />
  }

  return (
    <div className="app">
      <Sidebar active={active} setActive={setActive} onLogout={() => { localStorage.removeItem('token'); setToken('') }} />
      <div className="main">
        {active === 'dashboard' && <Dashboard students={students} violations={violations} />}
        {active === 'students' && <StudentsPage students={students} token={token} onRefresh={loadData} />}
        {active === 'timetable' && <TimetablePage timetable={timetable} />}
        {active === 'detect' && <DetectPage onDetect={loadData} />}
        {active === 'violations' && <ViolationsPage violations={violations} />}
        {active === 'reports' && <ReportsPage students={students} violations={violations} />}
      </div>
    </div>
  )
}
