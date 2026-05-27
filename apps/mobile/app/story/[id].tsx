import { useState, useEffect, useRef } from 'react'
import {
  View, Text, Image, TouchableOpacity, TouchableWithoutFeedback,
  Linking, StyleSheet, Dimensions, Animated,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window')
const STORY_DURATION = 5000

type Story = {
  id: string
  business_id: string
  image_url: string | null
  caption: string | null
  cta_text: string | null
  cta_url: string | null
  expires_at: string
  businesses: { name: string; logo_url: string | null } | null
}

function useBusinessStories(businessId: string) {
  return useQuery({
    queryKey: ['stories-viewer', businessId],
    enabled: !!businessId,
    staleTime: 60_000,
    queryFn: async (): Promise<Story[]> => {
      const { data, error } = await supabase
        .from('stories')
        .select('id, business_id, image_url, caption, cta_text, cta_url, expires_at, businesses(name, logo_url)')
        .eq('business_id', businessId)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: true })

      if (error) throw error
      return (data ?? []) as Story[]
    },
  })
}

export default function StoryViewer() {
  const router = useRouter()
  const params = useLocalSearchParams<{ businessId: string; startIndex?: string }>()
  const businessId = Array.isArray(params.businessId) ? params.businessId[0] : params.businessId
  const startIndex = Array.isArray(params.startIndex) ? params.startIndex[0] : params.startIndex
  const [index, setIndex] = useState(parseInt(startIndex ?? '0') || 0)
  const progress = useRef(new Animated.Value(0)).current
  const animRef = useRef<Animated.CompositeAnimation | null>(null)

  const { data: stories = [], isLoading } = useBusinessStories(businessId)

  const story = stories[index]

  function startProgress() {
    progress.setValue(0)
    animRef.current = Animated.timing(progress, {
      toValue: 1,
      duration: STORY_DURATION,
      useNativeDriver: false,
    })
    animRef.current.start(({ finished }) => {
      if (finished) goNext()
    })
  }

  function stopProgress() {
    animRef.current?.stop()
  }

  useEffect(() => {
    if (stories.length > 0 && index < stories.length) {
      startProgress()
    }
    return () => stopProgress()
  }, [index, stories.length])

  function goNext() {
    if (index < stories.length - 1) {
      setIndex(i => i + 1)
    } else {
      router.back()
    }
  }

  function goPrev() {
    if (index > 0) {
      setIndex(i => i - 1)
    }
  }

  function handleTap(side: 'left' | 'right') {
    stopProgress()
    if (side === 'left') goPrev()
    else goNext()
  }

  if (isLoading || !story) {
    return (
      <View style={styles.container}>
        <Text style={{ color: 'white' }}>Loading…</Text>
      </View>
    )
  }

  const bizName = story.businesses?.name ?? ''
  const logoUrl = story.businesses?.logo_url ?? null

  return (
    <View style={styles.container}>
      {/* Background image */}
      {story.image_url ? (
        <Image source={{ uri: story.image_url }} style={styles.bg} resizeMode="cover" />
      ) : (
        <View style={[styles.bg, { backgroundColor: '#1a1a2e' }]} />
      )}

      {/* Dark gradient overlay */}
      <View style={styles.overlay} />

      {/* Progress bars */}
      <SafeAreaView style={styles.safeTop}>
        <View style={styles.progressRow}>
          {stories.map((_, i) => (
            <View key={i} style={styles.progressBg}>
              <Animated.View
                style={[
                  styles.progressFill,
                  {
                    width: i < index
                      ? '100%'
                      : i === index
                      ? progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] })
                      : '0%',
                  },
                ]}
              />
            </View>
          ))}
        </View>

        {/* Business header */}
        <View style={styles.header}>
          <View style={styles.bizRow}>
            {logoUrl ? (
              <Image source={{ uri: logoUrl }} style={styles.logo} />
            ) : (
              <View style={[styles.logo, styles.logoPlaceholder]}>
                <Text style={{ color: 'white', fontSize: 12 }}>{bizName[0]}</Text>
              </View>
            )}
            <Text style={styles.bizName}>{bizName}</Text>
          </View>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Tap zones */}
      <View style={styles.tapRow} pointerEvents="box-none">
        <TouchableWithoutFeedback onPress={() => handleTap('left')}>
          <View style={styles.tapZone} />
        </TouchableWithoutFeedback>
        <TouchableWithoutFeedback onPress={() => handleTap('right')}>
          <View style={styles.tapZone} />
        </TouchableWithoutFeedback>
      </View>

      {/* Bottom content */}
      <SafeAreaView style={styles.safeBottom} edges={['bottom']}>
        <View style={styles.bottom}>
          {story.caption ? (
            <Text style={styles.caption}>{story.caption}</Text>
          ) : null}
          {story.cta_text && story.cta_url ? (
            <TouchableOpacity
              style={styles.ctaBtn}
              onPress={() => Linking.openURL(story.cta_url!)}
            >
              <Text style={styles.ctaText}>{story.cta_text}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  bg: { position: 'absolute', width: SCREEN_W, height: SCREEN_H },
  overlay: {
    position: 'absolute', width: SCREEN_W, height: SCREEN_H,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  safeTop: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 },
  progressRow: { flexDirection: 'row', gap: 4, paddingHorizontal: 12, paddingTop: 8 },
  progressBg: { flex: 1, height: 2, backgroundColor: 'rgba(255,255,255,0.35)', borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: 'white', borderRadius: 2 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingTop: 10 },
  bizRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logo: { width: 34, height: 34, borderRadius: 17, borderWidth: 2, borderColor: 'white' },
  logoPlaceholder: { backgroundColor: '#2ecc71', alignItems: 'center', justifyContent: 'center' },
  bizName: { color: 'white', fontWeight: '600', fontSize: 14 },
  closeBtn: { padding: 6 },
  closeText: { color: 'white', fontSize: 18, fontWeight: '700' },
  tapRow: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, flexDirection: 'row', zIndex: 5 },
  tapZone: { flex: 1 },
  safeBottom: { position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 10 },
  bottom: { paddingHorizontal: 20, paddingBottom: 24, gap: 12 },
  caption: { color: 'white', fontSize: 16, fontWeight: '500', textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  ctaBtn: { backgroundColor: 'white', borderRadius: 24, paddingVertical: 12, paddingHorizontal: 24, alignSelf: 'flex-start' },
  ctaText: { color: '#1a1a2e', fontWeight: '700', fontSize: 14 },
})
