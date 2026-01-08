// // Re-export the JSX App component. Vite will resolve App.jsx when importing './App'
// export { default } from './App.jsx'
// //         <form onSubmit={submit}>
// //           <div className="form-group">
// //             <label>Username</label>
// //             <input value={username} onChange={(e) => setUsername(e.target.value)} />
// //           </div>
// //           <div className="form-group">
// //             <label>Password</label>
// //             <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
// //           </div>
// //           {isReg && (
// //             <div className="form-group">
// //               <label>Role</label>
// //               <select value={role} onChange={(e) => setRole(e.target.value)} style={{width:'100%',padding:'10px',borderRadius:'8px',border:'1px solid #e5e7eb'}}>
// //                 <option>Admin</option>
// //                 <option>Security</option>
// //                 <option>Faculty</option>
// //               </select>
// //             </div>
// //           )}
// //           {err && <div style={{color:'#ef4444',fontSize:'13px',marginBottom:'12px'}}>{err}</div>}
// //           <button type="submit" className="auth-button">{isReg ? 'Register' : 'Login'}</button>
// //         </form>
// //         <div className="auth-toggle">
// //           {isReg ? 'Have account? ' : 'No account? '}
// //           <button type="button" onClick={() => { setIsReg(!isReg); setErr(''); }}>
// //             {isReg ? 'Login' : 'Register'}
// //           </button>
// //         </div>
// //       </div>
// //     </div>
// //   )
// // }

// function Sidebar({active, setActive, onLogout}) {
//   return (
//     <div className="sidebar">
//       <div className="brand">
//         <div className="logo">🛡</div>
//         <div>
//           <div className="brand-title">AttendGuard</div>
//           <div className="brand-sub">Violation Detection</div>
//         </div>
//       </div>
//       <nav className="nav">
//         <button className={active === 'dashboard' ? 'nav-item active' : 'nav-item'} onClick={() => setActive('dashboard')}>Dashboard</button>
//         <button className={active === 'students' ? 'nav-item active' : 'nav-item'} onClick={() => setActive('students')}>Students</button>
//         <button className={active === 'timetable' ? 'nav-item active' : 'nav-item'} onClick={() => setActive('timetable')}>Timetable</button>
//         <button className={active === 'detect' ? 'nav-item active' : 'nav-item'} onClick={() => setActive('detect')}>Detect Violation</button>
//         <button className={active === 'violations' ? 'nav-item active' : 'nav-item'} onClick={() => setActive('violations')}>Violations</button>
//         <button className={active === 'reports' ? 'nav-item active' : 'nav-item'} onClick={() => setActive('reports')}>Reports</button>
//       </nav>
//       <div className="sidebar-footer">
//         <div className="user">D<span>admin@att.com</span></div>
//         <button className="logout" onClick={onLogout}>Logout</button>
//       </div>
//     </div>
//   )
// }

// function StatCard({title, value, subtitle}) {
//   return (
//     <div className="stat-card">
//       <div className="stat-title">{title}</div>
//       <div className="stat-value">{value}</div>
//       {subtitle && <div className="stat-sub">{subtitle}</div>}
//     </div>
//   )
// }

// function Dashboard({students, violations}) {
//   const totalViolations = violations.length
//   const highRisk = students.filter(s => s.bunk_count >= 5).length
  
