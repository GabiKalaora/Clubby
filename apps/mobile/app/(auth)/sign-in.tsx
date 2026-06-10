import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Linking, Image, StatusBar, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabase'

const PORTAL_URL = process.env.EXPO_PUBLIC_PORTAL_URL ?? 'http://localhost:5174'

export default function SignIn() {
  const router = useRouter()
  const { t } = useTranslation()
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleContinue() {
    setError('')
    const formatted = phone.startsWith('+') ? phone : `+${phone}`
    if (formatted.length < 8) { setError('Enter a valid phone number'); return }

    setLoading(true)

    // Normalize: strip non-digits for flexible matching
    const digits = formatted.replace(/\D/g, '')

    // Check if phone exists in profiles
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id')
      .or(`phone.eq.${formatted},phone.eq.${digits},phone.eq.+${digits}`)
      .limit(1)

    if (!profiles || profiles.length === 0) {
      setLoading(false)
      setError('Phone number not found. Scan a store QR code to join first.')
      return
    }

    // Local dev: skip OTP API (Twilio stub rejects + prefix) — test OTP is always 000000
    const isLocal = (process.env.EXPO_PUBLIC_SUPABASE_URL ?? '').includes('127.0.0.1')
    if (isLocal) {
      setLoading(false)
      router.push({ pathname: '/(auth)/verify', params: { phone: formatted } })
      return
    }

    // Production: send real OTP
    const { error: otpErr } = await supabase.auth.signInWithOtp({ phone: formatted })
    setLoading(false)
    if (otpErr) { setError(otpErr.message); return }
    router.push({ pathname: '/(auth)/verify', params: { phone: formatted } })
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: '#151617' }}
    >
      <StatusBar barStyle="light-content" backgroundColor="#151617" />
      <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 28 }}>

        {/* Wordmark */}
        <View style={{ alignItems: 'center', marginBottom: 48 }}>
          <Image
            source={require('../../assets/wordmark.png')}
            style={{ width: 180, height: 52 }}
            resizeMode="contain"
          />
          <Text style={{ color: '#4a5260', fontSize: 14, fontFamily: 'Urbanist_400Regular', marginTop: 8 }}>
            {t('auth.signIn.logoTagline')}
          </Text>
        </View>

        <Text style={{ color: '#ffffff', fontSize: 28, fontFamily: 'Urbanist_700Bold', marginBottom: 6 }}>
          {t('auth.signIn.welcome')}
        </Text>
        <Text style={{ color: '#8e969f', fontSize: 15, fontFamily: 'Urbanist_400Regular', marginBottom: 32 }}>
          {t('auth.signIn.subtitle')}
        </Text>

        {/* Phone input */}
        <View style={{
          flexDirection: 'row', alignItems: 'center',
          backgroundColor: '#1e2022', borderRadius: 16,
          borderWidth: 1, borderColor: error ? '#ef444455' : '#2a2d2f',
          paddingHorizontal: 16, marginBottom: 12,
        }}>
          <Text style={{ color: '#4a5260', fontSize: 18, marginEnd: 8 }}>📞</Text>
          <TextInput
            style={{ flex: 1, color: '#ffffff', fontSize: 16, fontFamily: 'Urbanist_500Medium', paddingVertical: Platform.OS === 'ios' ? 18 : 14 }}
            placeholder={t('auth.signIn.phonePlaceholder')}
            placeholderTextColor="#4a5260"
            keyboardType="phone-pad"
            autoComplete="tel"
            value={phone}
            onChangeText={v => { setPhone(v); setError('') }}
          />
        </View>

        {/* Error */}
        {error ? (
          <View style={{ backgroundColor: '#ef444418', borderRadius: 12, padding: 12, marginBottom: 16 }}>
            <Text style={{ color: '#ef4444', fontSize: 13, fontFamily: 'Urbanist_500Medium' }}>{error}</Text>
          </View>
        ) : <View style={{ height: 16 }} />}

        {/* CTA */}
        <TouchableOpacity
          onPress={handleContinue}
          disabled={loading || phone.length < 7}
          style={{
            backgroundColor: phone.length >= 7 ? '#1a7a4a' : '#1e2022',
            borderRadius: 16, paddingVertical: 18, alignItems: 'center', marginBottom: 32,
            shadowColor: '#1a7a4a', shadowOpacity: phone.length >= 7 ? 0.4 : 0,
            shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: phone.length >= 7 ? 6 : 0,
          }}
        >
          {loading
            ? <ActivityIndicator color="white" />
            : <Text style={{ color: phone.length >= 7 ? '#ffffff' : '#4a5260', fontSize: 17, fontFamily: 'Urbanist_700Bold' }}>
                {t('auth.signIn.continue')}
              </Text>}
        </TouchableOpacity>

        {/* Portal link */}
        <View style={{ alignItems: 'center' }}>
          <Text style={{ color: '#4a5260', fontSize: 13, fontFamily: 'Urbanist_400Regular', marginBottom: 6 }}>
            {t('auth.signIn.ownBusiness')}
          </Text>
          <TouchableOpacity onPress={() => Linking.openURL(PORTAL_URL)}>
            <Text style={{ color: '#2ecc71', fontSize: 14, fontFamily: 'Urbanist_600SemiBold' }}>
              {t('auth.signIn.goToPortal')} →
            </Text>
          </TouchableOpacity>
        </View>

      </View>
    </KeyboardAvoidingView>
  )
}
