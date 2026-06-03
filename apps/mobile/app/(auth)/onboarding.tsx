import { useState, useRef } from 'react'
import {
  View, Text, TouchableOpacity, ScrollView, Dimensions,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'

export const ONBOARDED_KEY = '@clubby_onboarded'

const { width } = Dimensions.get('window')

const SLIDES = [
  {
    icon: '🏪',
    title: 'Discover local clubs',
    body: 'Join your favourite shops, cafés, and services with one scan. No plastic cards needed.',
    bg: '#f0fdf4',
    accent: '#2ecc71',
  },
  {
    icon: '📱',
    title: 'Scan to join',
    body: 'Point your camera at any Clubby QR code — you\'re instantly a member and may receive a welcome gift.',
    bg: '#eff6ff',
    accent: '#3b82f6',
  },
  {
    icon: '🎁',
    title: 'Earn rewards',
    body: 'Collect stamps, points, and exclusive benefits just for visiting. Every scan gets you closer to a reward.',
    bg: '#fdf4ff',
    accent: '#a855f7',
  },
  {
    icon: '🥇',
    title: 'Rise through the tiers',
    body: 'The more you visit, the higher your loyalty tier — Bronze, Silver, Gold. Higher tiers unlock better perks.',
    bg: '#fffbeb',
    accent: '#f59e0b',
  },
]

export default function Onboarding() {
  const router = useRouter()
  const scrollRef = useRef<ScrollView>(null)
  const [current, setCurrent] = useState(0)

  async function finish() {
    await AsyncStorage.setItem(ONBOARDED_KEY, 'true')
    router.replace('/(tabs)/wallet')
  }

  function next() {
    if (current < SLIDES.length - 1) {
      const next = current + 1
      scrollRef.current?.scrollTo({ x: next * width, animated: true })
      setCurrent(next)
    } else {
      finish()
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Skip button */}
      <View className="flex-row justify-end px-5 pt-2">
        <TouchableOpacity onPress={finish}>
          <Text className="text-gray-400 text-sm font-medium">Skip</Text>
        </TouchableOpacity>
      </View>

      {/* Slides */}
      <View style={{ flex: 1, overflow: 'hidden' }}>
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          scrollEnabled={false}
          showsHorizontalScrollIndicator={false}
          style={{ flex: 1 }}
          onMomentumScrollEnd={e => {
            const page = Math.round(e.nativeEvent.contentOffset.x / width)
            setCurrent(page)
          }}
        >
          {SLIDES.map((slide, i) => (
            <View key={i} style={{ width, flex: 1 }} className="items-center justify-center px-8">
              {/* Icon card */}
              <View
                className="w-32 h-32 rounded-3xl items-center justify-center mb-10"
                style={{ backgroundColor: slide.bg }}
              >
                <Text style={{ fontSize: 64 }}>{slide.icon}</Text>
              </View>

              <Text className="text-3xl font-bold text-gray-900 text-center mb-4">
                {slide.title}
              </Text>
              <Text className="text-base text-gray-500 text-center leading-6">
                {slide.body}
              </Text>
            </View>
          ))}
        </ScrollView>
      </View>

      {/* Dots */}
      <View className="flex-row justify-center gap-x-2 mb-6">
        {SLIDES.map((slide, i) => (
          <View
            key={i}
            style={{
              width: i === current ? 20 : 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: i === current ? SLIDES[current].accent : '#e5e7eb',
            }}
          />
        ))}
      </View>

      {/* Next / Get started */}
      <View className="px-6 pb-8">
        <TouchableOpacity
          className="rounded-full py-4 items-center"
          style={{ backgroundColor: SLIDES[current].accent }}
          onPress={next}
        >
          <Text className="text-white text-base font-bold">
            {current === SLIDES.length - 1 ? 'Get started →' : 'Next'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}
