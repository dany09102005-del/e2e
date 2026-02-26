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
import axios from 'axios';

const API = 'http://localhost:5001';
const apiClient = axios.create({ baseURL: API });
apiClient.interceptors.request.use(config => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

const typeColorMap = {
    'Late Arrival': { color: '#007AFF', label: 'Late Arrivals' },
    'Dress Code': { color: '#AF52DE', label: 'Dress Code' },
    'Bunk': { color: '#FF3B30', label: 'Bunk' },
};
const fallbackColors = ['#FF9500', '#34C759', '#5856D6', '#FF2D55'];

const StudentProfileSidePanel = ({ student, isOpen, onClose, dark }) => {
    const [activeTab, setActiveTab] = useState('overview');
    const [analytics, setAnalytics] = useState(null);
    const [analyticsLoading, setAnalyticsLoading] = useState(false);

    // Fetch real analytics whenever student changes
    useEffect(() => {
        if (student?.roll_no && isOpen) {
            setAnalyticsLoading(true);
            setAnalytics(null);
            apiClient.get(`/api/students/${student.roll_no}/analytics`)
                .then(res => {
                    setAnalytics(res.data.data);
                    setAnalyticsLoading(false);
                })
                .catch(err => {
                    console.error("Profile analytics fetch failed", err);
                    setAnalyticsLoading(false);
                });
        }
    }, [student, isOpen]);

    // Chart options that dynamically adapt to theme
    const getChartColors = () => ({
        text: dark ? '#8E8E93' : '#86868B',
        grid: dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
        accent: '#007AFF',
    });

    const chartColors = getChartColors();

    // --- Dynamic Monthly Trend Data ---
    const monthlyLabels = analytics?.monthly_counts?.labels || [];
    const monthlyValues = analytics?.monthly_counts?.data || [];

    const monthlyTrendData = {
        labels: monthlyLabels,
        datasets: [{
            label: 'Violations',
            data: monthlyValues,
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

    // --- Dynamic Donut Breakdown ---
    const breakdownEntries = analytics ? Object.entries(analytics.breakdown) : [];
    const donutLabels = breakdownEntries.map(([type]) => type);
    const donutValues = breakdownEntries.map(([, count]) => count);
    const donutColors = donutLabels.map((type, i) =>
        typeColorMap[type]?.color || fallbackColors[i % fallbackColors.length]
    );
    const donutTotal = donutValues.reduce((sum, v) => sum + v, 0);

    const violationBreakdownData = {
        labels: donutLabels,
        datasets: [{
            data: donutValues,
            backgroundColor: donutColors,
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

    // --- Dynamic Timeline ---
    const timeline = analytics?.timeline || [];

    // --- Last Violation Date ---
    const lastViolationDate = timeline.length > 0 ? timeline[0].date : 'None';

    // --- Monthly average ---
    const monthlyAvg = analytics ? Math.round(donutTotal / Math.max(monthlyLabels.filter((_, i) => monthlyValues[i] > 0).length, 1)) : 0;


    const getRiskColor = (count) => {
        if (count === 0) return 'var(--accent-green)';
        if (count < 3) return 'var(--accent-blue)';
        if (count < 7) return 'var(--accent-orange)';
        return 'var(--accent-red)';
    };

    const getRiskBg = (count) => {
        if (count === 0) return 'var(--accent-green-soft)';
        if (count < 3) return 'var(--accent-blue-soft, rgba(0,122,255,0.1))';
        if (count < 7) return 'var(--accent-orange-soft)';
        return 'var(--accent-red-soft)';
    };

    const getTimelineColor = (type) => {
        return typeColorMap[type]?.color || 'var(--accent-orange)';
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
                                        src={`${API}/api/students/${student.roll_no}/image`}
                                        onError={(e) => { e.target.src = `https://ui-avatars.com/api/?name=${student.name}&background=random` }}
                                        alt={student.name}
                                        style={{ width: 120, height: 120, borderRadius: '50%', objectFit: 'cover', border: '4px solid var(--surface)', boxShadow: 'var(--shadow-lg)' }}
                                    />
                                    <div>
                                        <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 4 }}>{student.name}</h1>
                                        <p style={{ color: 'var(--text-secondary)', fontSize: 18, marginBottom: 8, fontWeight: 500 }}>{student.roll_no}</p>
                                        <div style={{ display: 'flex', gap: 8, color: 'var(--text-secondary)', fontSize: 14 }}>
                                            <span>B.Tech</span>
                                            <span style={{ opacity: 0.3 }}>•</span>
                                            <span>{student.department || student.dept || 'CSE'}</span>
                                            <span style={{ opacity: 0.3 }}>•</span>
                                            <span>Sec {student.section || 'A'}</span>
                                        </div>
                                        <div style={{ marginTop: 16 }}>
                                            <span style={{
                                                padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600,
                                                background: getRiskBg(student.violation_count || 0), color: getRiskColor(student.violation_count || 0)
                                            }}>
                                                {(student.violation_count || 0) === 0 ? 'Clean' : (student.violation_count || 0) < 3 ? 'Low Risk' : (student.violation_count || 0) < 7 ? 'Medium' : 'High Risk'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: 40, background: 'var(--surface)', padding: '20px 32px', borderRadius: 24, boxShadow: 'var(--shadow-md)' }}>
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ fontSize: 24, fontWeight: 700 }}>{analytics?.total ?? (student.violation_count || 0)}</div>
                                        <div style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 1, marginTop: 4 }}>Total</div>
                                    </div>
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ fontSize: 24, fontWeight: 700 }}>{monthlyAvg}</div>
                                        <div style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 1, marginTop: 4 }}>Monthly</div>
                                    </div>
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ fontSize: 14, fontWeight: 600, marginTop: 8 }}>{lastViolationDate}</div>
                                        <div style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 1, marginTop: 4 }}>Last Violation</div>
                                    </div>
                                </div>
                            </header>

                            {/* Loading State */}
                            {analyticsLoading ? (
                                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '60px 0' }}>
                                    <div style={{ width: 36, height: 36, border: '3px solid var(--accent-blue)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                                </div>
                            ) : analytics && analytics.total === 0 ? (
                                /* Empty State */
                                <div className="premium-card" style={{ padding: 48, textAlign: 'center' }}>
                                    <ShieldCheck size={48} color="var(--accent-green)" style={{ marginBottom: 16 }} />
                                    <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>No Violations Recorded</h3>
                                    <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
                                        This student has a clean disciplinary record. All charts reflect zero violations.
                                    </p>
                                </div>
                            ) : (
                                <>
                                    {/* SECTION 2 – MONTHLY VIOLATIONS TREND */}
                                    <div className="premium-card" style={{ padding: '32px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
                                            <div>
                                                <h3 style={{ fontSize: 18, fontWeight: 700 }}>Monthly Violations Trend</h3>
                                                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>Student-specific compliance over the past year</p>
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
                                                    <div style={{ fontSize: 24, fontWeight: 700 }}>{donutTotal}</div>
                                                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Total</div>
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', gap: 16, marginTop: 24, fontSize: 12, color: 'var(--text-secondary)', flexWrap: 'wrap', justifyContent: 'center' }}>
                                                {donutLabels.map((label, i) => (
                                                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: donutColors[i] }}></div>
                                                        {label} ({donutValues[i]})
                                                    </div>
                                                ))}
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

                                                {timeline.length === 0 ? (
                                                    <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-tertiary)', fontSize: 13 }}>
                                                        No violations on record.
                                                    </div>
                                                ) : (
                                                    timeline.map((item, i) => (
                                                        <div
                                                            key={item.id || i}
                                                            style={{
                                                                padding: '12px 0',
                                                                display: 'flex', gap: 16, alignItems: 'flex-start'
                                                            }}
                                                        >
                                                            <div style={{
                                                                width: 10, height: 10, borderRadius: '50%', background: getTimelineColor(item.type),
                                                                marginTop: 4, marginLeft: -24, border: '2px solid var(--surface)', zIndex: 1,
                                                                boxShadow: '0 0 0 4px var(--bg)'
                                                            }}></div>
                                                            <div style={{ flex: 1 }}>
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                                                                    <span style={{ fontWeight: 600, fontSize: 14 }}>{item.type}</span>
                                                                    <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{item.date}</span>
                                                                </div>
                                                                <p style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{item.remark}</p>
                                                            </div>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}

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
