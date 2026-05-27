import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export type Story = {
  id: string
  business_id: string
  image_url: string | null
  caption: string | null
  cta_text: string | null
  cta_url: string | null
  expires_at: string
  created_at: string
  businesses: {
    id: string
    name: string
    logo_url: string | null
  } | null
}

export function useActiveStories(userId: string | undefined) {
  return useQuery({
    queryKey: ['stories', userId],
    enabled: !!userId,
    staleTime: 60_000,
    queryFn: async (): Promise<Story[]> => {
      // Fetch stories from businesses the user is a member of
      const { data: memberships } = await supabase
        .from('memberships')
        .select('business_id')
        .eq('user_id', userId!)
        .eq('active', true)

      if (!memberships || memberships.length === 0) return []

      const bizIds = memberships.map(m => m.business_id)

      const { data, error } = await supabase
        .from('stories')
        .select(`
          id, business_id, image_url, caption, cta_text, cta_url, expires_at, created_at,
          businesses ( id, name, logo_url )
        `)
        .in('business_id', bizIds)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })

      if (error) throw error
      return (data ?? []) as Story[]
    },
  })
}
