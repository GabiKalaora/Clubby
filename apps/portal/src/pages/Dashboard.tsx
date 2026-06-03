import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import type { Business } from '../Portal'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from 'recharts'

interface Stats {
  member_count: number
  active_promotions: number
  total_benefits: number
  redeemed_benefits: number
}

interface GrowthPoint { day: string; new_members: number }
interface TrendPoint  { day: string; redeemed: number }

interface Props { business: Business }

function shortDate(iso: string) {
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

export function Dashboard({ business }: Props) {
  const { t } = useTranslation()
  const [stats, setStats]   = useState<Stats | null>(null)
  const [growth, setGrowth] = useState<GrowthPoint[]>([])
  const [trend, setTrend]   = useState<TrendPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)

  async function handleExport() {
    setExporting(true)
    const { data, error } = await supabase.rpc('get_benefits_export' as never, { p_business_id: business.id })
    setExporting(false)
    if (error || !data) return

    const rows = data as { created_at: string; member_name: string | null; phone: string | null; title: string; type: string; value: string; source: string; redeemed: boolean; redeemed_at: string | null }[]
    const header = 'Date,Member Name,Phone,Benefit Title,Type,Value,Source,Redeemed,Redeemed At'
    const csv = [header, ...rows.map(r => [
      new Date(r.created_at).toLocaleDateString(),
      `"${(r.member_name ?? '').replace(/"/g, '""')}"`,
      `"${(r.phone ?? '').replace(/"/g, '""')}"`,
      `"${r.title.replace(/"/g, '""')}"`,
      r.type,
      r.value,
      r.source,
      r.redeemed ? 'Yes' : 'No',
      r.redeemed_at ? new Date(r.redeemed_at).toLocaleDateString() : '',
    ].join(','))].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${business.name.replace(/\s+/g, '_')}_analytics_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  useEffect(() => {
    setLoading(true)
    Promise.all([
      supabase.rpc('get_business_stats', { p_business_id: business.id }).single(),
      supabase.rpc('get_member_growth',    { p_business_id: business.id }),
      supabase.rpc('get_redemption_trend', { p_business_id: business.id }),
    ]).then(([statsRes, growthRes, trendRes]) => {
      setStats((statsRes.data as Stats) ?? null)
      setGrowth(((growthRes.data ?? []) as GrowthPoint[]).map(p => ({ ...p, day: shortDate(p.day) })))
      setTrend(((trendRes.data ?? []) as TrendPoint[]).map(p => ({ ...p, day: shortDate(p.day) })))
      setLoading(false)
    })
  }, [business.id])

  const redemptionRate = stats && stats.total_benefits > 0
    ? Math.round((stats.redeemed_benefits / stats.total_benefits) * 100)
    : 0

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h2 className="page-title">{t('dashboard.title')}</h2>
          <p className="page-subtitle">{business.name}</p>
        </div>
        <button className="btn-secondary btn-sm" onClick={handleExport} disabled={exporting}>
          {exporting ? 'Exporting…' : '⬇️ Export Analytics'}
        </button>
      </div>

      {loading ? (
        <div className="spinner" />
      ) : (
        <>
          {/* Stat cards */}
          <div className="stats-grid">
            <StatCard icon="👥" label={t('dashboard.totalMembers')}     value={stats?.member_count ?? 0}      accent="#2ecc71" />
            <StatCard icon="🎁" label={t('dashboard.activePromotions')} value={stats?.active_promotions ?? 0} accent="#6366f1" />
            <StatCard icon="🏷️" label={t('dashboard.benefitsIssued')}   value={stats?.total_benefits ?? 0}    accent="#f59e0b" />
            <StatCard icon="📈" label={t('dashboard.redemptionRate')}   value={`${redemptionRate}%`}           accent="#10b981" />
          </div>

          {/* Charts */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 24 }}>
            <div className="chart-card">
              <p className="chart-title">{t('dashboard.newMembersChart')}</p>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={growth} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="day" tick={{ fontSize: 10 }} interval={6} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
                    formatter={(v: number) => [v, t('dashboard.newMembers')]}
                  />
                  <Line
                    type="monotone" dataKey="new_members" stroke="#2ecc71"
                    strokeWidth={2} dot={false} activeDot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-card">
              <p className="chart-title">{t('dashboard.dailyRedemptionsChart')}</p>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={trend} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="day" tick={{ fontSize: 10 }} interval={6} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
                    formatter={(v: number) => [v, t('dashboard.redemptions')]}
                  />
                  <Bar dataKey="redeemed" fill="#6366f1" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {stats && (
            <div className="dashboard-tip card" style={{ marginTop: 20 }}>
              <p className="hint">
                {stats.member_count === 0
                  ? t('dashboard.tipNoMembers')
                  : stats.active_promotions === 0
                  ? t('dashboard.tipNoPromotions')
                  : t('dashboard.tipGreat', { count: stats.member_count })
                }
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function StatCard({ icon, label, value, accent }: {
  icon: string; label: string; value: number | string; accent: string
}) {
  return (
    <div className="stat-card" style={{ borderTop: `3px solid ${accent}` }}>
      <span className="stat-icon" style={{
        background: `${accent}18`,
        borderRadius: 10,
        width: 40, height: 40,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 20,
      }}>{icon}</span>
      <div>
        <p className="stat-value" style={{ color: accent }}>{value}</p>
        <p className="stat-label">{label}</p>
      </div>
    </div>
  )
}
