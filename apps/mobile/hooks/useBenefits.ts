import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export type Benefit = {
  id: string
  user_id: string
  business_id: string
  promotion_id: string | null
  type: 'credit' | 'discount' | 'free_item'
  title: string
  description: string | null
  amount_cents: number | null
  discount_percent: number | null
  free_item_description: string | null
  expires_at: string | null
  redeemed: boolean
  redeemed_at: string | null
  source: string | null
  verified: boolean
  created_at: string
  // joined from businesses
  businesses?: { name: string; logo_url: string | null } | null
}

export type NewBenefit = {
  business_name: string
  type: 'credit' | 'discount' | 'free_item'
  title: string
  description?: string
  amount_cents?: number
  discount_percent?: number
  free_item_description?: string
  expires_at?: string
}

async function fetchBenefits(userId: string): Promise<Benefit[]> {
  const { data, error } = await supabase
    .from('benefits')
    .select('*, businesses(name, logo_url)')
    .eq('user_id', userId)
    .eq('redeemed', false)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as Benefit[]
}

export function useBenefits(userId: string | undefined) {
  const qc = useQueryClient()

  // Realtime sync: any INSERT or UPDATE on this user's benefits invalidates both caches
  useEffect(() => {
    if (!userId) return
    const channel = supabase
      .channel(`benefits:${userId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'benefits',
        filter: `user_id=eq.${userId}`,
      }, () => {
        qc.invalidateQueries({ queryKey: ['benefits', userId] })
        qc.invalidateQueries({ queryKey: ['benefits-all', userId] })
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [userId, qc])

  return useQuery({
    queryKey: ['benefits', userId],
    queryFn: () => fetchBenefits(userId!),
    enabled: !!userId,
    staleTime: 30_000,
  })
}

export function useAllBenefits(userId: string | undefined) {
  return useQuery({
    queryKey: ['benefits-all', userId],
    queryFn: async (): Promise<Benefit[]> => {
      const { data, error } = await supabase
        .from('benefits')
        .select('*, businesses(name, logo_url)')
        .eq('user_id', userId!)
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as Benefit[]
    },
    enabled: !!userId,
    staleTime: 30_000,
  })
}

export function useRedeemBenefit() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ benefitId, userId }: { benefitId: string; userId: string }) => {
      const { error } = await supabase
        .from('benefits')
        .update({ redeemed: true, redeemed_at: new Date().toISOString() })
        .eq('id', benefitId)
        .eq('user_id', userId)

      if (error) throw error
    },
    onMutate: async ({ benefitId, userId }) => {
      await queryClient.cancelQueries({ queryKey: ['benefits', userId] })
      const previous = queryClient.getQueryData<Benefit[]>(['benefits', userId])
      queryClient.setQueryData<Benefit[]>(['benefits', userId], (old) =>
        (old ?? []).filter((b) => b.id !== benefitId),
      )
      return { previous, userId }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['benefits', context.userId], context.previous)
      }
    },
    onSettled: (_data, _err, vars) => {
      queryClient.invalidateQueries({ queryKey: ['benefits', vars.userId] })
    },
  })
}

export function useAddBenefit() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ userId, benefit }: { userId: string; benefit: NewBenefit }) => {
      const row: Record<string, unknown> = {
        user_id: userId,
        business_id: await getOrCreateBusinessId(benefit.business_name, userId),
        type: benefit.type,
        title: benefit.title,
        description: benefit.description ?? null,
        source: 'manual',
        verified: false,
        redeemed: false,
        expires_at: benefit.expires_at ?? null,
      }

      if (benefit.type === 'credit') row.amount_cents = benefit.amount_cents
      if (benefit.type === 'discount') row.discount_percent = benefit.discount_percent
      if (benefit.type === 'free_item') row.free_item_description = benefit.free_item_description

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await supabase.from('benefits').insert(row as any)
      if (error) throw error
    },
    onSuccess: (_data, { userId }) => {
      queryClient.invalidateQueries({ queryKey: ['benefits', userId] })
    },
  })
}

// Finds or creates a placeholder business row for manually-entered coupons
async function getOrCreateBusinessId(name: string, userId: string): Promise<string> {
  const { data: existing } = await supabase
    .from('businesses')
    .select('id')
    .ilike('name', name.trim())
    .maybeSingle()

  if (existing) return existing.id

  const { data: created, error } = await supabase
    .from('businesses')
    .insert({ name: name.trim(), owner_id: userId, qr_code_token: `manual-${Date.now()}`, category: 'other' })
    .select('id')
    .single()

  if (error) throw error
  return created.id
}