//   return (
//     <div className="page">
//       <h2>Dashboard</h2>
//       <p>Monitor attendance violations and student activity</p>
//       <div className="stats">
//         <StatCard title="Total Students" value={students.length.toString()} />
//         <StatCard title="Total Violations" value={totalViolations.toString()} />
//         <StatCard title="Pending Review" value="0" />
//         <StatCard title="High Risk Students" value={highRisk.toString()} subtitle="5+ violations" />
//       </div>
//       <div className="panels">
//         <div className="panel large">
//           <h3>Recent Violations</h3>
//           <div className="panel-content">
//             {violations.length > 0 ? (
//               <ul style={{margin:0,paddingLeft:20,fontSize:'13px'}}>
//                 {violations.slice(-5).reverse().map((v,i) => (
//                   <li key={i}>{v.student_name} at {v.location} ({new Date(v.timestamp).toLocaleString()})</li>
//                 ))}
//               </ul>
//             ) : 'No violations recorded yet'}
//           </div>
//         </div>
//         <div className="panel">
//           <h3>Top Offenders</h3>
//           <div className="panel-content">
//             {students.filter(s => s.bunk_count > 0).sort((a,b) => b.bunk_count - a.bunk_count).slice(0,3).map(s => (
//               <div key={s.student_id} style={{marginBottom:'10px',fontSize:'13px'}}>
//                 <strong>{s.name}</strong><br/>{s.dept} • {s.bunk_count} violations
//               </div>
//             ))}
//           </div>
//         </div>
//       </div>
//     </div>
//   )
// }

// function StudentsPage({students, token, onAdd}) {
//   const [showAdd, setShowAdd] = useState(false)
//   const [form, setForm] = useState({student_id:'', name:'', dept:'', year:'', mobile:''})
//   const [selectedImg, setSelectedImg] = useState(IMAGES[0])

//   const add = async (e) => {
//     e.preventDefault()
//     if (!form.student_id || !form.name) {
//       alert('Fill all fields'); return
//     }
//     // For demo: map to an image from IMAGES
//     const fd = new FormData()
//     Object.keys(form).forEach(k => fd.append(k, form[k]))
//     fd.append('image', selectedImg)
    
//     const res = await fetch('http://localhost:5000/students', {
//       method: 'POST',
//       headers: { 'Authorization': `Bearer ${token}` },
//       body: fd
//     })
//     if (res.ok) {
//       onAdd()
//       setForm({student_id:'', name:'', dept:'', year:'', mobile:''})
//       setShowAdd(false)
//     }
//   }

//   return (
//     <div className="page">
//       <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'24px'}}>
//         <div>
//           <h2>Students</h2>
//           <p>{students.length} students registered</p>
//         </div>
//         <button className="primary" onClick={() => setShowAdd(true)}>+ Add Student</button>
//       </div>
//       <div className="students-grid">
//         {students.map(s => (
//           <div className="student-card" key={s.student_id}>
//             <div className="student-top">
//               <img src={`http://localhost:5000/design/${encodeURIComponent(s.image)}`} alt={s.name} />
//               <div className="student-info">
//                 <div className="student-name">{s.name}</div>
//                 <div className="student-id">{s.student_id}</div>
//                 <div className="student-meta">{s.dept} • {s.year} Year</div>
//               </div>
//             </div>
//             <div className="student-bottom">
//               <div>📞 {s.mobile}</div>
//               <div className="bunks">⚠ {s.bunk_count} bunks</div>
//             </div>
//           </div>
//         ))}
//       </div>

//       {showAdd && (
//         <div className="modal" onClick={() => setShowAdd(false)}>
//           <div className="modal-content" onClick={(e) => e.stopPropagation()}>
//             <button className="modal-close" onClick={() => setShowAdd(false)}>×</button>
//             <h2>Add Student</h2>
//             <form onSubmit={add}>
//               <div className="form-group">
//                 <label>Student ID</label>
//                 <input value={form.student_id} onChange={(e) => setForm({...form, student_id:e.target.value})} />
//               </div>
//               <div className="form-group">
//                 <label>Name</label>
//                 <input value={form.name} onChange={(e) => setForm({...form, name:e.target.value})} />
//               </div>
//               <div className="form-group">
//                 <label>Department</label>
//                 <input value={form.dept} onChange={(e) => setForm({...form, dept:e.target.value})} />
//               </div>
//               <div className="form-group">
//                 <label>Year</label>
//                 <input value={form.year} onChange={(e) => setForm({...form, year:e.target.value})} />
//               </div>
//               <div className="form-group">
//                 <label>Mobile</label>
//                 <input value={form.mobile} onChange={(e) => setForm({...form, mobile:e.target.value})} />
//               </div>
//               <div className="form-group">
//                 <label>Select Image</label>
//                 <select value={selectedImg} onChange={(e) => setSelectedImg(e.target.value)} style={{width:'100%',padding:'10px'}}>
//                   {IMAGES.map(img => <option key={img}>{img}</option>)}
//                 </select>
//               </div>
//               <button type="submit" className="primary">Add</button>
//             </form>
//           </div>
//         </div>
//       )}
//     </div>
//   )
// }

