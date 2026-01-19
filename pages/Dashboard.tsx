
import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, PieChart, Pie, Legend } from 'recharts';
import { Server, Share2, Activity, AlertTriangle, Cable, Box, History, ShieldCheck } from 'lucide-react';
import { useNetwork } from '../context/NetworkContext';
import { DashboardAnalytics } from '../lib/dashboard-analytics';
import { EquipmentStatus } from '../types';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';

const Dashboard: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const { sites, olts, msans, joints, pcos, splitters, cables, auditLogs } = useNetwork();

  // Aggregate Real Data
  const metrics = useMemo(() => {
    const state = { sites, olts, msans, joints, pcos, splitters, cables, slots: [], ports: [] };
    return {
      totals: DashboardAnalytics.getTotals(state),
      fiber: DashboardAnalytics.getFiberMetrics(state),
      utilization: DashboardAnalytics.getUtilization(state),
      health: DashboardAnalytics.getHealthStatus(state),
      chartData: DashboardAnalytics.getSaturationChartData(state)
    };
  }, [sites, olts, msans, joints, pcos, splitters, cables]);

  // KPI Cards Configuration
  const kpis = [
    { 
      title: t('dashboard.kpi.utilization'), 
      value: `${metrics.utilization.globalUtilization}%`, 
      sub: t('dashboard.kpi.ports_used', { used: metrics.utilization.usedPorts, total: metrics.utilization.totalPorts }), 
      icon: Activity, 
      color: 'text-emerald-600 dark:text-emerald-400', 
      bg: 'bg-emerald-50 dark:bg-slate-950/50',
      border: 'border-emerald-200 dark:border-emerald-500/30' 
    },
    { 
      title: t('dashboard.kpi.active_pcos'), 
      value: metrics.totals.pcos, 
      sub: t('dashboard.kpi.saturated', { count: metrics.utilization.saturatedNodes }), 
      icon: Share2, 
      color: 'text-iam-red dark:text-cyan-400', 
      bg: 'bg-red-50 dark:bg-slate-950/50',
      border: 'border-red-200 dark:border-cyan-500/30' 
    },
    { 
      title: t('dashboard.kpi.fiber_infra'), 
      value: `${metrics.fiber.totalLengthKm.toFixed(2)} km`, 
      sub: t('dashboard.kpi.transport', { km: metrics.fiber.transportKm.toFixed(1) }), 
      icon: Cable, 
      color: 'text-blue-600 dark:text-blue-400', 
      bg: 'bg-blue-50 dark:bg-slate-950/50',
      border: 'border-blue-200 dark:border-blue-500/30' 
    },
    { 
      title: t('dashboard.kpi.incidents'), 
      value: metrics.health.offline + metrics.health.maintenance, 
      sub: t('dashboard.kpi.maintenance_offline'), 
      icon: AlertTriangle, 
      color: 'text-orange-600 dark:text-rose-400', 
      bg: 'bg-orange-50 dark:bg-slate-950/50',
      border: 'border-orange-200 dark:border-rose-500/30' 
    },
  ];

  // Activity Log Data
  const recentActivity = auditLogs.slice(0, 5);

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-8 overflow-y-auto h-full custom-scrollbar">
      <header className="mb-4 md:mb-8 border-b border-slate-200 dark:border-slate-800 pb-6">
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white mb-2 tracking-tight">{t('dashboard.title')}</h1>
        <p className="text-sm md:text-base text-slate-500 dark:text-slate-400 font-medium">{t('dashboard.subtitle')}</p>
      </header>

      {/* 1. KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {kpis.map((kpi, idx) => (
          <div key={idx} className={`glass-panel p-6 rounded-2xl border ${kpi.border} relative overflow-hidden group hover:shadow-lg transition-all duration-300`}>
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <kpi.icon size={64} className="text-slate-900 dark:text-white" />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <div className={`p-2 rounded-lg ${kpi.bg} ${kpi.color}`}>
                  <kpi.icon size={20} />
                </div>
                <span className="text-slate-500 dark:text-slate-400 text-sm font-bold uppercase tracking-wide">{kpi.title}</span>
              </div>
              <div className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white mb-1">{kpi.value}</div>
              <div className="text-xs text-slate-500 font-mono font-medium">{kpi.sub}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* 2. Network Composition (Pie Chart) */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-6 flex items-center gap-2">
            <Box size={20} className="text-purple-600 dark:text-purple-400" /> {t('dashboard.charts.equipment_dist')}
          </h3>
          <div className="flex-1 min-h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: t('dashboard.charts.joints'), value: metrics.totals.joints },
                    { name: t('dashboard.charts.pcos'), value: metrics.totals.pcos },
                    { name: t('dashboard.charts.splitters'), value: metrics.totals.splitters },
                    { name: t('dashboard.charts.olts'), value: metrics.totals.olts },
                  ]}
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {[
                    { fill: '#8b5cf6' }, // Purple
                    { fill: '#10b981' }, // Emerald
                    { fill: '#f59e0b' }, // Amber
                    { fill: theme === 'light' ? '#E30613' : '#3b82f6' } // IAM Red or Blue
                  ].map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip 
                    contentStyle={{ 
                        backgroundColor: theme === 'light' ? '#fff' : '#0f172a', 
                        borderColor: theme === 'light' ? '#e2e8f0' : '#334155', 
                        borderRadius: '8px',
                        color: theme === 'light' ? '#1e293b' : '#f8fafc',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }} 
                />
                <Legend verticalAlign="bottom" height={36} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 3. PCO Saturation Analysis (Bar Chart) */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-6 flex items-center gap-2">
            <Activity size={20} className="text-iam-red dark:text-cyan-400" /> {t('dashboard.charts.pco_saturation')}
          </h3>
          <div className="flex-1 min-h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.chartData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={theme === 'light' ? '#e2e8f0' : '#1e293b'} horizontal={false} />
                <XAxis type="number" stroke={theme === 'light' ? '#64748b' : '#64748b'} fontSize={12} tickLine={false} axisLine={false} />
                <YAxis dataKey="name" type="category" stroke={theme === 'light' ? '#64748b' : '#94a3b8'} fontSize={12} width={100} tickLine={false} axisLine={false} />
                <Tooltip 
                    cursor={{fill: theme === 'light' ? '#f1f5f9' : '#1e293b', opacity: 0.4}} 
                    contentStyle={{ 
                        backgroundColor: theme === 'light' ? '#fff' : '#0f172a', 
                        borderColor: theme === 'light' ? '#e2e8f0' : '#334155',
                        borderRadius: '8px',
                        color: theme === 'light' ? '#1e293b' : '#f8fafc',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }} 
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={24}>
                  {metrics.chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 4. Recent Activity Log */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-700">
        <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <History size={20} className="text-amber-500 dark:text-amber-400" /> {t('dashboard.activity.title')}
            </h3>
            <span className="text-xs font-bold text-iam-red dark:text-slate-500 uppercase tracking-wider bg-red-50 dark:bg-slate-900 px-3 py-1 rounded-full border border-red-100 dark:border-slate-800">
                {t('dashboard.activity.live_audit')}
            </span>
        </div>
        
        <div className="overflow-x-auto">
            <table className="w-full text-left text-sm min-w-[600px]">
                <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                        <th className="pb-3 pl-2 font-bold uppercase text-xs">{t('dashboard.activity.cols.timestamp')}</th>
                        <th className="pb-3 font-bold uppercase text-xs">{t('dashboard.activity.cols.action')}</th>
                        <th className="pb-3 font-bold uppercase text-xs">{t('dashboard.activity.cols.entity')}</th>
                        <th className="pb-3 font-bold uppercase text-xs">{t('dashboard.activity.cols.user')}</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                    {recentActivity.length === 0 ? (
                        <tr>
                            <td colSpan={4} className="py-8 text-center text-slate-500 italic">{t('dashboard.activity.empty')}</td>
                        </tr>
                    ) : (
                        recentActivity.map((log) => (
                            <tr key={log.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                <td className="py-4 pl-2 text-slate-500 dark:text-slate-400 font-mono text-xs whitespace-nowrap">
                                  {new Date(log.timestamp).toLocaleDateString(i18n.language)} <span className="text-slate-300 dark:text-slate-600">|</span> {new Date(log.timestamp).toLocaleTimeString(i18n.language)}
                                </td>
                                <td className="py-4">
                                    <span className={`text-xs font-extrabold px-2.5 py-1 rounded-md border ${
                                        log.action === 'CREATE' ? 'text-emerald-600 bg-emerald-50 border-emerald-100 dark:text-emerald-400 dark:border-emerald-500/20 dark:bg-emerald-500/10' :
                                        log.action === 'DELETE' ? 'text-rose-600 bg-rose-50 border-rose-100 dark:text-rose-400 dark:border-rose-500/20 dark:bg-rose-500/10' :
                                        'text-blue-600 bg-blue-50 border-blue-100 dark:text-blue-400 dark:border-blue-500/20 dark:bg-blue-500/10'
                                    }`}>
                                        {log.action}
                                    </span>
                                </td>
                                <td className="py-4 text-slate-700 dark:text-slate-200 font-medium">
                                    <span className="font-bold">{log.entityType}</span> <span className="text-slate-400 mx-1">•</span> {log.entityName}
                                </td>
                                <td className="py-4 text-slate-500 dark:text-slate-400 flex items-center gap-2">
                                    <ShieldCheck size={14} className="text-slate-400 dark:text-slate-600" /> {log.user}
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
