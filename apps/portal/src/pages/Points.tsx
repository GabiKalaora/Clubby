import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { Business } from '../Portal'

type PointsProgram = {
  id: string
  name: string
  points_per_scan: number
  active: boolean
}

type PointsReward = {
  id: string
  name: string
  points_cost: number
  reward_type: 'free_item' | 'credit' | 'discount'
  reward_value: number | null
  active: boolean
}

const EMPTY_REWARD = { name: '', points_cost: '', reward_type: 'free_item' as const, reward_value: '' }

interface Props { business: Business }

export function Points({ business }: Props) {
  const [program, setProgram] = useState<PointsProgram | null>(null)
  const [rewards, setRewards] = useState<PointsReward[]>([])
  const [loading, setLoading] = useState(true)
  const [savingProgram, setSavingProgram] = useState(false)
  const [programForm, setProgramForm] = useState({ name: 'Points', points_per_scan: '10', active: true })

  const [rewardForm, setRewardForm] = useState(EMPTY_REWARD)
  const [rewardMode, setRewardMode] = useState<'create' | 'edit' | null>(null)
  const [editingRewardId, setEditingRewardId] = useState<string | null>(null)
  const [savingReward, setSavingReward] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: prog } = await (supabase as any)
      .from('points_programs').select('*').eq('business_id', business.id).maybeSingle()
    setProgram(prog ?? null)
    if (prog?.id) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: rews } = await (supabase as any)
        .from('points_rewards').select('*').eq('program_id', prog.id).order('points_cost')
      setRewards(rews ?? [])
    }
    if (prog) setProgramForm({ name: prog.name, points_per_scan: String(prog.points_per_scan), active: prog.active })
    setLoading(false)
  }

  useEffect(() => { load() }, [business.id])

  async function saveProgram(e: React.FormEvent) {
    e.preventDefault()
    setSavingProgram(true)
    const row = { business_id: business.id, name: programForm.name.trim(), points_per_scan: parseInt(programForm.points_per_scan), active: programForm.active }
    if (program) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from('points_programs').update(row).eq('id', program.id)
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from('points_programs').insert(row)
    }
    setSavingProgram(false)
    load()
  }

  async function saveReward(e: React.FormEvent) {
    e.preventDefault()
    if (!program) return
    setError('')
    if (!rewardForm.name.trim()) { setError('Reward name required'); return }
    const cost = parseInt(rewardForm.points_cost as string)
    if (isNaN(cost) || cost <= 0) { setError('Enter a valid point cost'); return }
    setSavingReward(true)
    const row = {
      program_id: program.id, name: rewardForm.name.trim(),
      points_cost: cost, reward_type: rewardForm.reward_type,
      reward_value: rewardForm.reward_value ? parseInt(rewardForm.reward_value as string) : null,
      active: true,
    }
    if (rewardMode === 'edit' && editingRewardId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from('points_rewards').update(row).eq('id', editingRewardId)
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from('points_rewards').insert(row)
    }
    setSavingReward(false)
    setRewardMode(null)
    load()
  }

  async function toggleReward(id: string, active: boolean) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('points_rewards').update({ active }).eq('id', id)
    load()
  }

  async function deleteReward(id: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('points_rewards').delete().eq('id', id)
    load()
  }

  if (loading) return <div className="page-content"><div className="spinner" /></div>

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h2 className="page-title">⭐ Points Program</h2>
          <p className="page-subtitle">{business.name} — earn points on every scan, redeem for rewards</p>
        </div>
      </div>

      {/* Program settings */}
      <div className="card form-card" style={{ marginBottom: 24 }}>
        <h3 style={{ marginBottom: 12 }}>Program Settings</h3>
        <form onSubmit={saveProgram}>
          <div className="form-row">
            <div style={{ flex: 2 }}>
              <label>Program name</label>
              <input value={programForm.name} onChange={e => setProgramForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Coffee Points" />
            </div>
            <div style={{ flex: 1 }}>
              <label>Points per scan</label>
              <input type="number" min="1" value={programForm.points_per_scan}
                onChange={e => setProgramForm(f => ({ ...f, points_per_scan: e.target.value }))} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
            <input type="checkbox" id="prog-active" checked={programForm.active}
              onChange={e => setProgramForm(f => ({ ...f, active: e.target.checked }))}
              style={{ width: 'auto', margin: 0, cursor: 'pointer' }} />
            <label htmlFor="prog-active" style={{ margin: 0, width: 'auto', fontWeight: 400 }}>Program active</label>
          </div>
          <button type="submit" className="btn-primary" style={{ marginTop: 14 }} disabled={savingProgram}>
            {savingProgram ? 'Saving…' : program ? 'Save changes' : 'Create program'}
          </button>
        </form>
      </div>

      {/* Rewards */}
      {program && (
        <>
          <div className="page-header" style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700 }}>Rewards</h3>
            <button className="btn-primary btn-sm" onClick={() => { setRewardForm(EMPTY_REWARD); setEditingRewardId(null); setRewardMode('create'); setError('') }}>
              + Add reward
            </button>
          </div>

          {rewardMode && (
            <div className="card form-card" style={{ marginBottom: 16 }}>
              <h3 style={{ marginBottom: 12 }}>{rewardMode === 'edit' ? 'Edit Reward' : 'New Reward'}</h3>
              <form onSubmit={saveReward}>
                <label>Reward name *</label>
                <input placeholder="e.g. Free coffee" value={rewardForm.name}
                  onChange={e => setRewardForm(f => ({ ...f, name: e.target.value }))} required />

                <div className="form-row">
                  <div style={{ flex: 1 }}>
                    <label>Points cost *</label>
                    <input type="number" min="1" placeholder="e.g. 100" value={rewardForm.points_cost}
                      onChange={e => setRewardForm(f => ({ ...f, points_cost: e.target.value }))} required />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label>Reward type</label>
                    <select value={rewardForm.reward_type}
                      onChange={e => setRewardForm(f => ({ ...f, reward_type: e.target.value as typeof EMPTY_REWARD['reward_type'] }))}>
                      <option value="free_item">Free item</option>
                      <option value="credit">Credit (₪)</option>
                      <option value="discount">Discount (%)</option>
                    </select>
                  </div>
                  {rewardForm.reward_type !== 'free_item' && (
                    <div style={{ flex: 1 }}>
                      <label>{rewardForm.reward_type === 'credit' ? 'Amount (₪)' : 'Discount (%)'}</label>
                      <input type="number" min="1" value={rewardForm.reward_value}
                        onChange={e => setRewardForm(f => ({ ...f, reward_value: e.target.value }))} />
                    </div>
                  )}
                </div>
                {error && <p className="error">{error}</p>}
                <div className="form-row" style={{ marginTop: 12 }}>
                  <button type="submit" className="btn-primary" style={{ flex: 1 }} disabled={savingReward}>
                    {savingReward ? 'Saving…' : rewardMode === 'edit' ? 'Save changes' : 'Add reward'}
                  </button>
                  <button type="button" className="btn-secondary" style={{ flex: 1 }} onClick={() => setRewardMode(null)}>Cancel</button>
                </div>
              </form>
            </div>
          )}

          {rewards.length === 0 ? (
            <div className="empty-state"><p>No rewards yet. Add rewards that customers can redeem with their points.</p></div>
          ) : (
            <div className="card" style={{ padding: 0 }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Reward</th><th>Type</th><th>Cost (pts)</th><th>Status</th><th style={{ width: 120 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {rewards.map(r => (
                    <tr key={r.id}>
                      <td>{r.name}</td>
                      <td className="capitalize">{r.reward_type.replace('_', ' ')}{r.reward_value ? ` (${r.reward_type === 'credit' ? '₪' : ''}${r.reward_value}${r.reward_type === 'discount' ? '%' : ''})` : ''}</td>
                      <td><strong>{r.points_cost}</strong> pts</td>
                      <td><span className={`badge ${r.active ? 'badge-green' : 'badge-gray'}`}>{r.active ? 'Active' : 'Paused'}</span></td>
                      <td>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button className="btn-link" style={{ fontSize: 12 }}
                            onClick={() => { setRewardForm({ name: r.name, points_cost: String(r.points_cost), reward_type: r.reward_type, reward_value: String(r.reward_value ?? '') }); setEditingRewardId(r.id); setRewardMode('edit'); setError('') }}>
                            Edit
                          </button>
                          <button className="btn-link" style={{ fontSize: 12 }}
                            onClick={() => toggleReward(r.id, !r.active)}>
                            {r.active ? 'Pause' : 'Activate'}
                          </button>
                          <button className="btn-link" style={{ fontSize: 12, color: '#dc2626' }}
                            onClick={() => { if (confirm('Delete?')) deleteReward(r.id) }}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}
