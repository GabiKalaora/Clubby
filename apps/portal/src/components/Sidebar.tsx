import { useTranslation } from 'react-i18next'
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

export function Sidebar({ view, onNavigate, businesses, selected, onSelectBusiness, email, onAddBusiness, onSignOut }: Props) {
  const { t } = useTranslation()

  const NAV: { key: View; label: string; icon: string }[] = [
    { key: 'anchor',      label: '🏢 Platform View', icon: '' },
    { key: 'dashboard',   label: t('nav.dashboard'),  icon: '📊' },
    { key: 'promotions',  label: t('nav.promotions'),  icon: '🎁' },
    { key: 'members',     label: t('nav.members'),     icon: '👥' },
    { key: 'stamp_cards', label: t('nav.stampCards'),  icon: '🥇' },
    { key: 'tiers',       label: '🏅 Tiers',           icon: '' },
    { key: 'points',      label: '⭐ Points',           icon: '' },
    { key: 'stories',     label: t('nav.stories'),     icon: '📖' },
    { key: 'feed',        label: '📣 Feed Posts',       icon: '' },
    { key: 'settings',    label: t('nav.settings'),    icon: '⚙️' },
    { key: 'qr',          label: t('nav.qrCode'),      icon: '📱' },
  ]

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <img src="/wordmark.png" alt="Clubby" style={{ height: 32, objectFit: 'contain' }} />
      </div>

      {/* Business selector */}
      {businesses.length > 0 && (
        <div className="sidebar-section">
          <p className="sidebar-label">{t('sidebar.business')}</p>
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
          <button className="btn-add-biz" onClick={onAddBusiness}>{t('sidebar.addBusiness')}</button>
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
        <button className="btn-signout" onClick={onSignOut}>{t('sidebar.signOut')}</button>
      </div>
    </aside>
  )
}
