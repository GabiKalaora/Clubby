import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export type DiscoveryPost = {
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
  businesses: {
    id: string
    name: string
    category: string | null
    logo_url: string | null
    cover_url: string | null
    lat: number | null
    lng: number | null
    qr_code_token: string
  } | null
  // computed client-side
  distance_km?: number
}

function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/**
 * Discovery feed — active posts from ALL businesses (not just joined clubs).
 * Location-first ranking: nearby businesses surface first, newest posts break ties.
 * feed_posts is public-read by RLS (migration 019), so no membership filter here.
 */
export function useDiscoveryFeed(userLat?: number, userLng?: number) {
  return useQuery({
    queryKey: ['discovery-feed', userLat?.toFixed(3), userLng?.toFixed(3)],
    staleTime: 60_000,
    queryFn: async (): Promise<DiscoveryPost[]> => {
      const { data, error } = await supabase
        .from('feed_posts' as never)
        .select('*, businesses(id, name, category, logo_url, cover_url, lat, lng, qr_code_token)')
        .eq('active', true)
        .order('created_at', { ascending: false })
        .limit(100)
      if (error) throw error

      const posts = (data ?? []) as unknown as DiscoveryPost[]
      const now = Date.now()
      const fresh = posts.filter(
        (p) => !p.expires_at || new Date(p.expires_at).getTime() > now,
      )

      if (userLat == null || userLng == null) return fresh

      return fresh
        .map((p) => ({
          ...p,
          distance_km:
            p.businesses?.lat != null && p.businesses?.lng != null
              ? distanceKm(userLat, userLng, p.businesses.lat, p.businesses.lng)
              : undefined,
        }))
        .sort((a, b) => {
          // Location-first: near businesses before far ones, unknown-location last.
          // Within the same ~2km bucket, newest first.
          const da = a.distance_km == null ? Infinity : Math.floor(a.distance_km / 2)
          const db = b.distance_km == null ? Infinity : Math.floor(b.distance_km / 2)
          if (da !== db) return da - db
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        })
    },
  })
}
