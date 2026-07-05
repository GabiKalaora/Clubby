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

type NavItem = { key: View; label: string; sub?: boolean }
type NavGroup = { section?: string; items: NavItem[] }

export function Sidebar({ view, onNavigate, businesses, selected, onSelectBusiness, email, onAddBusiness, onSignOut }: Props) {
  const { t } = useTranslation()

  const NAV_GROUPS: NavGroup[] = [
    {
      items: [
        { key: 'anchor',    label: '🏢 Platform View' },
        { key: 'dashboard', label: t('nav.dashboard') },
      ],
    },
    {
      section: 'LOYALTY',
      items: [
        { key: 'promotions',  label: t('nav.promotions') },
        { key: 'members',     label: t('nav.members') },
        { key: 'stamp_cards', label: t('nav.stampCards') },
        { key: 'tiers',       label: '🏅 Tiers',  sub: true },
        { key: 'points',      label: '⭐ Points',  sub: true },
      ],
    },
    {
      section: 'CONTENT',
      items: [
        { key: 'stories', label: t('nav.stories') },
        { key: 'feed',    label: '📣 Feed Posts' },
      ],
    },
    {
      items: [
        { key: 'settings', label: t('nav.settings') },
        { key: 'qr',       label: t('nav.qrCode') },
      ],
    },
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
        {NAV_GROUPS.map((group, gi) => (
          <div key={gi}>
            {group.section && (
              <p className="nav-section-label">{group.section}</p>
            )}
            {group.items.map(item => (
              <button
                key={item.key}
                className={`nav-item${item.sub ? ' nav-item-sub' : ''} ${view === item.key ? 'active' : ''}`}
                onClick={() => onNavigate(item.key)}
              >
                {item.label}
              </button>
            ))}
          </div>
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

