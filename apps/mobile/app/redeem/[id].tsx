import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  View, Text, TouchableOpacity, ActivityIndicator, Animated,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
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
  const scaleAnim = useState(() => new Animated.Value(0))[0]

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
    qc.invalidateQueries({ queryKey: ['benefits-all', user.id] })
    setRedeemed(true)
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, bounciness: 14 }).start()
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

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-gray-900">
      {/* Back button */}
      <TouchableOpacity
        className="absolute top-14 left-5 z-10 w-9 h-9 rounded-full bg-gray-100 items-center justify-center"
        onPress={() => router.back()}
      >
        <Text className="text-base">←</Text>
      </TouchableOpacity>

      <View className="flex-1 items-center justify-center px-8">
        {redeemed ? (
          /* ── Success state ── */
          <Animated.View style={{ transform: [{ scale: scaleAnim }] }} className="items-center">
            <View className="w-24 h-24 rounded-full bg-brand items-center justify-center mb-6">
              <Text style={{ fontSize: 48 }}>✓</Text>
            </View>
            <Text className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{t('redeem.redeemed')}</Text>
            <Text className="text-gray-500 text-base text-center">
              {t('redeem.enjoyAt', { value: valueLabel(benefit), business: businessName })}
            </Text>
          </Animated.View>
        ) : (
          /* ── Confirm state ── */
          <>
            <Text className="text-5xl mb-6">🎁</Text>

            <Text className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-2">
              {benefit.title}
            </Text>
            <Text className="text-brand text-3xl font-bold mb-1">
              {valueLabel(benefit)}
            </Text>
            <Text className="text-gray-400 text-sm mb-10">at {businessName}</Text>

            <View className="bg-amber-50 border border-amber-200 rounded-2xl px-6 py-4 mb-10 w-full">
              <Text className="text-amber-800 text-sm text-center font-medium">
                {t('redeem.showToCashier')}
              </Text>
            </View>

            <TouchableOpacity
              className="bg-brand rounded-full py-4 w-full items-center"
              disabled={redeeming}
              onPress={handleRedeem}
            >
              {redeeming ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white text-base font-bold">{t('redeem.confirmRedemption')}</Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  )
}
