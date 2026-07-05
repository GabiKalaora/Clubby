import { useState, useCallback, useEffect, useRef } from 'react'
import {
  View, Text, FlatList, TouchableOpacity,
  TextInput, ActivityIndicator, Image, Linking, Platform,
} from 'react-native'
import { WebView } from 'react-native-webview'
import { LinearGradient } from 'expo-linear-gradient'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import * as Location from 'expo-location'
import { supabase } from '../../lib/supabase'
import { useCurrentUser, useSession } from '../../hooks/useAuth'
import { useNearbyBusinesses, useEnrollBusiness, type Business } from '../../hooks/useBusinesses'
import { useMemberships } from '../../hooks/useMemberships'

// react-native-maps only works on native — safe import
let MapView: React.ComponentType<any> | null = null
let Marker: React.ComponentType<any> | null = null
if (Platform.OS !== 'web') {
  try {
    const Maps = require('react-native-maps')
    MapView = Maps.default
    Marker = Maps.Marker
  } catch { /* maps not available */ }
}

// Build Leaflet HTML for web map (OpenStreetMap — no API key needed)
function buildLeafletHTML(businesses: Business[], userLat?: number, userLng?: number, enrolledIds?: Set<string>): string {
  const centerLat = userLat ?? 32.0853
  const centerLng = userLng ?? 34.7818
  const markers = businesses
    .filter(b => b.lat != null && b.lng != null)
    .map(b => {
      const isJoined = enrolledIds?.has(b.id)
      const color = isJoined ? '#94a3b8' : '#a855f7'
      const promo = b.promotions?.[0]?.title ?? ''
      return `
        L.circleMarker([${b.lat}, ${b.lng}], {
          radius: 18, fillColor: '${color}', color: '#ffffff',
          weight: 3, opacity: 1, fillOpacity: 1
        })
        .bindPopup(\`
          <div style="font-family:-apple-system,sans-serif;min-width:160px">
            <div style="font-weight:700;font-size:14px;color:#2d3748;margin-bottom:4px">${b.name.replace(/'/g, "\\'")}</div>
            <div style="font-size:12px;color:#64748b;text-transform:capitalize;margin-bottom:${promo ? '6px' : '0'}">${(b.category ?? '').replace(/'/g, "\\'")}</div>
            ${promo ? `<div style="background:#a855f715;border-radius:6px;padding:3px 8px;font-size:11px;color:#a855f7;font-weight:600">🎁 ${promo.replace(/'/g, "\\'")}</div>` : ''}
          </div>
        \`)
        .addTo(map);
      `
    }).join('\n')

  const userMarker = userLat && userLng ? `
    L.circleMarker([${userLat}, ${userLng}], {
      radius: 10, fillColor: '#3b82f6', color: '#ffffff',
      weight: 3, opacity: 1, fillOpacity: 1
    }).bindPopup('<b>You are here</b>').addTo(map);
  ` : ''

  return `<!DOCTYPE html>
<html><head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
  html,body,#map{margin:0;padding:0;width:100%;height:100%;background:#f8f9fa;}
  .leaflet-popup-content-wrapper{border-radius:12px;box-shadow:0 4px 16px rgba(0,0,0,0.12);}
</style>
</head><body>
<div id="map"></div>
<script>
  var map = L.map('map', {zoomControl:true, attributionControl:false})
    .setView([${centerLat}, ${centerLng}], 14);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom:19
  }).addTo(map);
  ${markers}
  ${userMarker}
</script>
</body></html>`
}

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

// Category square colors — like the reference app
const CAT_COLORS: Record<string, { bg: string; emoji: string }> = {
  all:      { bg: '#a855f7', emoji: '🌐' },
  food:     { bg: '#22a05f', emoji: '🍔' },
  clothing: { bg: '#7c3aed', emoji: '👕' },
  shoes:    { bg: '#db2777', emoji: '👟' },
  health:   { bg: '#0891b2', emoji: '💊' },
  tech:     { bg: '#ea580c', emoji: '💻' },
  service:  { bg: '#ca8a04', emoji: '🛠️' },
}

function openInMaps(lat: number, lng: number, name: string) {
  const label = encodeURIComponent(name)
  const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}&query_place_name=${label}`
  Linking.openURL(url).catch(() => {
    // fallback to Apple Maps on iOS
    Linking.openURL(`maps:0,0?q=${lat},${lng}(${label})`)
  })
}

function BusinessCard({
  business, onEnroll, enrolling, enrolled,
}: {
  business: Business; onEnroll: () => void; enrolling: boolean; enrolled: boolean
}) {
  const router = useRouter()
  const { t } = useTranslation()
  const activePromo = business.promotions?.[0]

  return (
    <TouchableOpacity
      onPress={() => router.push(`/store/${business.id}` as never)}
      activeOpacity={0.8}
      style={{
        backgroundColor: '#ffffff', borderRadius: 20,
        marginHorizontal: 16, marginBottom: 10,
        padding: 14, borderWidth: 1, borderColor: '#e2e8f0',
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {/* Logo */}
        <View style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginEnd: 12, flexShrink: 0 }}>
          {business.logo_url
            ? <Image source={{ uri: business.logo_url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
            : <Text style={{ fontSize: 26 }}>🏪</Text>}
        </View>

        {/* Info */}
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', color: '#2d3748', fontSize: 15 }}>{business.name}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
            {business.category && (
              <Text style={{ color: '#94a3b8', fontSize: 12, fontFamily: 'PlusJakartaSans_500Medium', textTransform: 'capitalize' }}>{business.category}</Text>
            )}
            {business.distance_km != null && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                <Text style={{ color: '#64748b', fontSize: 12 }}>·</Text>
                <Text style={{ color: '#a855f7', fontSize: 12, fontFamily: 'PlusJakartaSans_600SemiBold' }}>
                  📍 {business.distance_km < 1 ? `${Math.round(business.distance_km * 1000)}m` : `${business.distance_km.toFixed(1)}km`}
                </Text>
              </View>
            )}
          </View>
          {activePromo ? (
            <View style={{ backgroundColor: '#a855f722', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4, alignSelf: 'flex-start', marginTop: 6 }}>
              <Text style={{ color: '#c084fc', fontSize: 11, fontFamily: 'PlusJakartaSans_600SemiBold' }} numberOfLines={1}>🎁 {activePromo.title}</Text>
            </View>
          ) : business.description ? (
            <Text style={{ color: '#64748b', fontSize: 12, marginTop: 4, fontFamily: 'PlusJakartaSans_400Regular' }} numberOfLines={1}>{business.description}</Text>
          ) : null}
          {/* Open in Maps button — shown when coordinates are available */}
          {business.lat != null && business.lng != null && (
            <TouchableOpacity
              onPress={(e) => { e.stopPropagation?.(); openInMaps(business.lat!, business.lng!, business.name) }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6, alignSelf: 'flex-start' }}
            >
              <Text style={{ color: '#a855f7', fontSize: 11, fontFamily: 'PlusJakartaSans_600SemiBold' }}>🗺 {t('discover.openInMaps')}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Enroll button */}
        <TouchableOpacity
          onPress={onEnroll}
          disabled={enrolling || enrolled}
          style={{
            width: 32, height: 32, borderRadius: 999,
            alignItems: 'center', justifyContent: 'center',
            backgroundColor: enrolled ? '#f0fdf4' : 'transparent',
            borderWidth: 1.5,
            borderColor: enrolled ? '#16a34a' : '#a855f7',
            marginStart: 8, flexShrink: 0,
          }}
        >
          {enrolling
            ? <ActivityIndicator size="small" color="#a855f7" />
            : enrolled
            ? <Text style={{ color: '#16a34a', fontSize: 16, fontFamily: 'PlusJakartaSans_700Bold' }}>✓</Text>
            : <Text style={{ color: '#a855f7', fontSize: 18, lineHeight: 22 }}>+</Text>}
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  )
}

export default function Discover() {
  const { t } = useTranslation()
  const router = useRouter()

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
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list')
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null)
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
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8f9fa' }}>
      {/* Header */}
      <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <Text style={{ fontSize: 26, fontFamily: 'PlusJakartaSans_700Bold', color: '#2d3748', flex: 1 }}>{t('discover.title')}</Text>

          {/* Map / List toggle — always visible, uses WebView on web, native maps on device */}
          <View style={{ flexDirection: 'row', backgroundColor: '#f1f5f9', borderRadius: 999, padding: 3 }}>
            <TouchableOpacity
              onPress={() => setViewMode('list')}
              style={{ paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999, backgroundColor: viewMode === 'list' ? '#ffffff' : 'transparent' }}
            >
              <Text style={{ fontSize: 11, fontFamily: 'PlusJakartaSans_600SemiBold', color: viewMode === 'list' ? '#2d3748' : '#94a3b8' }}>
                {t('discover.listView')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setViewMode('map')}
              style={{ paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999, backgroundColor: viewMode === 'map' ? '#a855f7' : 'transparent' }}
            >
              <Text style={{ fontSize: 11, fontFamily: 'PlusJakartaSans_600SemiBold', color: viewMode === 'map' ? '#ffffff' : '#94a3b8' }}>
                {t('discover.mapView')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Near me toggle */}
          <TouchableOpacity
            onPress={async () => {
              if (userLocation) {
                setUserLocation(null)
              } else {
                try {
                  const { status } = await Location.requestForegroundPermissionsAsync()
                  if (status === 'granted') {
                    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
                    setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
                  }
                } catch { /* location optional */ }
              }
            }}
            style={{
              flexDirection: 'row', alignItems: 'center', gap: 4,
              paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999,
              backgroundColor: userLocation ? '#a855f7' : '#ffffff',
              borderWidth: 1, borderColor: userLocation ? '#a855f7' : '#e2e8f0',
            }}
          >
            <Text style={{ fontSize: 11, fontFamily: 'PlusJakartaSans_600SemiBold', color: userLocation ? '#ffffff' : '#64748b' }}>
              {userLocation ? t('discover.nearMe') : '📍 ' + t('discover.nearMe').replace('📍 ', '')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search bar */}
        <View style={{ backgroundColor: '#ffffff', borderRadius: 16, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, borderWidth: 1, borderColor: '#e2e8f0' }}>
          <Text style={{ color: '#64748b', marginEnd: 8, fontSize: 16 }}>🔍</Text>
          <TextInput
            style={{ flex: 1, color: '#2d3748', fontSize: 15, fontFamily: 'PlusJakartaSans_500Medium', paddingVertical: 14 }}
            placeholder={t('discover.searchPlaceholder')}
            placeholderTextColor="#64748b"
            value={search}
            onChangeText={handleSearchChange}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => { setSearch(''); setDebouncedSearch('') }}>
              <Text style={{ color: '#64748b', fontSize: 16 }}>✕</Text>
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
          const cat = CAT_COLORS[item.key] ?? { bg: '#a855f7', emoji: '🌐' }
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
                fontSize: 11, fontFamily: 'PlusJakartaSans_600SemiBold',
                color: active ? '#ffffff' : '#94a3b8',
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
            backgroundColor: openNow ? '#a855f7' : '#ffffff',
            borderWidth: 1, borderColor: openNow ? '#a855f7' : '#e2e8f0',
            gap: 6,
          }}
        >
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: openNow ? 'white' : '#22c55e' }} />
          <Text style={{ fontSize: 12, fontFamily: 'PlusJakartaSans_600SemiBold', color: openNow ? '#ffffff' : '#94a3b8' }}>
            {t('discover.openNow')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Business list */}
      {enrollError ? (
        <View style={{ backgroundColor: '#ef444418', borderRadius: 12, padding: 12, marginHorizontal: 16, marginBottom: 8 }}>
          <Text style={{ color: '#ef4444', fontSize: 13, fontFamily: 'PlusJakartaSans_500Medium' }}>{enrollError}</Text>
        </View>
      ) : null}

      {/* MAP VIEW */}
      {viewMode === 'map' ? (
        <View style={{ flex: 1 }}>
          {Platform.OS === 'web' ? (
            /* ── Web: Leaflet / OpenStreetMap via iframe srcdoc ── */
            <View style={{ flex: 1 }}>
              <iframe
                style={{ flex: 1, border: 'none', width: '100%', height: '100%' }}
                srcDoc={buildLeafletHTML(displayedBusinesses, userLocation?.lat, userLocation?.lng, enrolledIds)}
                title="Map"
              />
            </View>
          ) : MapView && Marker ? (
            /* ── Native: react-native-maps ── */
            <MapView
              style={{ flex: 1 }}
              initialRegion={{
                latitude: userLocation?.lat ?? 32.0853,
                longitude: userLocation?.lng ?? 34.7818,
                latitudeDelta: 0.06,
                longitudeDelta: 0.06,
              }}
              showsUserLocation={true}
              showsMyLocationButton={true}
              showsCompass={true}
            >
              {displayedBusinesses.filter(b => b.lat != null && b.lng != null).map(b => (
                <Marker
                  key={b.id}
                  coordinate={{ latitude: b.lat!, longitude: b.lng! }}
                  onPress={() => setSelectedBusiness(b)}
                >
                  <View style={{
                    backgroundColor: enrolledIds.has(b.id) ? '#e2e8f0' : '#a855f7',
                    width: 44, height: 44, borderRadius: 22,
                    alignItems: 'center', justifyContent: 'center',
                    borderWidth: 3, borderColor: '#ffffff',
                    shadowColor: '#a855f7', shadowOpacity: 0.4, shadowRadius: 6, elevation: 8,
                  }}>
                    {b.logo_url
                      ? <Image source={{ uri: b.logo_url }} style={{ width: 30, height: 30, borderRadius: 15 }} />
                      : <Text style={{ fontSize: 20 }}>🏪</Text>}
                  </View>
                </Marker>
              ))}
            </MapView>
          ) : null}

          {/* Selected business card overlay (native only) */}
          {Platform.OS !== 'web' && selectedBusiness && (
            <View style={{
              position: 'absolute', bottom: 16, left: 16, right: 16,
              backgroundColor: '#ffffff', borderRadius: 20,
              padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12,
              shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 16, elevation: 12,
            }}>
              <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                {selectedBusiness.logo_url
                  ? <Image source={{ uri: selectedBusiness.logo_url }} style={{ width: '100%', height: '100%' }} />
                  : <Text style={{ fontSize: 26 }}>🏪</Text>}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 15, color: '#2d3748' }} numberOfLines={1}>
                  {selectedBusiness.name}
                </Text>
                <Text style={{ color: '#94a3b8', fontSize: 12, fontFamily: 'PlusJakartaSans_500Medium', textTransform: 'capitalize' }}>
                  {selectedBusiness.category}
                  {selectedBusiness.distance_km != null
                    ? ` · 📍 ${selectedBusiness.distance_km < 1 ? Math.round(selectedBusiness.distance_km * 1000) + 'm' : selectedBusiness.distance_km.toFixed(1) + 'km'}`
                    : ''}
                </Text>
                {selectedBusiness.promotions?.[0] && (
                  <View style={{ backgroundColor: '#a855f715', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start', marginTop: 4 }}>
                    <Text style={{ color: '#a855f7', fontSize: 11, fontFamily: 'PlusJakartaSans_600SemiBold' }} numberOfLines={1}>
                      🎁 {selectedBusiness.promotions[0].title}
                    </Text>
                  </View>
                )}
              </View>
              <View style={{ flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                <TouchableOpacity
                  onPress={() => { setSelectedBusiness(null); router.push(`/store/${selectedBusiness.id}` as never) }}
                  style={{ backgroundColor: '#f1f5f9', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7 }}
                >
                  <Text style={{ fontSize: 11, fontFamily: 'PlusJakartaSans_600SemiBold', color: '#2d3748' }}>View</Text>
                </TouchableOpacity>
                {!enrolledIds.has(selectedBusiness.id) && (
                  <TouchableOpacity
                    onPress={() => { handleEnroll(selectedBusiness); setSelectedBusiness(null) }}
                    disabled={enrollingId === selectedBusiness.id}
                    style={{ borderRadius: 10, overflow: 'hidden' }}
                  >
                    <LinearGradient colors={['#ec4899','#a855f7']} start={{x:0,y:0}} end={{x:1,y:0}}
                      style={{ paddingHorizontal: 12, paddingVertical: 7, alignItems: 'center' }}>
                      {enrollingId === selectedBusiness.id
                        ? <ActivityIndicator size="small" color="white" />
                        : <Text style={{ fontSize: 11, fontFamily: 'PlusJakartaSans_600SemiBold', color: '#fff' }}>Join</Text>}
                    </LinearGradient>
                  </TouchableOpacity>
                )}
              </View>
              <TouchableOpacity onPress={() => setSelectedBusiness(null)} style={{ position: 'absolute', top: 8, right: 12 }}>
                <Text style={{ color: '#94a3b8', fontSize: 16 }}>✕</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Web: info bar at bottom */}
          {Platform.OS === 'web' && (
            <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(255,255,255,0.95)', padding: 12, borderTopWidth: 1, borderTopColor: '#e2e8f0' }}>
              <Text style={{ textAlign: 'center', fontSize: 12, color: '#64748b', fontFamily: 'PlusJakartaSans_500Medium' }}>
                📍 {displayedBusinesses.filter(b=>b.lat!=null).length} stores with location · Tap a pin to see details
              </Text>
            </View>
          )}
        </View>
      ) : (
        /* LIST VIEW */
        isLoading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color="#c084fc" />
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
                <Text style={{ color: '#64748b', textAlign: 'center', fontSize: 15, fontFamily: 'PlusJakartaSans_500Medium' }}>
                  {search ? t('discover.emptySearch', { query: search })
                    : openNow ? t('discover.emptyOpenNow')
                    : activeCategory === 'all' ? t('discover.empty')
                    : t('discover.emptyCategory', { category: activeCategory })}
                </Text>
              </View>
            }
            ListFooterComponent={<View style={{ height: 16 }} />}
          />
        )
      )}
    </SafeAreaView>
  )
}
