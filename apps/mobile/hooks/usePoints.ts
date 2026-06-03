import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export type PointsProgram = {
  id: string
  business_id: string
  name: string
  points_per_scan: number
  active: boolean
}

export type PointsBalance = {
  id: string
  program_id: string
  business_id: string
  balance: number
  total_earned: number
  program: PointsProgram
}

export type PointsReward = {
  id: string
  program_id: string
  name: string
  points_cost: number
  reward_type: 'free_item' | 'credit' | 'discount'
  reward_value: number | null
  active: boolean
}

export function usePointsBalances(userId: string | undefined) {
  return useQuery({
    queryKey: ['points-balances', userId],
    enabled: !!userId,
    staleTime: 30_000,
    queryFn: async (): Promise<PointsBalance[]> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('points_balances')
        .select('*, program:points_programs(*)')
        .eq('user_id', userId!)
        .gt('balance', 0)
      if (error) throw error
      return (data ?? []) as PointsBalance[]
    },
  })
}

export function usePointsRewards(programId: string | undefined) {
  return useQuery({
    queryKey: ['points-rewards', programId],
    enabled: !!programId,
    staleTime: 60_000,
    queryFn: async (): Promise<PointsReward[]> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('points_rewards')
        .select('*')
        .eq('program_id', programId!)
        .eq('active', true)
        .order('points_cost', { ascending: true })
      if (error) throw error
      return (data ?? []) as PointsReward[]
    },
  })
}

export function useRedeemPoints() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ rewardId, userId }: { rewardId: string; userId: string }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .rpc('redeem_points', { p_reward_id: rewardId, p_user_id: userId })
      if (error) throw error
      if (data?.error) throw new Error(data.error)
      return data
    },
    onSuccess: (_data, { userId }) => {
      qc.invalidateQueries({ queryKey: ['points-balances', userId] })
      qc.invalidateQueries({ queryKey: ['benefits', userId] })
      qc.invalidateQueries({ queryKey: ['benefits-all', userId] })
    },
  })
}
