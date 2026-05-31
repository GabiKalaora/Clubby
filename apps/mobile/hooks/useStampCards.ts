import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export type StampCard = {
  id: string
  name: string
  required_stamps: number
  reward_type: 'free_item' | 'credit' | 'discount'
  reward_title: string
  reward_value: number | null
  current_stamps: number
  completed: boolean
}

async function fetchStampCards(businessId: string, userId: string): Promise<StampCard[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc as any)('get_stamp_cards', {
    p_business_id: businessId,
    p_user_id: userId,
  })
  if (error) throw error
  return (data ?? []) as StampCard[]
}

export function useStampCards(businessIds: string[], userId: string | undefined) {
  return useQuery({
    queryKey: ['stamp_cards', businessIds.join(','), userId],
    queryFn: async () => {
      if (!userId || businessIds.length === 0) return []
      const results = await Promise.all(
        businessIds.map((bid) => fetchStampCards(bid, userId)),
      )
      return results.flat()
    },
    enabled: !!userId && businessIds.length > 0,
    staleTime: 30_000,
  })
}

// For invalidating stamp card cache after a stamp is recorded externally
export function useInvalidateStampCards() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: ['stamp_cards'] })
}
