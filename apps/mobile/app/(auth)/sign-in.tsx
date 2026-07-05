import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, Linking, Image, StatusBar, ActivityIndicator,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabase'
import { ErrorBanner } from '../../components/ErrorBanner'

const PORTAL_URL = process.env.EXPO_PUBLIC_PORTAL_URL ?? 'http://localhost:5174'

const S = {
  bg:          '#f8f9fa',
  card:        '#ffffff',
  border:      '#e2e8f0',
  foreground:  '#2d3748',
  muted:       '#64748b',
  primary:     '#a855f7',
  errorBorder: '#ef4444',
  disabled:    '#e2e8f0',
  disabledTxt: '#94a3b8',
}

export default function SignIn() {
  const router = useRouter()
  const { t } = useTranslation()
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const isLocal = (process.env.EXPO_PUBLIC_SUPABASE_URL ?? '').includes('127.0.0.1')
  const canSubmit = phone.length >= 7

  async function handleContinue() {
    setError('')
    const formatted = phone.startsWith('+') ? phone : `+${phone}`
    if (formatted.length < 8) { setError('Enter a valid phone number'); return }
    setLoading(true)

    if (isLocal) {
      // Local dev: skip phone lookup (anon key blocked by RLS), go straight to OTP
      setLoading(false)
      router.push({ pathname: '/(auth)/verify', params: { phone: formatted } })
      return
    }

    const { error: otpErr } = await supabase.auth.signInWithOtp({ phone: formatted })
    setLoading(false)
    if (otpErr) {
      setError(otpErr.message.includes('not found') || otpErr.message.includes('invalid')
        ? 'Phone number not found. Scan a store QR code to join first.'
        : otpErr.message)
      return
    }
    router.push({ pathname: '/(auth)/verify', params: { phone: formatted } })
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: S.bg }}
    >
      <StatusBar barStyle="dark-content" backgroundColor={S.bg} />
      <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 28 }}>

        {/* Wordmark */}
        <View style={{ alignItems: 'center', marginBottom: 48 }}>
          <Image
            source={require('../../assets/wordmark.png')}
            style={{ width: 180, height: 52 }}
            resizeMode="contain"
          />
          <Text style={{ color: S.muted, fontSize: 14, fontFamily: 'PlusJakartaSans_400Regular', marginTop: 6 }}>
            {t('auth.signIn.logoTagline')}
          </Text>
        </View>

        <Text style={{ color: S.foreground, fontSize: 30, fontFamily: 'PlusJakartaSans_800ExtraBold', letterSpacing: -0.8, marginBottom: 6 }}>
          {t('auth.signIn.welcome')}
        </Text>
        <Text style={{ color: S.muted, fontSize: 15, fontFamily: 'PlusJakartaSans_400Regular', marginBottom: 28 }}>
          {t('auth.signIn.subtitle')}
        </Text>

        {/* Phone input */}
        <View style={{
          flexDirection: 'row', alignItems: 'center',
          backgroundColor: S.card, borderRadius: 12,
          borderWidth: 1.5, borderColor: error ? S.errorBorder : S.border,
          paddingHorizontal: 16, marginBottom: 10,
          shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
        }}>
          <Text style={{ color: S.muted, fontSize: 18, marginEnd: 8 }}>📞</Text>
          <TextInput
            style={{ flex: 1, color: S.foreground, fontSize: 15, fontFamily: 'PlusJakartaSans_500Medium', paddingVertical: Platform.OS === 'ios' ? 16 : 13 }}
            placeholder={t('auth.signIn.phonePlaceholder')}
            placeholderTextColor={S.disabledTxt}
            keyboardType="phone-pad"
            autoComplete="tel"
            value={phone}
            onChangeText={v => { setPhone(v); setError('') }}
          />
        </View>

        <ErrorBanner message={error} />
        {!error && <View style={{ height: 12 }} />}

        {/* CTA */}
        <TouchableOpacity onPress={handleContinue} disabled={loading || !canSubmit} activeOpacity={0.85}>
          {canSubmit && !loading ? (
            <LinearGradient
              colors={['#ec4899', '#a855f7']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={{ borderRadius: 999, paddingVertical: 16, alignItems: 'center', marginBottom: 28,
                shadowColor: '#a855f7', shadowOpacity: 0.35, shadowRadius: 14, elevation: 6 }}
            >
              <Text style={{ color: '#fff', fontSize: 16, fontFamily: 'PlusJakartaSans_600SemiBold' }}>
                {t('auth.signIn.continue')}
              </Text>
            </LinearGradient>
          ) : (
            <View style={{ borderRadius: 999, paddingVertical: 16, alignItems: 'center', marginBottom: 28,
              backgroundColor: loading ? '#a855f720' : S.disabled }}>
              {loading
                ? <ActivityIndicator color="#a855f7" />
                : <Text style={{ color: S.disabledTxt, fontSize: 16, fontFamily: 'PlusJakartaSans_600SemiBold' }}>
                    {t('auth.signIn.continue')}
                  </Text>}
            </View>
          )}
        </TouchableOpacity>

        {/* Portal link */}
        <View style={{ alignItems: 'center' }}>
          <Text style={{ color: S.muted, fontSize: 13, fontFamily: 'PlusJakartaSans_400Regular', marginBottom: 4 }}>
            {t('auth.signIn.ownBusiness')}
          </Text>
          <TouchableOpacity onPress={() => Linking.openURL(PORTAL_URL)}>
            <Text style={{ color: S.primary, fontSize: 14, fontFamily: 'PlusJakartaSans_600SemiBold' }}>
              {t('auth.signIn.goToPortal')} →
            </Text>
          </TouchableOpacity>
        </View>

        {/* Value prop — why join */}
        <View style={{ marginTop: 36, gap: 10 }}>
          {[
            { icon: '🎁', text: t('auth.signIn.vp1') },
            { icon: '🥇', text: t('auth.signIn.vp2') },
            { icon: '📍', text: t('auth.signIn.vp3') },
          ].map(({ icon, text }) => (
            <View key={text} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#f5f0ff', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 18 }}>{icon}</Text>
              </View>
              <Text style={{ color: S.muted, fontSize: 13, fontFamily: 'PlusJakartaSans_400Regular', flex: 1 }}>{text}</Text>
            </View>
          ))}
        </View>

      </View>
    </KeyboardAvoidingView>
  )
}
