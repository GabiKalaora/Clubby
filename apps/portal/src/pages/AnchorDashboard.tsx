import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from 'recharts'

interface PlatformStats {
  total_businesses: number
  total_members: number
  total_benefits: number
  redeemed_benefits: number
  total_memberships: number
  businesses_by_category: { category: string; count: number }[]
}

interface GrowthPoint {
  day: string
  new_users: number
  new_memberships: number
}

interface TopBusiness {
  business_id: string
  business_name: string
  category: string | null
  member_count: number
  benefit_count: number
  redemption_rate: number
}

function shortDate(iso: string) {
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()}`
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

export function AnchorDashboard() {
  useTranslation()
  const [stats, setStats] = useState<PlatformStats | null>(null)
  const [growth, setGrowth] = useState<GrowthPoint[]>([])
  const [topBusinesses, setTopBusinesses] = useState<TopBusiness[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    setLoading(true)
    setLoadError(false)
    Promise.all([
      (supabase as any).rpc('get_platform_stats').single(),
      (supabase as any).rpc('get_platform_growth'),
      (supabase as any).rpc('get_top_businesses', { p_limit: 10 }),
    ]).then(([statsRes, growthRes, topRes]: any[]) => {
      setStats((statsRes.data as PlatformStats) ?? null)
      setGrowth(((growthRes.data ?? []) as GrowthPoint[]).map((p: GrowthPoint) => ({
        ...p,
        day: shortDate(p.day),
      })))
      setTopBusinesses((topRes.data ?? []) as TopBusiness[])
      setLoading(false)
    }).catch(() => {
      setLoadError(true)
      setLoading(false)
    })
  }, [])

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h2 className="page-title">Platform Analytics</h2>
          <p className="page-subtitle">Real-time view across all businesses</p>
        </div>
      </div>

      {loading ? (
        <div className="spinner" />
      ) : loadError ? (
        <div className="alert-error" style={{ marginTop: 24 }}>
          Failed to load platform analytics. Please refresh the page.
        </div>
      ) : (
        <>
          {/* Stat cards */}
          <div className="stats-grid">
            <StatCard icon="🏢" label="Total Businesses" value={stats?.total_businesses ?? 0}      accent="#6366f1" />
            <StatCard icon="👥" label="Total Members"    value={stats?.total_members ?? 0}          accent="#2ecc71" />
            <StatCard icon="🎁" label="Total Benefits"   value={stats?.total_benefits ?? 0}        accent="#f59e0b" />
            <StatCard icon="📈" label="Redemption Rate"
              value={stats && stats.total_benefits > 0
                ? `${Math.round(stats.redeemed_benefits / stats.total_benefits * 100)}%`
                : '0%'}
              accent="#10b981" />
          </div>

          {/* Charts */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 24 }}>
            <div className="chart-card">
              <p className="chart-title">New Users — last 30 days</p>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={growth} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="day" tick={{ fontSize: 10 }} interval={6} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
                    formatter={(v: number) => [v, 'New Users']}
                  />
                  <Line
                    type="monotone" dataKey="new_users" stroke="#2ecc71"
                    strokeWidth={2} dot={false} activeDot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-card">
              <p className="chart-title">New Memberships — last 30 days</p>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={growth} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="day" tick={{ fontSize: 10 }} interval={6} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
                    formatter={(v: number) => [v, 'New Memberships']}
                  />
                  <Line
                    type="monotone" dataKey="new_memberships" stroke="#6366f1"
                    strokeWidth={2} dot={false} activeDot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top businesses table */}
          <div className="card" style={{ marginTop: 24 }}>
            <p className="chart-title" style={{ marginBottom: 12 }}>Top Businesses by Member Count</p>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Business</th>
                  <th>Category</th>
                  <th>Members</th>
                  <th>Benefits</th>
                  <th>Redemption Rate</th>
                </tr>
              </thead>
              <tbody>
                {topBusinesses.map((biz, idx) => (
                  <tr key={biz.business_id}>
                    <td style={{ fontWeight: 600, color: '#6366f1' }}>#{idx + 1}</td>
                    <td style={{ fontWeight: 500 }}>{biz.business_name}</td>
                    <td>{biz.category ?? '—'}</td>
                    <td>{biz.member_count.toLocaleString()}</td>
                    <td>{biz.benefit_count.toLocaleString()}</td>
                    <td>{biz.redemption_rate}%</td>
                  </tr>
                ))}
                {topBusinesses.length === 0 && (
                  <tr key="empty">
                    <td colSpan={6} style={{ textAlign: 'center', color: '#94a3b8', padding: '24px 0' }}>
                      No data available yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Footer note */}
          <div className="dashboard-tip card" style={{ marginTop: 20 }}>
            <p className="hint">
              Data updates in real time. All businesses on the Clubby platform.
            </p>
          </div>
        </>
      )}
    </div>
  )
}
