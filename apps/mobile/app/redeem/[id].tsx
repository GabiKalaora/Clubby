import { useEffect, useRef, useState } from 'react'
import {
  View, Text, TouchableOpacity, ActivityIndicator, Animated,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import type { Benefit } from '../../hooks/useBenefits'

const CODE_TTL = 60 // seconds

// HMAC-SHA256 via Web Crypto; produces a 6-digit decimal code
async function makeCode(benefitId: string, userId: string, window: number): Promise<string> {
  const msg = `${benefitId}:${window}`
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(userId),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(msg))
  const arr = new Uint8Array(sig)
  const num = ((arr[0] << 16) | (arr[1] << 8) | arr[2]) % 1_000_000
  return String(num).padStart(6, '0')
}

function formatCode(code: string): string {
  return `${code.slice(0, 3)} ${code.slice(3)}`
}

function valueLabel(benefit: Benefit): string {
  if (benefit.type === 'credit' && benefit.amount_cents != null) {
    return `₪${(benefit.amount_cents / 100).toFixed(0)}`
  }
  if (benefit.type === 'discount' && benefit.discount_percent != null) {
    return `${benefit.discount_percent}% off`
  }
  return benefit.free_item_description ?? benefit.title
}

export default function RedeemScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const qc = useQueryClient()

  const [code, setCode] = useState('')
  const [secondsLeft, setSecondsLeft] = useState(CODE_TTL)
  const [redeemed, setRedeemed] = useState(false)
  const [redeeming, setRedeeming] = useState(false)

  const progressAnim = useRef(new Animated.Value(1)).current
  const checkAnim = useRef(new Animated.Value(0)).current
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      return user
    },
    staleTime: Infinity,
  })

  const { data: benefit, isLoading } = useQuery({
    queryKey: ['benefit', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('benefits')
        .select('*, businesses(name, logo_url)')
        .eq('id', id)
        .single()
      if (error) throw error
      return data as Benefit
    },
    enabled: !!id,
    staleTime: 0,
  })

  function currentWindow() {
    return Math.floor(Date.now() / 1000 / CODE_TTL)
  }

  async function refreshCode() {
    if (!user || !id) return
    const w = currentWindow()
    const c = await makeCode(id, user.id, w)
    setCode(c)
    const elapsed = (Date.now() / 1000) % CODE_TTL
    const remaining = Math.ceil(CODE_TTL - elapsed)
    setSecondsLeft(remaining)

    progressAnim.setValue(remaining / CODE_TTL)
    Animated.timing(progressAnim, {
      toValue: 0,
      duration: remaining * 1000,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) refreshCode()
    })
  }

  useEffect(() => {
    if (!user) return
    refreshCode()
    timerRef.current = setInterval(() => {
      setSecondsLeft(s => {
        if (s <= 1) return CODE_TTL
        return s - 1
      })
    }, 1000)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [user, id])

  async function handleRedeem() {
    if (!user || !benefit) return
    setRedeeming(true)
    const { error } = await supabase
      .from('benefits')
      .update({ redeemed: true, redeemed_at: new Date().toISOString() })
      .eq('id', benefit.id)
      .eq('user_id', user.id)
    setRedeeming(false)
    if (error) return
    qc.invalidateQueries({ queryKey: ['benefits', user.id] })
    setRedeemed(true)
    if (timerRef.current) clearInterval(timerRef.current)
    // Bounce the check in
    Animated.spring(checkAnim, { toValue: 1, useNativeDriver: true, bounciness: 14 }).start()
    setTimeout(() => router.back(), 2500)
  }

  if (isLoading || !benefit) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator color="#2ecc71" />
      </SafeAreaView>
    )
  }

  const businessName = benefit.businesses?.name ?? 'the store'
  const circumference = 2 * Math.PI * 44

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Back button */}
      <TouchableOpacity
        className="absolute top-14 left-5 z-10 w-9 h-9 rounded-full bg-gray-100 items-center justify-center"
        onPress={() => router.back()}
      >
        <Text className="text-base">←</Text>
      </TouchableOpacity>

      <View className="flex-1 items-center justify-center px-8">
        {redeemed ? (
          /* ── Post-redemption state ── */
          <Animated.View style={{ transform: [{ scale: checkAnim }] }} className="items-center">
            <View className="w-24 h-24 rounded-full bg-brand items-center justify-center mb-6">
              <Text style={{ fontSize: 48 }}>✓</Text>
            </View>
            <Text className="text-2xl font-bold text-gray-900 mb-2">Redeemed!</Text>
            <Text className="text-gray-500 text-base text-center">
              Enjoy your {valueLabel(benefit)} at {businessName}
            </Text>
          </Animated.View>
        ) : (
          /* ── Active redemption state ── */
          <>
            {/* Benefit info */}
            <View className="items-center mb-8">
              <Text className="text-4xl mb-3">🎁</Text>
              <Text className="text-2xl font-bold text-gray-900 text-center mb-1">
                {benefit.title}
              </Text>
              <Text className="text-brand text-3xl font-bold">{valueLabel(benefit)}</Text>
              <Text className="text-gray-500 text-sm mt-1">at {businessName}</Text>
            </View>

            {/* Countdown ring */}
            <View className="items-center justify-center mb-6" style={{ width: 120, height: 120 }}>
              <View style={{ position: 'absolute' }}>
                <Text className="text-4xl font-bold text-gray-900 text-center" style={{ width: 100, textAlign: 'center' }}>
                  {secondsLeft}
                </Text>
                <Text className="text-xs text-gray-400 text-center">sec</Text>
              </View>
              {/* SVG-free ring using a border trick */}
              <Animated.View style={{
                width: 100, height: 100, borderRadius: 50,
                borderWidth: 6,
                borderColor: progressAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['#e5e7eb', '#2ecc71'],
                }),
                position: 'absolute',
              }} />
            </View>

            {/* 6-digit code */}
            <View className="bg-gray-50 border border-gray-200 rounded-2xl px-10 py-5 mb-8 items-center w-full">
              <Text className="text-4xl font-bold tracking-widest text-gray-900 font-mono">
                {code ? formatCode(code) : '— —'}
              </Text>
              <Text className="text-xs text-gray-400 mt-2">Show this code to the cashier</Text>
            </View>

            {/* Redeem button */}
            <TouchableOpacity
              className="bg-brand rounded-full py-4 w-full items-center"
              disabled={redeeming}
              onPress={handleRedeem}
            >
              {redeeming ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white text-base font-bold">Confirm redemption</Text>
              )}
            </TouchableOpacity>

            <Text className="text-gray-400 text-xs mt-4 text-center">
              The cashier can verify this code in the portal.{'\n'}
              Code refreshes every {CODE_TTL} seconds.
            </Text>
          </>
        )}
      </View>
    </SafeAreaView>
  )
}
