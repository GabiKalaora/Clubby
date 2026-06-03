import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export type Membership = {
  id: string
  joined_at: string
  business_id: string
  total_stamps: number
  businesses: {
    id: string
    name: string
    category: string | null
    logo_url: string | null
    description: string | null
  }
}

export function useMemberships(userId: string | undefined) {
  return useQuery({
    queryKey: ['memberships', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('memberships')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .select('id, joined_at, business_id, total_stamps, businesses(id, name, category, logo_url, description)' as any)
        .eq('user_id', userId!)
        .eq('active', true)
        .order('joined_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as unknown as Membership[]
    },
    enabled: !!userId,
    staleTime: 30_000,
  })
}
