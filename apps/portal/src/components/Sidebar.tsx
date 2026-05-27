import type { Business, View } from '../Portal'

interface Props {
  view: View
  onNavigate: (v: View) => void
  businesses: Business[]
  selected: Business | null
  onSelectBusiness: (b: Business) => void
  email: string
  onAddBusiness: () => void
  onSignOut: () => void
}

const NAV: { key: View; label: string; icon: string }[] = [
  { key: 'dashboard',  label: 'Dashboard',   icon: '📊' },
  { key: 'promotions', label: 'Promotions',  icon: '🎁' },
  { key: 'members',    label: 'Members',     icon: '👥' },
  { key: 'stories',    label: 'Stories',     icon: '📖' },
  { key: 'settings',   label: 'Settings',    icon: '⚙️' },
  { key: 'qr',         label: 'QR Code',     icon: '📱' },
]

export function Sidebar({ view, onNavigate, businesses, selected, onSelectBusiness, email, onAddBusiness, onSignOut }: Props) {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <span className="sidebar-logo">🏪</span>
        <span className="sidebar-brand">Clubby</span>
      </div>

      {/* Business selector */}
      {businesses.length > 0 && (
        <div className="sidebar-section">
          <p className="sidebar-label">Business</p>
          <select
            className="biz-select"
            value={selected?.id ?? ''}
            onChange={e => {
              const biz = businesses.find(b => b.id === e.target.value)
              if (biz) onSelectBusiness(biz)
            }}
          >
            {businesses.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
          <button className="btn-add-biz" onClick={onAddBusiness}>+ Add business</button>
        </div>
      )}

      {/* Navigation */}
      <nav className="sidebar-nav">
        {NAV.map(item => (
          <button
            key={item.key}
            className={`nav-item ${view === item.key ? 'active' : ''}`}
            onClick={() => onNavigate(item.key)}
          >
            <span className="nav-icon">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <p className="sidebar-email" title={email}>{email}</p>
        <button className="btn-signout" onClick={onSignOut}>Sign out</button>
      </div>
    </aside>
  )
}
