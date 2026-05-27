import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Business } from '../Portal'

interface Stats {
  member_count: number
  active_promotions: number
  total_benefits: number
  redeemed_benefits: number
}

interface Props { business: Business }

export function Dashboard({ business }: Props) {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    supabase
      .rpc('get_business_stats', { p_business_id: business.id })
      .single()
      .then(({ data }) => {
        setStats(data as Stats ?? null)
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
        <div className="stats-grid">
          <StatCard icon="👥" label="Total Members"      value={stats?.member_count ?? 0}      color="green" />
          <StatCard icon="🎁" label="Active Promotions"  value={stats?.active_promotions ?? 0} color="blue"  />
          <StatCard icon="🏷️" label="Benefits Issued"    value={stats?.total_benefits ?? 0}    color="amber" />
          <StatCard icon="✅" label="Redemption Rate"    value={`${redemptionRate}%`}           color="teal"  />
        </div>
      )}

      {!loading && stats && (
        <div className="dashboard-tip card" style={{ marginTop: 24 }}>
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
    </div>
  )
}

function StatCard({ icon, label, value, color }: {
  icon: string; label: string; value: number | string; color: string
}) {
  return (
    <div className={`stat-card stat-${color}`}>
      <span className="stat-icon">{icon}</span>
      <div>
        <p className="stat-value">{value}</p>
        <p className="stat-label">{label}</p>
      </div>
    </div>
  )
}
