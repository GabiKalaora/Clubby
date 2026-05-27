import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export type NotificationItem = {
  id: string
  type: 'expiry_reminder' | 'new_promotion' | 'direct_message'
  message: string | null
  sent_at: string
  read_at: string | null
  benefit_id: string | null
}

export function useNotifications(userId: string | undefined) {
  return useQuery({
    queryKey: ['notifications', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notification_log')
        .select('id, type, message, sent_at, read_at, benefit_id')
        .eq('user_id', userId!)
        .order('sent_at', { ascending: false })
        .limit(100)
      if (error) throw error
      return (data ?? []) as NotificationItem[]
    },
    enabled: !!userId,
    staleTime: 30_000,
  })
}

export function useUnreadCount(userId: string | undefined) {
  return useQuery({
    queryKey: ['notifications-unread', userId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('notification_log')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId!)
        .is('read_at', null)
      if (error) throw error
      return count ?? 0
    },
    enabled: !!userId,
    staleTime: 30_000,
  })
}

export function useMarkAllRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('notification_log')
        .update({ read_at: new Date().toISOString() })
        .eq('user_id', userId)
        .is('read_at', null)
      if (error) throw error
    },
    onSuccess: (_data, userId) => {
      qc.invalidateQueries({ queryKey: ['notifications', userId] })
      qc.invalidateQueries({ queryKey: ['notifications-unread', userId] })
    },
  })
}
