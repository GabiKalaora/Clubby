import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  View, Text, Image, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, useWindowDimensions,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import * as Location from 'expo-location'
import { useCurrentUser, useSession } from '../hooks/useAuth'
import { useMemberships } from '../hooks/useMemberships'
import { useEnrollBusiness } from '../hooks/useBusinesses'
import { useDiscoveryFeed, type DiscoveryPost } from '../hooks/useDiscoveryFeed'
import StoryRing from '../components/StoryRing'
import GradientButton from '../components/GradientButton'
import { brand, font } from '../lib/theme'

const FALLBACK_GRADIENTS: [string, string][] = [
  ['#7c3aed', '#db2777'],
  ['#0ea5e9', '#8b5cf6'],
  ['#f59e0b', '#ec4899'],
  ['#10b981', '#0ea5e9'],
]

type PostItemProps = {
  post: DiscoveryPost
  height: number
  isMember: boolean
  onJoin: (post: DiscoveryPost) => void
  joining: boolean
  index: number
}

function PostItem({ post, height, isMember, onJoin, joining, index }: PostItemProps) {
  const router = useRouter()
  const { t } = useTranslation()
  const biz = post.businesses
  const imageUrl = post.image_url ?? biz?.cover_url ?? null
  const fallback = FALLBACK_GRADIENTS[index % FALLBACK_GRADIENTS.length]

  return (
    <View style={{ height, backgroundColor: '#000' }}>
      {/* Background media */}
      {imageUrl ? (
        <Image source={{ uri: imageUrl }} style={{ position: 'absolute', width: '100%', height: '100%' }} resizeMode="cover" />
      ) : (
        <LinearGradient colors={fallback} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={{ position: 'absolute', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 96, opacity: 0.35 }}>{biz?.name?.[0] ?? '🏪'}</Text>
        </LinearGradient>
      )}

      {/* Legibility scrim — bottom-heavy like TikTok */}
      <LinearGradient
        colors={['rgba(0,0,0,0.35)', 'transparent', 'transparent', 'rgba(0,0,0,0.85)']}
        locations={[0, 0.25, 0.5, 1]}
        style={{ position: 'absolute', width: '100%', height: '100%' }}
      />

      {/* Bottom content overlay */}
      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, paddingBottom: 28 }}>
        {/* Business row */}
        <TouchableOpacity
          onPress={() => router.push({ pathname: '/store/[id]', params: { id: post.business_id } } as never)}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}
        >
          <StoryRing logoUrl={biz?.logo_url} name={biz?.name ?? ''} size={46} backgroundColor="#000" />
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#fff', fontSize: 15, fontFamily: font.bold }} numberOfLines={1}>
              {biz?.name}
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12, fontFamily: font.medium }} numberOfLines={1}>
              {[biz?.category, post.distance_km != null ? t('feed.kmAway', { km: post.distance_km < 1 ? (post.distance_km * 1000).toFixed(0) + ' ' + t('feed.meters') : post.distance_km.toFixed(1) + ' ' + t('feed.km') }) : null]
                .filter(Boolean).join(' · ')}
            </Text>
          </View>
          <GradientButton
            size="sm"
            label={t('feed.join')}
            doneLabel={'✓ ' + t('feed.member')}
            done={isMember}
            loading={joining}
            onPress={() => onJoin(post)}
          />
        </TouchableOpacity>

        {/* Post text */}
        <Text style={{ color: '#fff', fontSize: 20, fontFamily: font.extrabold, marginBottom: 6, lineHeight: 26 }} numberOfLines={2}>
          {post.title}
        </Text>
        {post.body && (
          <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 14, fontFamily: font.regular, lineHeight: 20 }} numberOfLines={3}>
            {post.body}
          </Text>
        )}
        {post.cta_text && !isMember && (
          <Text style={{ color: brand.pink, fontSize: 13, fontFamily: font.bold, marginTop: 10 }}>
            🎁 {post.cta_text}
          </Text>
        )}
      </View>
    </View>
  )
}

/**
 * TikTok-style discovery feed: full-screen vertical paging through
 * publications from ALL businesses, location-first. One-tap club join.
 */
export default function DiscoveryFeedScreen({ height: heightProp }: { height?: number }) {
  const { t } = useTranslation()
  const { height: windowHeight } = useWindowDimensions()
  const [containerHeight, setContainerHeight] = useState<number | null>(heightProp ?? null)
  const pageHeight = heightProp ?? containerHeight ?? windowHeight

  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [joiningId, setJoiningId] = useState<string | null>(null)
  const [justJoined, setJustJoined] = useState<Set<string>>(new Set())

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
  const { data: posts = [], isLoading, refetch, isRefetching } = useDiscoveryFeed(userLocation?.lat, userLocation?.lng)
  const { data: memberships = [] } = useMemberships(user?.id)
  const enroll = useEnrollBusiness()

  const memberBusinessIds = useMemo(
    () => new Set(memberships.map((m) => m.business_id)),
    [memberships],
  )

  const handleJoin = useCallback((post: DiscoveryPost) => {
    const token = post.businesses?.qr_code_token
    const jwt = session?.access_token
    if (!token || !jwt) return
    setJoiningId(post.business_id)
    enroll.mutate(
      { token, userJwt: jwt },
      {
        onSettled: () => setJoiningId(null),
        onSuccess: () => setJustJoined((prev) => new Set(prev).add(post.business_id)),
      },
    )
  }, [session?.access_token, enroll])

  const renderItem = useCallback(({ item, index }: { item: DiscoveryPost; index: number }) => (
    <PostItem
      post={item}
      height={pageHeight}
      index={index}
      isMember={memberBusinessIds.has(item.business_id) || justJoined.has(item.business_id)}
      joining={joiningId === item.business_id}
      onJoin={handleJoin}
    />
  ), [pageHeight, memberBusinessIds, justJoined, joiningId, handleJoin])

  return (
    <View
      style={{ flex: 1, backgroundColor: '#000' }}
      onLayout={(e) => setContainerHeight(e.nativeEvent.layout.height)}
    >
      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={brand.purple} size="large" />
        </View>
      ) : posts.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <Text style={{ fontSize: 44, marginBottom: 12 }}>📭</Text>
          <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 15, fontFamily: font.medium, textAlign: 'center' }}>
            {t('feed.empty')}
          </Text>
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          snapToInterval={pageHeight}
          decelerationRate="fast"
          getItemLayout={(_, index) => ({ length: pageHeight, offset: pageHeight * index, index })}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#fff" />}
        />
      )}
    </View>
  )
}
