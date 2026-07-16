import { useState, useRef } from 'react'
import {
  View, Text, TouchableOpacity, ScrollView, Dimensions, StatusBar,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import AsyncStorage from '@react-native-async-storage/async-storage'

export const ONBOARDED_KEY = '@clubby_onboarded'

const { width } = Dimensions.get('window')

const SLIDE_META = [
  { icon: '🏪', bg: '#f5f0ff', accent: '#a855f7' },
  { icon: '📱', bg: '#fdf0f8', accent: '#ec4899' },
  { icon: '🎁', bg: '#f5f0ff', accent: '#c084fc' },
  { icon: '🥇', bg: '#fffbeb', accent: '#f59e0b' },
]

export default function Onboarding() {
  const router = useRouter()
  const { t } = useTranslation()
  const scrollRef = useRef<ScrollView>(null)
  const [current, setCurrent] = useState(0)

  const slides = t('onboarding.slides', { returnObjects: true }) as { title: string; body: string }[]

  async function finish() {
    await AsyncStorage.setItem(ONBOARDED_KEY, 'true')
    router.replace('/(tabs)/home')
  }

  function goNext() {
    if (current < SLIDE_META.length - 1) {
      const next = current + 1
      scrollRef.current?.scrollTo({ x: next * width, animated: true })
      setCurrent(next)
    } else {
      finish()
    }
  }

  const isLast = current === SLIDE_META.length - 1

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8f9fa' }}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />

      {/* Skip */}
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 20, paddingTop: 8 }}>
        <TouchableOpacity onPress={finish}>
          <Text style={{ color: '#94a3b8', fontSize: 14, fontFamily: 'PlusJakartaSans_500Medium' }}>
            {t('onboarding.skip')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Slides */}
      <View style={{ flex: 1, overflow: 'hidden' }}>
        <ScrollView
          ref={scrollRef}
          horizontal pagingEnabled scrollEnabled={false}
          showsHorizontalScrollIndicator={false}
          style={{ flex: 1 }}
          onMomentumScrollEnd={e => {
            const page = Math.round(e.nativeEvent.contentOffset.x / width)
            setCurrent(page)
          }}
        >
          {SLIDE_META.map((meta, i) => {
            const slide = slides[i] ?? { title: '', body: '' }
            return (
              <View key={i} style={{ width, flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
                {/* Icon card */}
                <View style={{
                  width: 128, height: 128, borderRadius: 28, alignItems: 'center',
                  justifyContent: 'center', marginBottom: 40, backgroundColor: meta.bg,
                }}>
                  <Text style={{ fontSize: 64 }}>{meta.icon}</Text>
                </View>

                <Text style={{
                  fontSize: 28, fontFamily: 'PlusJakartaSans_800ExtraBold',
                  color: '#2d3748', textAlign: 'center', letterSpacing: -0.5, marginBottom: 16,
                }}>
                  {slide.title}
                </Text>
                <Text style={{
                  fontSize: 16, fontFamily: 'PlusJakartaSans_400Regular',
                  color: '#64748b', textAlign: 'center', lineHeight: 24,
                }}>
                  {slide.body}
                </Text>
              </View>
            )
          })}
        </ScrollView>
      </View>

      {/* Progress dots */}
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 24 }}>
        {SLIDE_META.map((meta, i) => (
          <View key={i} style={{
            width: i === current ? 24 : 8, height: 8, borderRadius: 4,
            backgroundColor: i === current ? meta.accent : '#e2e8f0',
          }} />
        ))}
      </View>

      {/* CTA button */}
      <View style={{ paddingHorizontal: 24, paddingBottom: 32 }}>
        <TouchableOpacity onPress={goNext} activeOpacity={0.85}>
          <LinearGradient
            colors={['#ec4899', '#a855f7']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={{
              borderRadius: 999, paddingVertical: 16, alignItems: 'center',
              shadowColor: '#a855f7', shadowOpacity: 0.35, shadowRadius: 14, elevation: 6,
            }}
          >
            <Text style={{ color: '#ffffff', fontSize: 16, fontFamily: 'PlusJakartaSans_700Bold' }}>
              {isLast ? t('onboarding.getStarted') : t('onboarding.next')}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}
