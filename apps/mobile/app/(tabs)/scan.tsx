import { useState, useCallback, useRef } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  ActivityIndicator, Image, Platform, ScrollView,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { CameraView, useCameraPermissions } from 'expo-camera'
import { supabase } from '../../lib/supabase'
import { WebQRCamera } from '../../components/WebQRCamera'

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

export default function Scan() {
  const { t } = useTranslation()
  const router = useRouter()
  const [permission, requestPermission] = useCameraPermissions()
  const [manualToken, setManualToken] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<EnrollResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const scannedRef = useRef(false)

  const enroll = useCallback(async (token: string) => {
    if (!token.trim()) return
    setLoading(true)
    setError(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setError('Not logged in'); setLoading(false); return }

      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!
      const res = await fetch(`${supabaseUrl}/functions/v1/enroll-member`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
        },
        body: JSON.stringify({ token: token.trim() }),
      })

      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? 'Enrollment failed')
      } else {
        setResult(json)
      }
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  const handleQRScan = useCallback(({ data }: { data: string }) => {
    // Prevent firing twice on the same scan
    if (scannedRef.current || loading || result) return
    scannedRef.current = true

    // Accept either full deep-link or bare token
    let token = data
    try {
      const url = new URL(data)
      token = url.searchParams.get('token') ?? data
    } catch {
      // bare token — use as-is
    }
    enroll(token)
  }, [enroll, loading, result])

  const reset = () => {
    setResult(null)
    setError(null)
    setManualToken('')
    scannedRef.current = false
  }

  // ── Confirmation card ─────────────────────────────────────────────────────
  if (result) {
    return <ConfirmationCard result={result} onDone={reset} />
  }

  // ── Loading overlay ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-900 items-center justify-center">
        <ActivityIndicator size="large" color="#c084fc" />
        <Text className="text-white mt-4">{t('enroll.joining')}</Text>
      </SafeAreaView>
    )
  }

  // ── Web: branded placeholder + prominent manual entry ────────────────────────
  if (Platform.OS === 'web') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#1a0533' }}>
        {/* Top: branded QR visual */}
        <View style={{ flex: 1 }}>
          <WebQRCamera onScan={(token) => { scannedRef.current = true; enroll(token) }} />
        </View>

        {/* Bottom: manual entry — prominent, not an afterthought */}
        <View style={{ backgroundColor: '#f8f9fa', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 32 }}>
          <Text style={{ color: '#2d3748', fontSize: 17, fontFamily: 'PlusJakartaSans_700Bold', textAlign: 'center', marginBottom: 4 }}>
            {t('scan.enterManually')}
          </Text>
          <Text style={{ color: '#64748b', fontSize: 13, fontFamily: 'PlusJakartaSans_400Regular', textAlign: 'center', marginBottom: 16 }}>
            {t('scan.tokenPlaceholder')}
          </Text>
          <TextInput
            style={{
              backgroundColor: '#ffffff', color: '#2d3748', borderRadius: 14,
              paddingHorizontal: 16, paddingVertical: 14, marginBottom: 12,
              fontSize: 15, textAlign: 'center', fontFamily: 'PlusJakartaSans_500Medium',
              borderWidth: 1.5, borderColor: manualToken.trim() ? '#a855f7' : '#e2e8f0',
              shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
            }}
            placeholder="e.g. pizza-roma-qr"
            placeholderTextColor="#94a3b8"
            value={manualToken}
            onChangeText={setManualToken}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {error && (
            <Text style={{ color: '#ef4444', textAlign: 'center', fontSize: 13, fontFamily: 'PlusJakartaSans_500Medium', marginBottom: 10 }}>
              {error}
            </Text>
          )}
          <TouchableOpacity
            onPress={() => enroll(manualToken)}
            disabled={!manualToken.trim()}
            activeOpacity={0.85}
          >
            {manualToken.trim() ? (
              <LinearGradient
                colors={['#ec4899', '#a855f7']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={{ borderRadius: 999, paddingVertical: 15, alignItems: 'center',
                  shadowColor: '#a855f7', shadowOpacity: 0.35, shadowRadius: 10, elevation: 5 }}
              >
                <Text style={{ color: 'white', fontSize: 15, fontFamily: 'PlusJakartaSans_600SemiBold' }}>{t('scan.join')}</Text>
              </LinearGradient>
            ) : (
              <View style={{ borderRadius: 999, paddingVertical: 15, alignItems: 'center', backgroundColor: '#e2e8f0' }}>
                <Text style={{ color: '#94a3b8', fontSize: 15, fontFamily: 'PlusJakartaSans_600SemiBold' }}>{t('scan.join')}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  // ── Camera permission not yet requested ───────────────────────────────────
  if (!permission) {
    return (
      <SafeAreaView className="flex-1 bg-gray-900 items-center justify-center">
        <ActivityIndicator color="#c084fc" />
      </SafeAreaView>
    )
  }

  if (!permission.granted) {
    return (
      <SafeAreaView className="flex-1 bg-gray-900 items-center justify-center px-8">
        <Text className="text-white text-xl font-semibold mb-4 text-center">
          {t('scan.permissionTitle')}
        </Text>
        <Text className="text-gray-400 text-center mb-8">
          {t('scan.permissionSubtitle')}
        </Text>
        <TouchableOpacity
          className="bg-primary rounded-full px-8 py-4"
          onPress={requestPermission}
        >
          <Text className="text-white font-bold">{t('scan.grantPermission')}</Text>
        </TouchableOpacity>
        <Text className="text-gray-500 mt-6 text-sm">or</Text>
        <TextInput
          className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 mt-4 text-center"
          placeholder={t('scan.tokenPlaceholder')}
          placeholderTextColor="#6b7280"
          value={manualToken}
          onChangeText={setManualToken}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {error && <Text className="text-red-400 mt-2 text-center">{error}</Text>}
        <TouchableOpacity
          className="bg-gray-700 rounded-full px-8 py-3 mt-3"
          onPress={() => enroll(manualToken)}
          disabled={!manualToken.trim()}
        >
          <Text className="text-white font-semibold">{t('scan.join')}</Text>
        </TouchableOpacity>
      </SafeAreaView>
    )
  }

  // ── Camera scanner ────────────────────────────────────────────────────────
  return (
    <View className="flex-1 bg-black">
      <CameraView
        style={{ flex: 1 }}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={handleQRScan}
      />
      {/* Overlay */}
      <View className="absolute inset-0 items-center justify-center pointer-events-none">
        <View className="w-64 h-64 border-2 border-primary rounded-2xl" />
      </View>
      {/* Bottom hint */}
      <SafeAreaView edges={['bottom']} className="absolute bottom-0 left-0 right-0 items-center pb-6">
        <Text className="text-white text-base font-medium">
          {t('scan.pointCamera')}
        </Text>
        {error && (
          <Text className="text-red-400 mt-2 text-sm">{error}</Text>
        )}
      </SafeAreaView>
    </View>
  )
}

// ── Confirmation card component ───────────────────────────────────────────────
function ConfirmationCard({ result, onDone }: { result: EnrollResult; onDone: () => void }) {
  const { t } = useTranslation()
  const router = useRouter()
  const { business, welcomeBenefit, alreadyMember } = result

  const benefitLabel = () => {
    if (!welcomeBenefit) return null
    if (welcomeBenefit.type === 'credit' && welcomeBenefit.amount_cents != null) {
      return `₪${(welcomeBenefit.amount_cents / 100).toFixed(2)} credit`
    }
    if (welcomeBenefit.type === 'discount' && welcomeBenefit.discount_percent != null) {
      return `${welcomeBenefit.discount_percent}% off`
    }
    return welcomeBenefit.free_item_description ?? welcomeBenefit.title
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50 items-center justify-center px-6">
      <ScrollView contentContainerStyle={{ alignItems: 'center', paddingVertical: 32 }} showsVerticalScrollIndicator={false}>
        {/* Logo */}
        <View className="w-24 h-24 rounded-2xl bg-gray-200 items-center justify-center mb-6 overflow-hidden shadow-sm">
          {business.logo_url ? (
            <Image source={{ uri: business.logo_url }} className="w-full h-full" resizeMode="cover" />
          ) : (
            <Text className="text-4xl">🏪</Text>
          )}
        </View>

        {/* Checkmark */}
        <View className="w-16 h-16 rounded-full bg-primary items-center justify-center mb-4">
          <Text className="text-white text-3xl">✓</Text>
        </View>

        <Text className="text-2xl font-bold text-gray-900 text-center mb-1">
          {alreadyMember ? t('enroll.welcomeBack') : t('enroll.youreIn')}
        </Text>
        <Text className="text-base text-gray-500 text-center mb-6">
          {alreadyMember
            ? t('enroll.alreadyMemberHint')
            : t('scan.welcomeAt', { name: business.name })}
        </Text>

        {/* Welcome benefit */}
        {welcomeBenefit && (
          <View className="w-full bg-white rounded-2xl p-5 mb-6 shadow-sm border border-gray-100">
            <Text className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">
              {t('enroll.welcomeGift')}
            </Text>
            <Text className="text-lg font-bold text-gray-900">{welcomeBenefit.title}</Text>
            {welcomeBenefit.description && (
              <Text className="text-gray-500 text-sm mt-1">{welcomeBenefit.description}</Text>
            )}
            <View className="mt-3 bg-primary/10 rounded-xl px-3 py-2 self-start">
              <Text className="text-primary font-semibold text-sm">{benefitLabel()}</Text>
            </View>
          </View>
        )}

        {/* Business info */}
        <View className="w-full bg-white rounded-2xl p-4 mb-8 shadow-sm border border-gray-100">
          {business.category && (
            <Text className="text-xs text-gray-400 uppercase tracking-wider">{business.category}</Text>
          )}
          {business.description && (
            <Text className="text-gray-600 text-sm mt-1">{business.description}</Text>
          )}
        </View>

        <TouchableOpacity
          className="bg-primary rounded-full px-10 py-4 w-full items-center"
          onPress={() => { onDone(); router.replace('/(tabs)/wallet') }}
        >
          <Text className="text-white font-bold text-base">{t('enroll.viewWallet')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}
