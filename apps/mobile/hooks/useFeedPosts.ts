import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export type FeedPost = {
  id: string
  business_id: string
  type: 'promotion' | 'announcement' | 'story' | 'offer'
  title: string
  body: string | null
  image_url: string | null
  cta_text: string | null
  cta_url: string | null
  expires_at: string | null
  created_at: string
  businesses?: { name: string; logo_url: string | null } | null
}

export function useFeedPosts(businessIds: string[]) {
  return useQuery({
    queryKey: ['feed-posts', businessIds.join(',')],
    enabled: businessIds.length > 0,
    staleTime: 60_000,
    queryFn: async (): Promise<FeedPost[]> => {
      const { data, error } = await supabase
        .from('feed_posts' as never)
        .select('*, businesses(name, logo_url)')
        .in('business_id', businessIds)
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as FeedPost[]
    },
  })
}