// function Timetable({timetable}) {
//   const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
//   const byDay = {}
//   days.forEach(d => byDay[d] = [])
//   timetable.forEach(t => { if (byDay[t.day]) byDay[t.day].push(t) })

//   return (
//     <div className="page">
//       <h2>Class Timetable</h2>
//       <p>{timetable.length} classes scheduled</p>
//       {days.map(day => (
//         <div key={day} style={{marginBottom:'24px'}}>
//           <h3 style={{background:'var(--accent-dark)',color:'white',padding:'12px',borderRadius:'8px'}}>{day}</h3>
//           {byDay[day].length > 0 ? (
//             <div style={{paddingTop:'12px'}}>
//               {byDay[day].map((t, i) => (
//                 <div key={i} style={{padding:'12px',border:'1px solid var(--border)',marginBottom:'8px',borderRadius:'8px'}}>
//                   <div><strong>{t.subject || 'Class'}</strong> • {t.start} - {t.end}</div>
//                   <div style={{fontSize:'13px',color:'var(--muted)',marginTop:'4px'}}>👨‍🏫 {t.faculty} • 📍 {t.room || 'Room TBD'}</div>
//                 </div>
//               ))}
//             </div>
//           ) : <div style={{color:'var(--muted)',fontSize:'13px'}}>No classes scheduled</div>}
//         </div>
//       ))}
//     </div>
//   )
// }

// function Detect({onDetect}) {
//   const [file, setFile] = useState(null)
//   const [location, setLocation] = useState('')
//   const [result, setResult] = useState(null)

//   const submit = async (e) => {
//     e.preventDefault()
//     if (!file) return
//     const fd = new FormData()
//     fd.append('image', file)
//     fd.append('location', location)
//     const res = await fetch('http://localhost:5000/match', { method: 'POST', body: fd })
//     const j = await res.json()
//     setResult(j)
//     onDetect()
//   }

//   return (
//     <div className="page">
//       <h2>Detect Violation</h2>
//       <p>Upload captured image to identify bunking students</p>
//       <div className="detect-grid">
//         <form className="detect-box" onSubmit={submit}>
//           <h3>Capture & Identify Student</h3>
//           <div className="upload-area">
//             📷<br/>
//             <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files[0])} style={{display:'none'}} id="fileInput" />
//             <label htmlFor="fileInput" style={{cursor:'pointer',textDecoration:'underline'}}>Choose Image</label>
//           </div>
//           <input placeholder="Location (where student was found)" value={location} onChange={(e) => setLocation(e.target.value)} />
//           <button type="submit" className="primary">Identify Student</button>
//         </form>
//         <div className="detect-result">
//           {result ? (
//             <>
//               {result.match ? (
//                 <div>
//                   <h4>✓ Match Found</h4>
//                   <div><strong>{result.match.name}</strong></div>
//                   <div>{result.match.student_id}</div>
//                   <div>{result.match.dept}</div>
//                   <div style={{marginTop:'8px',fontSize:'12px',color:'var(--muted)'}}>Confidence: {(result.confidence * 100).toFixed(0)}%</div>
//                 </div>
//               ) : (
//                 <div>
//                   <h4>✗ No Match Found</h4>
//                   <div style={{fontSize:'13px',color:'var(--muted)'}}>Confidence: {(result.confidence * 100).toFixed(0)}%</div>
//                 </div>
//               )}
//             </>
//           ) : 'Upload an image to see identification results'}
//         </div>
//       </div>
//     </div>
//   )
// }

