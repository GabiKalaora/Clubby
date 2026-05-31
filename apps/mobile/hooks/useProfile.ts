import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export type Profile = {
  id: string
  display_name: string | null
  phone: string | null
  avatar_url: string | null
  expo_push_token: string | null
  date_of_birth: string | null
}

export function useProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ['profile', userId],
    enabled: !!userId,
    staleTime: 60_000,
    queryFn: async (): Promise<Profile> => {
      const { data, error } = await supabase
        .from('profiles')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .select('id, display_name, phone, avatar_url, expo_push_token, date_of_birth' as any)
        .eq('id', userId!)
        .single()
      if (error) throw error
      return data as unknown as Profile
    },
  })
}

export function useUpdateProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ userId, display_name, date_of_birth }: { userId: string; display_name?: string; date_of_birth?: string | null }) => {
      const patch: Record<string, unknown> = {}
      if (display_name !== undefined) patch.display_name = display_name.trim() || null
      if (date_of_birth !== undefined) patch.date_of_birth = date_of_birth || null
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await supabase.from('profiles').update(patch as any).eq('id', userId)
      if (error) throw error
    },
    onSuccess: (_, { userId }) => {
      qc.invalidateQueries({ queryKey: ['profile', userId] })
    },
  })
}
