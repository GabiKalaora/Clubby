import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import Constants from 'expo-constants'

export type Business = {
  id: string
  name: string
  category: string | null
  description: string | null
  logo_url: string | null
  cover_url: string | null
  lat: number | null
  lng: number | null
  address: string | null
  phone: string | null
  opening_hours: Record<string, { open: string; close: string }> | null
  qr_code_token: string
  created_at: string
  // active promotion details (joined)
  promotions?: { title: string; benefit_type: string; benefit_value: number | null }[]
  // computed client-side
  distance_km?: number
}

async function fetchBusinesses(category?: string, search?: string): Promise<Business[]> {
  let query = supabase
    .from('businesses')
    .select('id, name, category, description, logo_url, cover_url, lat, lng, address, phone, opening_hours, qr_code_token, created_at, promotions(title, benefit_type, benefit_value)')
    .eq('promotions.active', true)
    .order('created_at', { ascending: false })

  if (category && category !== 'all') {
    query = query.eq('category', category)
  }
  if (search) {
    query = query.ilike('name', `%${search}%`)
  }

  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as unknown as Business[]
}

export function useBusinesses(category?: string, search?: string) {
  return useQuery({
    queryKey: ['businesses', category, search],
    queryFn: () => fetchBusinesses(category, search),
    staleTime: 60_000,
  })
}

export function useBusiness(id: string) {
  return useQuery({
    queryKey: ['business', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('businesses')
        .select('*, promotions(title, benefit_type, benefit_value)')
        .eq('id', id)
        .eq('promotions.active', true)
        .single()
      if (error) throw error
      return data as unknown as Business
    },
    staleTime: 60_000,
  })
}

export function useIsMember(userId: string | undefined, businessId: string) {
  return useQuery({
    queryKey: ['membership', userId, businessId],
    queryFn: async () => {
      const { data } = await supabase
        .from('memberships')
        .select('id')
        .eq('user_id', userId!)
        .eq('business_id', businessId)
        .maybeSingle()
      return !!data
    },
    enabled: !!userId,
    staleTime: 30_000,
  })
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

export function useNearbyBusinesses(
  userLat?: number,
  userLng?: number,
  category?: string,
  search?: string,
) {
  return useQuery({
    queryKey: ['businesses', category, search, userLat, userLng],
    queryFn: async () => {
      const businesses = await fetchBusinesses(category, search)
      if (userLat == null || userLng == null) return businesses
      return businesses
        .map((b) => ({
          ...b,
          distance_km:
            b.lat != null && b.lng != null
              ? distanceKm(userLat, userLng, b.lat, b.lng)
              : undefined,
        }))
        .sort((a, b) => {
          if (a.distance_km == null && b.distance_km == null) return 0
          if (a.distance_km == null) return 1
          if (b.distance_km == null) return -1
          return a.distance_km - b.distance_km
        })
    },
    staleTime: 60_000,
  })
}

export function useEnrollBusiness() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ token, userJwt }: { token: string; userJwt: string }) => {
      const supabaseUrl = (Constants.expoConfig?.extra?.supabaseUrl as string | undefined)
        ?? process.env.EXPO_PUBLIC_SUPABASE_URL
        ?? 'http://127.0.0.1:54321'

      const res = await fetch(`${supabaseUrl}/functions/v1/enroll-member`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userJwt}`,
        },
        body: JSON.stringify({ token }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }))
        throw new Error(err.error ?? 'Enrollment failed')
      }
      return res.json()
    },
    onSuccess: (_data, _vars) => {
      queryClient.invalidateQueries({ queryKey: ['benefits'] })
      queryClient.invalidateQueries({ queryKey: ['membership'] })
      queryClient.invalidateQueries({ queryKey: ['memberships'] })
    },
  })
}