// function Violations({violations}) {
//   return (
//     <div className="page">
//       <h2>Violations</h2>
//       <p>{violations.length} total violations recorded</p>
//       {violations.length > 0 ? (
//         <div className="students-grid">
//           {violations.map((v, i) => (
//             <div className="student-card" key={i}>
//               <div style={{padding:'12px'}}>
//                 <div className="student-name">{v.student_name}</div>
//                 <div className="student-id">{v.student_id}</div>
//                 <div className="student-meta">{v.dept}</div>
//                 <div style={{fontSize:'12px',color:'var(--muted)',marginTop:'8px'}}>📍 {v.location}</div>
//                 <div style={{fontSize:'12px',color:'var(--muted)'}}>🕐 {new Date(v.timestamp).toLocaleString()}</div>
//                 <div style={{fontSize:'12px',color:'var(--muted)'}}>✓ {(v.confidence * 100).toFixed(0)}% confident</div>
//               </div>
//             </div>
//           ))}
//         </div>
//       ) : <div style={{color:'var(--muted)'}}>No violations found</div>}
//     </div>
//   )
// }

// function Reports({students, violations}) {
//   const getByDept = () => {
//     const by = {}
//     violations.forEach(v => {
//       by[v.dept] = (by[v.dept] || 0) + 1
//     })
//     return by
//   }
//   const byDept = getByDept()

//   return (
//     <div className="page">
//       <h2>Reports</h2>
//       <div className="panels">
//         <div className="panel">
//           <h3>Violations Trend (Last 7 Days)</h3>
//           <div style={{fontSize:'13px',color:'var(--muted)',height:'200px',display:'flex',alignItems:'center',justifyContent:'center'}}>
//             📊 Chart placeholder
//           </div>
//         </div>
//         <div className="panel">
//           <h3>Violations by Department</h3>
//           <ul style={{margin:0,paddingLeft:20,fontSize:'13px'}}>
//             {Object.entries(byDept).map(([dept, count]) => (
//               <li key={dept}>{dept}: {count} violations</li>
//             ))}
//           </ul>
//         </div>
//       </div>
//     </div>
//   )
// }

// export default function App() {
//   const [token, setToken] = useState(localStorage.getItem('token') || '')
//   const [active, setActive] = useState('dashboard')
//   const [students, setStudents] = useState([])
//   const [violations, setViolations] = useState([])
//   const [timetable, setTimetable] = useState([])

//   const loadData = async () => {
//     try {
//       const [s, v, t] = await Promise.all([
//         fetch('http://localhost:5000/students').then(r => r.json()),
//         fetch('http://localhost:5000/violations').then(r => r.json()),
//         fetch('http://localhost:5000/timetable').then(r => r.json())
//       ])
//       setStudents(s)
//       setViolations(v)
//       setTimetable(t)
//     } catch (e) {
//       console.error(e)
//     }
//   }

//   useEffect(() => {
//     if (token) loadData()
//   }, [token])

//   if (!token) {
//     return <LoginPage onLogin={(t) => { setToken(t); loadData() }} />
//   }
// }

//   // return (
//   //   <div className="app">
//   //     <Sidebar active={active} setActive={setActive} onLogout={() => { localStorage.removeItem('token'); setToken('') }} />
//   //     <div className="main">
//   //       {active === 'dashboard' && <Dashboard students={students} violations={violations} />}
//   //       {active === 'students' && <StudentsPage students={students} token={token} onAdd={loadData} />}
//   //       {active === 'timetable' && <Timetable timetable={timetable} />}
//   //       {active === 'detect' && <Detect onDetect={loadData} />}
//   //       {active === 'violations' && <Violations violations={violations} />}
//   //       {active === 'reports' && <Reports students={students} violations={violations} />}
