import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export type Profile = {
  id: string
  display_name: string | null
  phone: string | null
  avatar_url: string | null
  expo_push_token: string | null
}

export function useProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ['profile', userId],
    enabled: !!userId,
    staleTime: 60_000,
    queryFn: async (): Promise<Profile> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, phone, avatar_url, expo_push_token')
        .eq('id', userId!)
        .single()
      if (error) throw error
      return data as Profile
    },
  })
}

export function useUpdateProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ userId, display_name }: { userId: string; display_name: string }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ display_name: display_name.trim() || null })
        .eq('id', userId)
      if (error) throw error
    },
    onSuccess: (_, { userId }) => {
      qc.invalidateQueries({ queryKey: ['profile', userId] })
    },
  })
}
