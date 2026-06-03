import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export type Tier = {
  id: string
  name: string
  min_stamps: number
  color: string
  icon: string
}

export type MemberTier = {
  total_stamps: number
  tier_name: string
  tier_color: string
  tier_icon: string
  next_tier_name: string | null
  next_tier_color: string | null
  stamps_to_next: number | null
}

export function useTiers(businessId: string | undefined) {
  return useQuery({
    queryKey: ['tiers', businessId],
    enabled: !!businessId,
    staleTime: 300_000,
    queryFn: async (): Promise<Tier[]> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('tiers')
        .select('id, name, min_stamps, color, icon')
        .eq('business_id', businessId!)
        .order('min_stamps', { ascending: true })
      if (error) throw error
      return (data ?? []) as Tier[]
    },
  })
}

export function useMemberTier(businessId: string | undefined, userId: string | undefined) {
  return useQuery({
    queryKey: ['member-tier', businessId, userId],
    enabled: !!businessId && !!userId,
    staleTime: 60_000,
    queryFn: async (): Promise<MemberTier> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .rpc('get_member_tier', { p_business_id: businessId!, p_user_id: userId! })
      if (error) throw error
      return data as MemberTier
    },
  })
}
