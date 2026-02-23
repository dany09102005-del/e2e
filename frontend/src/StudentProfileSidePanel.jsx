import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X,
    AlertTriangle,
    Clock,
    Shirt,
    ArrowRight,
    Calendar,
    Award,
    Zap,
    Bell,
    MessageSquare,
    MoreHorizontal,
    ChevronRight,
    ShieldCheck,
    TrendingUp,
    PieChart as PieChartIcon,
    BarChart3
} from 'lucide-react';
import { Line, Doughnut, Bar } from 'react-chartjs-2';

const StudentProfileSidePanel = ({ student, isOpen, onClose, dark }) => {
    const [activeTab, setActiveTab] = useState('overview');

    // Chart options that dynamically adapt to theme
    const getChartColors = () => ({
        text: dark ? '#8E8E93' : '#86868B',
        grid: dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
        accent: '#007AFF',
    });

    const chartColors = getChartColors();

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    // Updated Monthly Violations Trend Data
    const monthlyTrendData = {
        labels: months,
        datasets: [{
            label: 'Violations',
            data: [2, 5, 3, 8, 4, 6, 2, 9, 3, 5, 2, 4],
            borderColor: '#007AFF',
            backgroundColor: (ctx) => {
                const gradient = ctx.chart.ctx.createLinearGradient(0, 0, 0, 400);
                gradient.addColorStop(0, 'rgba(0, 122, 255, 0.15)');
                gradient.addColorStop(1, 'rgba(0, 122, 255, 0)');
                return gradient;
            },
            fill: true,
            tension: 0.4,
            borderWidth: 3,
            pointRadius: 4,
            pointBackgroundColor: '#007AFF',
            pointBorderColor: dark ? '#1C1C1E' : '#FFFFFF',
            pointBorderWidth: 2,
            pointHoverRadius: 7,
        }]
    };

    const trendOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: dark ? '#2C2C2E' : '#FFFFFF',
                titleColor: dark ? '#F2F2F7' : '#1D1D1F',
                bodyColor: dark ? '#8E8E93' : '#86868B',
                padding: 12,
                cornerRadius: 12,
                displayColors: false,
                borderWidth: 1,
                borderColor: 'rgba(0,0,0,0.1)'
            }
        },
        scales: {
            x: {
                grid: { display: false },
                ticks: { color: chartColors.text, font: { size: 11 } }
            },
            y: {
                grid: { color: chartColors.grid, drawBorder: false },
                ticks: { color: chartColors.text, font: { size: 11 }, stepSize: 2 },
                beginAtZero: true
            }
        }
    };

    const violationBreakdownData = {
        labels: ['Late', 'Dress', 'Bunk'],
        datasets: [{
            data: [12, 5, 3],
            backgroundColor: ['#007AFF', '#AF52DE', '#FF3B30'],
            borderWidth: 0,
            hoverOffset: 4
        }]
    };

    const donutOptions = {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '75%',
        plugins: { legend: { display: false } }
    };


    const getRiskColor = (level) => {
        switch (level?.toLowerCase()) {
            case 'high': return 'var(--accent-red)';
            case 'medium': return 'var(--accent-orange)';
            default: return 'var(--accent-green)';
        }
    };

    const getRiskBg = (level) => {
        switch (level?.toLowerCase()) {
            case 'high': return 'var(--accent-red-soft)';
            case 'medium': return 'var(--accent-orange-soft)';
            default: return 'var(--accent-green-soft)';
        }
    };

    if (!student) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    className="side-panel-overlay"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                >
                    <motion.div
                        className="side-panel"
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="side-panel-content">
                            {/* Close Button */}
                            <button
                                className="btn-premium btn-ghost"
                                onClick={onClose}
                                style={{ position: 'absolute', top: 20, right: 20, padding: 8, borderRadius: '50%' }}
                            >
                                <X size={24} />
                            </button>

                            {/* SECTION 1 – PROFILE HEADER */}
                            <header className="profile-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 20 }}>
                                <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
                                    <img
                                        src={`https://i.pravatar.cc/150?u=${student.roll_no}`}
                                        alt={student.name}
                                        style={{ width: 120, height: 120, borderRadius: '50%', objectFit: 'cover', border: '4px solid var(--surface)', boxShadow: 'var(--shadow-lg)' }}
                                    />
                                    <div>
                                        <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 4 }}>{student.name}</h1>
                                        <p style={{ color: 'var(--text-secondary)', fontSize: 18, marginBottom: 8, fontWeight: 500 }}>{student.roll_no}</p>
                                        <div style={{ display: 'flex', gap: 8, color: 'var(--text-secondary)', fontSize: 14 }}>
                                            <span>B.Tech</span>
                                            <span style={{ opacity: 0.3 }}>•</span>
                                            <span>{student.dept || 'CSE'}</span>
                                            <span style={{ opacity: 0.3 }}>•</span>
                                            <span>Sem 6</span>
                                            <span style={{ opacity: 0.3 }}>•</span>
                                            <span>Sec A</span>
                                        </div>
                                        <div style={{ marginTop: 16 }}>
                                            <span style={{
                                                padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600,
                                                background: getRiskBg(student.risk || 'Low'), color: getRiskColor(student.risk || 'Low')
                                            }}>
                                                {student.violation_count > 5 ? 'Critical Status' : student.violation_count > 2 ? 'Warning Status' : 'Clean Status'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: 40, background: 'var(--surface)', padding: '20px 32px', borderRadius: 24, boxShadow: 'var(--shadow-md)' }}>
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ fontSize: 24, fontWeight: 700 }}>{student.violation_count || 0}</div>
                                        <div style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 1, marginTop: 4 }}>Total</div>
                                    </div>
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ fontSize: 24, fontWeight: 700 }}>{Math.floor((student.violation_count || 0) / 2)}</div>
                                        <div style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 1, marginTop: 4 }}>Monthly</div>
                                    </div>
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ fontSize: 14, fontWeight: 600, marginTop: 8 }}>{student.violation_count > 0 ? 'Oct 24, 2023' : 'None'}</div>
                                        <div style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 1, marginTop: 4 }}>Last Violation</div>
                                    </div>
                                </div>
                            </header>

                            {/* SECTION 2 – MONTHLY VIOLATIONS TREND */}
                            <div className="premium-card" style={{ padding: '32px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
                                    <div>
                                        <h3 style={{ fontSize: 18, fontWeight: 700 }}>Monthly Violations Trend</h3>
                                        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>System-wide compliance monitoring over the past year</p>
                                    </div>
                                    <TrendingUp size={20} color="var(--accent-blue)" />
                                </div>
                                <div style={{ height: 250 }}>
                                    <Line data={monthlyTrendData} options={trendOptions} />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, alignItems: 'center' }}>
                                {/* SECTION 3 – VIOLATION BREAKDOWN */}
                                <div className="premium-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                                    <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
                                        <h3 style={{ fontSize: 16, fontWeight: 700 }}>Violation Breakdown</h3>
                                        <PieChartIcon size={18} color="var(--accent-purple)" />
                                    </div>
                                    <div style={{ height: 180, width: 180, position: 'relative' }}>
                                        <Doughnut data={violationBreakdownData} options={donutOptions} />
                                        <div style={{
                                            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                                            textAlign: 'center'
                                        }}>
                                            <div style={{ fontSize: 24, fontWeight: 700 }}>{student.violation_count || 20}</div>
                                            <div style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Total</div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: 16, marginTop: 24, fontSize: 12, color: 'var(--text-secondary)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#007AFF' }}></div> Late Arrivals
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#AF52DE' }}></div> Dress Code
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#FF3B30' }}></div> Bunk
                                        </div>
                                    </div>
                                </div>

                                {/* SECTION 4 – VIOLATION TIMELINE */}
                                <div className="premium-card">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
                                        <h3 style={{ fontSize: 16, fontWeight: 700 }}>Violation Timeline</h3>
                                        <Calendar size={18} color="var(--accent-orange)" />
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, position: 'relative', paddingLeft: 20 }}>
                                        <div style={{
                                            position: 'absolute', left: 4, top: 0, bottom: 0, width: 2,
                                            background: 'var(--border)', borderRadius: 1
                                        }}></div>

                                        {[
                                            { date: 'Oct 12, 2023', type: 'Late Arrival', color: 'var(--accent-blue)', desc: '15 mins late for morning session' },
                                            { date: 'Sep 28, 2023', type: 'Dress Code', color: 'var(--accent-purple)', desc: 'Improper uniform in lab' },
                                            { date: 'Sep 05, 2023', type: 'Bunk', color: 'var(--accent-red)', desc: 'Absent from electronics lecture' },
                                        ].map((item, i) => (
                                            <div
                                                key={i}
                                                style={{
                                                    padding: '12px 0',
                                                    display: 'flex', gap: 16, alignItems: 'flex-start'
                                                }}
                                            >
                                                <div style={{
                                                    width: 10, height: 10, borderRadius: '50%', background: item.color,
                                                    marginTop: 4, marginLeft: -24, border: '2px solid var(--surface)', zIndex: 1,
                                                    boxShadow: '0 0 0 4px var(--bg)'
                                                }}></div>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                                                        <span style={{ fontWeight: 600, fontSize: 14 }}>{item.type}</span>
                                                        <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{item.date}</span>
                                                    </div>
                                                    <p style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{item.desc}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* SECTION 5 – ACTION CONTROLS */}
                            <div style={{
                                marginTop: 'auto', paddingTop: 32, borderTop: '1px solid var(--border)',
                                display: 'flex', gap: 16
                            }}>
                                <button className="btn-premium btn-primary" style={{ flex: 1 }}>
                                    <Bell size={18} /> Issue Warning
                                </button>
                                <button className="btn-premium btn-secondary" style={{ flex: 1 }}>
                                    <MessageSquare size={18} /> Add Remark
                                </button>
                                <button className="btn-premium btn-danger" style={{ flex: 1, justifyContent: 'center' }}>
                                    Escalate Case
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default StudentProfileSidePanel;
