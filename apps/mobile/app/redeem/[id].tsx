import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import {
  View, Text, TouchableOpacity, ActivityIndicator, Animated,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useCurrentUser } from '../../hooks/useAuth'
import type { Benefit } from '../../hooks/useBenefits'

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
  const { t } = useTranslation()
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const qc = useQueryClient()

  const [redeemed, setRedeemed] = useState(false)
  const [redeeming, setRedeeming] = useState(false)
  const [redeemError, setRedeemError] = useState('')
  const [countdown, setCountdown] = useState(60)
  const scaleAnim = useState(() => new Animated.Value(0))[0]
  const pulseAnim = useRef(new Animated.Value(1)).current
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Pulse animation on the value badge
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.06, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    )
    pulse.start()
    return () => pulse.stop()
  }, [pulseAnim])

  // Countdown timer — resets to 60s each time the screen mounts or user re-opens
  useEffect(() => {
    if (redeemed) return
    timerRef.current = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { clearInterval(timerRef.current!); return 0 }
        return c - 1
      })
    }, 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [redeemed])

  const { data: user } = useCurrentUser()

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

  async function handleRedeem() {
    if (!user || !benefit) return
    setRedeeming(true)
    const { error } = await supabase
      .from('benefits')
      .update({ redeemed: true, redeemed_at: new Date().toISOString() })
      .eq('id', benefit.id)
      .eq('user_id', user.id)
    setRedeeming(false)
    if (error) {
      setRedeemError(error.message)
      return
    }
    qc.invalidateQueries({ queryKey: ['benefits', user.id] })
    qc.invalidateQueries({ queryKey: ['benefits-all', user.id] })
    setRedeemed(true)
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, bounciness: 14 }).start()
    const timer = setTimeout(() => router.back(), 2500)
    return () => clearTimeout(timer)
  }

  if (isLoading || !benefit) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#f8f9fa', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#c084fc" />
      </SafeAreaView>
    )
  }

  const businessName = benefit.businesses?.name ?? 'the store'

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8f9fa' }}>
      {/* Back button */}
      <TouchableOpacity
        style={{ position: 'absolute', top: 56, left: 20, zIndex: 10, width: 36, height: 36, borderRadius: 18, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' }}
        onPress={() => router.back()}
      >
        <Text style={{ color: '#64748b', fontSize: 18 }}>‹</Text>
      </TouchableOpacity>

      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
        {redeemed ? (
          /* ── Success state ── */
          <Animated.View style={{ transform: [{ scale: scaleAnim }], alignItems: 'center' }}>
            <LinearGradient
              colors={['#ec4899', '#a855f7']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={{ width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}
            >
              <Text style={{ fontSize: 48 }}>✓</Text>
            </LinearGradient>
            <Text style={{ fontSize: 24, fontFamily: "PlusJakartaSans_700Bold", color: "#2d3748", marginBottom: 8 }}>{t('redeem.redeemed')}</Text>
            <Text style={{ color: "#64748b", fontSize: 15, textAlign: "center" }}>
              {t('redeem.enjoyAt', { value: valueLabel(benefit), business: businessName })}
            </Text>
          </Animated.View>
        ) : (
          /* ── Confirm state ── */
          <>
            <Text style={{ fontSize: 48, marginBottom: 24 }}>🎁</Text>

            <Text style={{ fontSize: 24, fontFamily: "PlusJakartaSans_700Bold", color: "#2d3748", textAlign: "center", marginBottom: 8 }}>
              {benefit.title}
            </Text>

            {/* Pulsing value badge */}
            <Animated.View style={{ transform: [{ scale: pulseAnim }], marginBottom: 4 }}>
              <Text style={{ color: '#a855f7', fontSize: 36, fontFamily: 'PlusJakartaSans_800ExtraBold', textAlign: 'center' }}>
                {valueLabel(benefit)}
              </Text>
            </Animated.View>
            <Text style={{ color: '#94a3b8', fontSize: 13, marginBottom: 28 }}>at {businessName}</Text>

            <View style={{ backgroundColor: 'rgba(168,85,247,0.08)', borderWidth: 1, borderColor: 'rgba(168,85,247,0.2)', borderRadius: 16, paddingHorizontal: 24, paddingVertical: 16, marginBottom: 16, width: '100%' }}>
              <Text style={{ color: '#7c3aed', fontSize: 14, textAlign: 'center', fontFamily: 'PlusJakartaSans_500Medium' }}>
                {t('redeem.showToCashier')}
              </Text>
            </View>

            {/* Countdown timer */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 28 }}>
              <View style={{
                width: 40, height: 40, borderRadius: 20,
                backgroundColor: countdown <= 10 ? '#ef444415' : '#f5f0ff',
                alignItems: 'center', justifyContent: 'center',
                borderWidth: 1.5, borderColor: countdown <= 10 ? '#ef4444' : '#a855f7',
              }}>
                <Text style={{
                  fontSize: 14, fontFamily: 'PlusJakartaSans_700Bold',
                  color: countdown <= 10 ? '#ef4444' : '#a855f7',
                }}>{countdown}</Text>
              </View>
              <Text style={{ color: '#64748b', fontSize: 13, fontFamily: 'PlusJakartaSans_400Regular' }}>
                {countdown > 0 ? 'seconds to confirm' : 'Code expired — tap to refresh'}
              </Text>
            </View>

            {redeemError ? (
              <View style={{ backgroundColor: '#ef444418', borderRadius: 12, padding: 12, marginBottom: 16, width: '100%' }}>
                <Text style={{ color: '#ef4444', fontSize: 13, textAlign: 'center' }}>{redeemError}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              disabled={redeeming || countdown === 0}
              onPress={handleRedeem}
              style={{ width: '100%' }}
            >
              <LinearGradient
                colors={countdown === 0 ? ['#e2e8f0', '#e2e8f0'] : ['#ec4899', '#a855f7']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={{ borderRadius: 999, paddingVertical: 16, alignItems: 'center',
                  shadowColor: countdown === 0 ? 'transparent' : '#a855f7',
                  shadowOpacity: 0.35, shadowRadius: 14, elevation: countdown === 0 ? 0 : 6 }}
              >
                {redeeming
                  ? <ActivityIndicator color="white" />
                  : <Text style={{ color: countdown === 0 ? '#94a3b8' : 'white', fontSize: 16, fontFamily: 'PlusJakartaSans_600SemiBold' }}>
                      {countdown === 0 ? 'Code expired' : t('redeem.confirmRedemption')}
                    </Text>}
              </LinearGradient>
            </TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  )
}
