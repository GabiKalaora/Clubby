import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import { Sidebar } from './components/Sidebar'
import { BusinessForm } from './components/BusinessForm'
import { Dashboard } from './pages/Dashboard'
import { Promotions } from './pages/Promotions'
import { Members } from './pages/Members'
import { QRPage } from './pages/QRPage'
import { Stories } from './pages/Stories'
import { StampCards } from './pages/StampCards'
import { Settings } from './pages/Settings'

export type DayHours = { open: string; close: string }
export type OpeningHours = Partial<Record<'mon'|'tue'|'wed'|'thu'|'fri'|'sat'|'sun', DayHours>>

export type Business = {
  id: string
  name: string
  category: string | null
  description: string | null
  address: string | null
  phone: string | null
  logo_url: string | null
  qr_code_token: string
  webhook_url: string | null
  webhook_secret: string | null
  opening_hours: OpeningHours | null
}

export type View = 'dashboard' | 'promotions' | 'members' | 'qr' | 'stories' | 'stamp_cards' | 'settings'

interface Props {
  userId: string
  email: string
}

export function Portal({ userId, email }: Props) {
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [selected, setSelected] = useState<Business | null>(null)
  const [view, setView] = useState<View>('dashboard')
  const [loading, setLoading] = useState(true)
  const [showNewBiz, setShowNewBiz] = useState(false)

  useEffect(() => {
    supabase
      .from('businesses')
      .select('id, name, category, description, address, phone, logo_url, qr_code_token, webhook_url, webhook_secret, opening_hours')
      .eq('owner_id', userId)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        const bizList = (data ?? []) as Business[]
        setBusinesses(bizList)
        setSelected(bizList[0] ?? null)
        setShowNewBiz(bizList.length === 0)
        setLoading(false)
      })
  }, [userId])

  function handleBusinessCreated(name: string, token: string, id: string) {
    const biz: Business = { id, name, category: null, description: null, address: null, phone: null, logo_url: null, qr_code_token: token }
    setBusinesses(prev => [...prev, biz])
    setSelected(biz)
    setShowNewBiz(false)
    setView('qr')
  }

  function handleBusinessUpdated(updated: Business) {
    setBusinesses(prev => prev.map(b => b.id === updated.id ? updated : b))
    setSelected(updated)
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
  }

  if (loading) {
    return (
      <div className="page">
        <div className="spinner" />
      </div>
    )
  }

  if (showNewBiz) {
    return (
      <BusinessForm
        ownerId={userId}
        onCreated={handleBusinessCreated}
        onCancel={businesses.length > 0 ? () => setShowNewBiz(false) : undefined}
      />
    )
  }

  return (
    <div className="app-layout">
      <Sidebar
        view={view}
        onNavigate={setView}
        businesses={businesses}
        selected={selected}
        onSelectBusiness={setSelected}
        email={email}
        onAddBusiness={() => setShowNewBiz(true)}
        onSignOut={handleSignOut}
      />
      <main className="main-content">
        {selected && view === 'dashboard'   && <Dashboard   business={selected} />}
        {selected && view === 'promotions'  && <Promotions  business={selected} />}
        {selected && view === 'members'     && <Members     business={selected} />}
        {selected && view === 'stories'     && <Stories     business={selected} />}
        {selected && view === 'stamp_cards' && <StampCards  business={selected} />}
        {selected && view === 'settings'    && <Settings    business={selected} onUpdated={handleBusinessUpdated} />}
        {selected && view === 'qr'          && <QRPage      business={selected} />}
        {!selected && (
          <div className="empty-state">
            <p>Select or create a business to get started.</p>
          </div>
        )}
      </main>
    </div>
  )
}
