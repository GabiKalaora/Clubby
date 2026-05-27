import { useEffect, useState } from 'react'
import {
  View, Text, TouchableOpacity, ActivityIndicator,
  ScrollView, Image,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { supabase } from '../lib/supabase'

type Business = {
  id: string
  name: string
  category: string
  description: string | null
  logo_url: string | null
}

type Benefit = {
  id: string
  title: string
  description: string | null
  type: string
  amount_cents?: number
  discount_percent?: number
  free_item_description?: string | null
}

type EnrollResult = {
  business: Business
  welcomeBenefit: Benefit | null
  alreadyMember: boolean
}

const PENDING_TOKEN_KEY = 'clubby_pending_enroll_token'

export function savePendingToken(token: string) {
  if (typeof window !== 'undefined') sessionStorage.setItem(PENDING_TOKEN_KEY, token)
}

export function consumePendingToken(): string | null {
  if (typeof window === 'undefined') return null
  const t = sessionStorage.getItem(PENDING_TOKEN_KEY)
  if (t) sessionStorage.removeItem(PENDING_TOKEN_KEY)
  return t
}

async function callEnroll(token: string, accessToken: string): Promise<{ result?: EnrollResult; error?: string }> {
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!
  const res = await fetch(`${supabaseUrl}/functions/v1/enroll-member`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
      'apikey': process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
    },
    body: JSON.stringify({ token }),
  })
  const json = await res.json()
  if (!res.ok) return { error: json.error ?? 'Enrollment failed' }
  return { result: json }
}

export default function EnrollScreen() {
  const { token } = useLocalSearchParams<{ token: string }>()
  const router = useRouter()
  const [status, setStatus] = useState<'loading' | 'needs-auth' | 'success' | 'error'>('loading')
  const [result, setResult] = useState<EnrollResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) { router.replace('/(tabs)/wallet'); return }

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        savePendingToken(token)
        setStatus('needs-auth')
        return
      }
      const { result: r, error: e } = await callEnroll(token, session.access_token)
      if (e) { setError(e); setStatus('error') }
      else { setResult(r!); setStatus('success') }
    })
  }, [token])

  if (status === 'loading') {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 items-center justify-center">
        <ActivityIndicator size="large" color="#2ecc71" />
        <Text className="text-gray-500 mt-4 text-base">Joining club…</Text>
      </SafeAreaView>
    )
  }

  if (status === 'needs-auth') {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center px-8">
        <Text className="text-5xl mb-6">🏪</Text>
        <Text className="text-2xl font-bold text-gray-900 mb-2 text-center">
          Join the Club
        </Text>
        <Text className="text-gray-500 text-center text-base mb-10">
          Sign in to claim your welcome benefit and join this store's loyalty club.
        </Text>
        <TouchableOpacity
          className="bg-brand rounded-full py-4 items-center w-full"
          onPress={() => router.push('/(auth)/sign-in')}
        >
          <Text className="text-white font-bold text-base">Sign in to join</Text>
        </TouchableOpacity>
      </SafeAreaView>
    )
  }

  if (status === 'error') {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center px-8">
        <Text className="text-4xl mb-4">😕</Text>
        <Text className="text-red-500 text-center mb-6">{error}</Text>
        <TouchableOpacity onPress={() => router.replace('/(tabs)/wallet')}>
          <Text className="text-brand font-semibold text-base">Go to wallet</Text>
        </TouchableOpacity>
      </SafeAreaView>
    )
  }

  // success
  if (!result) return null
  const { business, welcomeBenefit } = result

  function benefitLabel() {
    if (!welcomeBenefit) return null
    if (welcomeBenefit.type === 'credit' && welcomeBenefit.amount_cents != null)
      return `₪${(welcomeBenefit.amount_cents / 100).toFixed(2)} credit`
    if (welcomeBenefit.type === 'discount' && welcomeBenefit.discount_percent != null)
      return `${welcomeBenefit.discount_percent}% off`
    return welcomeBenefit.free_item_description ?? welcomeBenefit.title
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView
        contentContainerStyle={{ alignItems: 'center', paddingVertical: 40, paddingHorizontal: 24 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Business logo */}
        <View className="w-24 h-24 rounded-2xl bg-gray-200 items-center justify-center mb-6 overflow-hidden shadow-sm">
          {business.logo_url ? (
            <Image source={{ uri: business.logo_url }} className="w-full h-full" resizeMode="cover" />
          ) : (
            <Text className="text-4xl">🏪</Text>
          )}
        </View>

        {/* Checkmark */}
        <View className="w-16 h-16 rounded-full bg-brand items-center justify-center mb-4">
          <Text className="text-white text-3xl">✓</Text>
        </View>

        <Text className="text-2xl font-bold text-gray-900 text-center mb-1">You're in!</Text>
        <Text className="text-base text-gray-500 text-center mb-8">
          Welcome to <Text className="font-semibold text-gray-800">{business.name}</Text> Club
        </Text>

        {/* Welcome benefit */}
        {welcomeBenefit && (
          <View className="w-full bg-white rounded-2xl p-5 mb-5 shadow-sm border border-gray-100">
            <Text className="text-xs font-semibold text-brand uppercase tracking-wider mb-1">
              Welcome Gift
            </Text>
            <Text className="text-lg font-bold text-gray-900">{welcomeBenefit.title}</Text>
            {welcomeBenefit.description && (
              <Text className="text-gray-500 text-sm mt-1">{welcomeBenefit.description}</Text>
            )}
            <View className="mt-3 bg-brand/10 rounded-xl px-3 py-2 self-start">
              <Text className="text-brand font-semibold text-sm">{benefitLabel()}</Text>
            </View>
          </View>
        )}

        {/* Business info */}
        {(business.category || business.description) && (
          <View className="w-full bg-white rounded-2xl p-4 mb-8 shadow-sm border border-gray-100">
            {business.category && (
              <Text className="text-xs text-gray-400 uppercase tracking-wider">{business.category}</Text>
            )}
            {business.description && (
              <Text className="text-gray-600 text-sm mt-1">{business.description}</Text>
            )}
          </View>
        )}

        <TouchableOpacity
          className="bg-brand rounded-full px-10 py-4 w-full items-center"
          onPress={() => router.replace('/(tabs)/wallet')}
        >
          <Text className="text-white font-bold text-base">View my wallet</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}
