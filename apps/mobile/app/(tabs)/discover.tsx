import { useState, useCallback, useEffect } from 'react'
import {
  View, Text, FlatList, TouchableOpacity,
  TextInput, ActivityIndicator, Image,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import * as Location from 'expo-location'
import { supabase } from '../../lib/supabase'
import { useNearbyBusinesses, useEnrollBusiness, type Business } from '../../hooks/useBusinesses'
import { useMemberships } from '../../hooks/useMemberships'

type Category = 'all' | 'food' | 'clothing' | 'shoes' | 'health' | 'tech' | 'service'

const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const

function isOpenNow(opening_hours: Business['opening_hours']): boolean {
  if (!opening_hours) return false
  const now = new Date()
  const day = DAYS[now.getDay()]
  const dayHours = opening_hours[day]
  if (!dayHours) return false
  const [openH, openM] = dayHours.open.split(':').map(Number)
  const [closeH, closeM] = dayHours.close.split(':').map(Number)
  const nowMins = now.getHours() * 60 + now.getMinutes()
  const openMins = openH * 60 + openM
  const closeMins = closeH * 60 + closeM
  return nowMins >= openMins && nowMins < closeMins
}

function useCurrentUser() {
  return useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      return user
    },
    staleTime: Infinity,
  })
}

function useSession() {
  return useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession()
      return session
    },
    staleTime: Infinity,
  })
}

// Category square colors — like the reference app
const CAT_COLORS: Record<string, { bg: string; emoji: string }> = {
  all:      { bg: '#1a7a4a', emoji: '🌐' },
  food:     { bg: '#22a05f', emoji: '🍔' },
  clothing: { bg: '#7c3aed', emoji: '👕' },
  shoes:    { bg: '#db2777', emoji: '👟' },
  health:   { bg: '#0891b2', emoji: '💊' },
  tech:     { bg: '#ea580c', emoji: '💻' },
  service:  { bg: '#ca8a04', emoji: '🛠️' },
}

function BusinessCard({
  business, onEnroll, enrolling, enrolled,
}: {
  business: Business; onEnroll: () => void; enrolling: boolean; enrolled: boolean
}) {
  const router = useRouter()
  const activePromo = business.promotions?.[0]

  return (
    <TouchableOpacity
      onPress={() => router.push(`/store/${business.id}` as never)}
      activeOpacity={0.8}
      style={{
        backgroundColor: '#1e2022', borderRadius: 20,
        marginHorizontal: 16, marginBottom: 10,
        padding: 14, borderWidth: 1, borderColor: '#2a2d2f',
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {/* Logo */}
        <View style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: '#2a2d2f', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginEnd: 12, flexShrink: 0 }}>
          {business.logo_url
            ? <Image source={{ uri: business.logo_url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
            : <Text style={{ fontSize: 26 }}>🏪</Text>}
        </View>

        {/* Info */}
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: 'Urbanist_700Bold', color: '#ffffff', fontSize: 15 }}>{business.name}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
            {business.category && (
              <Text style={{ color: '#8e969f', fontSize: 12, fontFamily: 'Urbanist_500Medium', textTransform: 'capitalize' }}>{business.category}</Text>
            )}
            {business.distance_km != null && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                <Text style={{ color: '#4a5260', fontSize: 12 }}>·</Text>
                <Text style={{ color: '#1a7a4a', fontSize: 12, fontFamily: 'Urbanist_600SemiBold' }}>
                  📍 {business.distance_km < 1 ? `${Math.round(business.distance_km * 1000)}m` : `${business.distance_km.toFixed(1)}km`}
                </Text>
              </View>
            )}
          </View>
          {activePromo ? (
            <View style={{ backgroundColor: '#1a7a4a22', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4, alignSelf: 'flex-start', marginTop: 6 }}>
              <Text style={{ color: '#2ecc71', fontSize: 11, fontFamily: 'Urbanist_600SemiBold' }} numberOfLines={1}>🎁 {activePromo.title}</Text>
            </View>
          ) : business.description ? (
            <Text style={{ color: '#4a5260', fontSize: 12, marginTop: 4, fontFamily: 'Urbanist_400Regular' }} numberOfLines={1}>{business.description}</Text>
          ) : null}
        </View>

        {/* Enroll button */}
        <TouchableOpacity
          onPress={onEnroll}
          disabled={enrolling || enrolled}
          style={{
            width: 38, height: 38, borderRadius: 14,
            alignItems: 'center', justifyContent: 'center',
            backgroundColor: enrolled ? '#1a7a4a22' : '#1a7a4a',
            marginStart: 8, flexShrink: 0,
          }}
        >
          {enrolling
            ? <ActivityIndicator size="small" color="white" />
            : enrolled
            ? <Text style={{ color: '#2ecc71', fontSize: 18, fontFamily: 'Urbanist_700Bold' }}>✓</Text>
            : <Text style={{ color: 'white', fontSize: 22, lineHeight: 26 }}>+</Text>}
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  )
}

