import { useEffect, useState } from 'react'
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
  const [stats, setStats]   = useState<Stats | null>(null)
  const [growth, setGrowth] = useState<GrowthPoint[]>([])
  const [trend, setTrend]   = useState<TrendPoint[]>([])
  const [loading, setLoading] = useState(true)

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
      <h2 className="page-title">Dashboard</h2>
      <p className="page-subtitle">{business.name}</p>

      {loading ? (
        <div className="spinner" />
      ) : (
        <>
          {/* Stat cards */}
          <div className="stats-grid">
            <StatCard icon="👥" label="Total Members"     value={stats?.member_count ?? 0}      accent="#2ecc71" />
            <StatCard icon="🎁" label="Active Promotions" value={stats?.active_promotions ?? 0} accent="#6366f1" />
            <StatCard icon="🏷️" label="Benefits Issued"   value={stats?.total_benefits ?? 0}    accent="#f59e0b" />
            <StatCard icon="📈" label="Redemption Rate"   value={`${redemptionRate}%`}           accent="#10b981" />
          </div>

          {/* Charts */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 24 }}>
            <div className="chart-card">
              <p className="chart-title">New Members — last 30 days</p>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={growth} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="day" tick={{ fontSize: 10 }} interval={6} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
                    formatter={(v: number) => [v, 'New members']}
                  />
                  <Line
                    type="monotone" dataKey="new_members" stroke="#2ecc71"
                    strokeWidth={2} dot={false} activeDot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-card">
              <p className="chart-title">Daily Redemptions — last 30 days</p>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={trend} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="day" tick={{ fontSize: 10 }} interval={6} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
                    formatter={(v: number) => [v, 'Redemptions']}
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
                  ? '👋 No members yet. Share your QR code to get your first members!'
                  : stats.active_promotions === 0
                  ? '💡 Add a promotion — members who scan your QR will receive a welcome benefit.'
                  : `🎉 Great! ${stats.member_count} member${stats.member_count !== 1 ? 's' : ''} in your club.`
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