export default function Discover() {
  const { t } = useTranslation()

  const CATEGORIES: { key: Category; label: string }[] = [
    { key: 'all',      label: t('discover.categories.all') },
    { key: 'food',     label: t('discover.categories.food') },
    { key: 'clothing', label: t('discover.categories.clothing') },
    { key: 'shoes',    label: t('discover.categories.shoes') },
    { key: 'health',   label: t('discover.categories.health') },
    { key: 'tech',     label: t('discover.categories.tech') },
    { key: 'service',  label: t('discover.categories.service') },
  ]

  const [activeCategory, setActiveCategory] = useState<Category>('all')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [openNow, setOpenNow] = useState(false)
  const [enrollingId, setEnrollingId] = useState<string | null>(null)
  const [enrolledIds, setEnrolledIds] = useState<Set<string>>(new Set())
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)

  useEffect(() => {
    ;(async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync()
        if (status !== 'granted') return
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
      } catch { /* location is optional */ }
    })()
  }, [])

  const { data: user } = useCurrentUser()
  const { data: session } = useSession()
  const { data: businesses = [], isLoading, refetch, isRefetching } = useNearbyBusinesses(
    userLocation?.lat, userLocation?.lng,
    activeCategory === 'all' ? undefined : activeCategory,
    debouncedSearch || undefined,
  )
  const { mutate: enroll } = useEnrollBusiness()
  const { data: memberships = [] } = useMemberships(user?.id)

  const displayedBusinesses = openNow ? businesses.filter(b => isOpenNow(b.opening_hours)) : businesses

  useEffect(() => {
    if (memberships.length > 0) setEnrolledIds(new Set(memberships.map(m => m.business_id)))
  }, [memberships.length])

  const handleSearchChange = useCallback((text: string) => {
    setSearch(text)
    clearTimeout((handleSearchChange as unknown as { timer?: ReturnType<typeof setTimeout> }).timer)
    ;(handleSearchChange as unknown as { timer?: ReturnType<typeof setTimeout> }).timer = setTimeout(() => setDebouncedSearch(text), 350)
  }, [])

  const [enrollError, setEnrollError] = useState<string | null>(null)

  function handleEnroll(business: Business) {
    if (!session?.access_token || enrolledIds.has(business.id)) return
    setEnrollingId(business.id)
    setEnrollError(null)
    enroll(
      { token: business.qr_code_token, userJwt: session.access_token },
      {
        onSuccess: () => { setEnrolledIds((prev) => new Set(prev).add(business.id)); setEnrollingId(null) },
        onError: (err: Error) => { setEnrollingId(null); setEnrollError(err.message) },
      },
    )
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#151617' }}>
      {/* Header */}
      <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <Text style={{ fontSize: 26, fontFamily: 'Urbanist_700Bold', color: '#ffffff' }}>{t('discover.title')}</Text>
          {userLocation && <Text style={{ fontSize: 12, color: '#2ecc71', fontFamily: 'Urbanist_600SemiBold' }}>📍 Near me</Text>}
        </View>

        {/* Search bar */}
        <View style={{ backgroundColor: '#1e2022', borderRadius: 16, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, borderWidth: 1, borderColor: '#2a2d2f' }}>
          <Text style={{ color: '#4a5260', marginEnd: 8, fontSize: 16 }}>🔍</Text>
          <TextInput
            style={{ flex: 1, color: '#ffffff', fontSize: 15, fontFamily: 'Urbanist_500Medium', paddingVertical: 14 }}
            placeholder={t('discover.searchPlaceholder')}
            placeholderTextColor="#4a5260"
            value={search}
            onChangeText={handleSearchChange}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => { setSearch(''); setDebouncedSearch('') }}>
              <Text style={{ color: '#4a5260', fontSize: 16 }}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Category squares — like reference app */}
      <FlatList
        horizontal
        data={CATEGORIES}
        keyExtractor={(item) => item.key}
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0, marginBottom: 12 }}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}
        renderItem={({ item }) => {
          const cat = CAT_COLORS[item.key] ?? { bg: '#1a7a4a', emoji: '🌐' }
          const active = activeCategory === item.key
          return (
            <TouchableOpacity
              onPress={() => setActiveCategory(item.key)}
              style={{
                width: 72, alignItems: 'center',
                opacity: !active && activeCategory !== 'all' ? 0.5 : 1,
              }}
            >
              <View style={{
                width: 64, height: 64, borderRadius: 20,
                backgroundColor: active ? cat.bg : cat.bg + '33',
                alignItems: 'center', justifyContent: 'center',
                borderWidth: active ? 0 : 1.5,
                borderColor: active ? 'transparent' : cat.bg + '66',
                marginBottom: 6,
              }}>
                <Text style={{ fontSize: 28 }}>{cat.emoji}</Text>
              </View>
              <Text style={{
                fontSize: 11, fontFamily: 'Urbanist_600SemiBold',
                color: active ? '#ffffff' : '#8e969f',
                textAlign: 'center',
              }}>{item.label}</Text>
            </TouchableOpacity>
          )
        }}
      />

      {/* Open Now toggle */}
      <View style={{ paddingHorizontal: 16, marginBottom: 12 }}>
        <TouchableOpacity
          onPress={() => setOpenNow(v => !v)}
          style={{
            flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start',
            borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8,
            backgroundColor: openNow ? '#1a7a4a' : '#1e2022',
            borderWidth: 1, borderColor: openNow ? '#1a7a4a' : '#2a2d2f',
            gap: 6,
          }}
        >
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: openNow ? 'white' : '#22c55e' }} />
          <Text style={{ fontSize: 12, fontFamily: 'Urbanist_600SemiBold', color: openNow ? '#ffffff' : '#8e969f' }}>
            {t('discover.openNow')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Business list */}
      {enrollError ? (
        <View style={{ backgroundColor: '#ef444418', borderRadius: 12, padding: 12, marginHorizontal: 16, marginBottom: 8 }}>
          <Text style={{ color: '#ef4444', fontSize: 13, fontFamily: 'Urbanist_500Medium' }}>{enrollError}</Text>
        </View>
      ) : null}
      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color="#2ecc71" />
        </View>
      ) : (
        <FlatList
          data={displayedBusinesses}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <BusinessCard business={item} onEnroll={() => handleEnroll(item)}
              enrolling={enrollingId === item.id} enrolled={enrolledIds.has(item.id)} />
          )}
          onRefresh={refetch}
          refreshing={isRefetching}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 64, paddingHorizontal: 32 }}>
              <Text style={{ fontSize: 40, marginBottom: 12 }}>🏪</Text>
              <Text style={{ color: '#4a5260', textAlign: 'center', fontSize: 15, fontFamily: 'Urbanist_500Medium' }}>
                {search ? t('discover.emptySearch', { query: search })
                  : openNow ? t('discover.emptyOpenNow')
                  : activeCategory === 'all' ? t('discover.empty')
                  : t('discover.emptyCategory', { category: activeCategory })}
              </Text>
            </View>
          }
          ListFooterComponent={<View style={{ height: 16 }} />}
        />
      )}
    </SafeAreaView>
  )
}
