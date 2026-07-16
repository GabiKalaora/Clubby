import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, StatusBar, ActivityIndicator, Image,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabase'
import { consumePendingToken } from '../enroll'
import { ErrorBanner } from '../../components/ErrorBanner'

const S = {
  bg:         '#f8f9fa',
  card:       '#ffffff',
  border:     '#e2e8f0',
  foreground: '#2d3748',
  muted:      '#64748b',
  primary:    '#a855f7',
  disabled:   '#e2e8f0',
  disabledTxt:'#94a3b8',
}

const isLocal = (process.env.EXPO_PUBLIC_SUPABASE_URL ?? '').includes('127.0.0.1')

export default function Verify() {
  const params = useLocalSearchParams<{ phone: string }>()
  const phone = Array.isArray(params.phone) ? params.phone[0] : params.phone
  const router = useRouter()
  const { t } = useTranslation()
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const canVerify = otp.length >= 6

  async function handleVerify() {
    setError('')
    setLoading(true)
    const { data, error: verifyErr } = await supabase.auth.verifyOtp({
      phone: phone!, token: otp, type: 'sms',
    })
    setLoading(false)
    if (verifyErr) { setError(verifyErr.message); return }
    if (data.session) {
      const pendingToken = consumePendingToken()
      if (pendingToken) {
        router.replace({ pathname: '/enroll', params: { token: pendingToken } } as never)
        return
      }
      const { data: profile } = await supabase
        .from('profiles').select('display_name').eq('id', data.session.user.id).single()
      if (!profile?.display_name) router.replace('/(auth)/register')
      else router.replace('/(tabs)/home')
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: S.bg }}
    >
      <StatusBar barStyle="dark-content" backgroundColor={S.bg} />
      <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 28 }}>

        {/* Wordmark */}
        <View style={{ alignItems: 'center', marginBottom: 44 }}>
          <Image source={require('../../assets/wordmark.png')} style={{ width: 180, height: 52 }} resizeMode="contain" />
        </View>

        <Text style={{ color: S.foreground, fontSize: 30, fontFamily: 'PlusJakartaSans_800ExtraBold', letterSpacing: -0.8, marginBottom: 6 }}>
          {t('auth.verify.title')}
        </Text>
        <Text style={{ color: S.muted, fontSize: 15, fontFamily: 'PlusJakartaSans_400Regular', marginBottom: 6 }}>
          {t('auth.verify.subtitle', { phone })}
        </Text>
        {isLocal && (
          <Text style={{ color: S.muted, fontSize: 13, fontFamily: 'PlusJakartaSans_400Regular', marginBottom: 28 }}>
            Local dev: use <Text style={{ color: S.primary, fontFamily: 'PlusJakartaSans_700Bold' }}>000000</Text>
          </Text>
        )}
        {!isLocal && <View style={{ height: 28 }} />}

        {/* OTP input */}
        <TextInput
          style={{
            backgroundColor: S.card, borderWidth: 1.5,
            borderColor: error ? '#ef4444' : (otp.length > 0 ? S.primary : S.border),
            borderRadius: 12, paddingHorizontal: 16,
            paddingVertical: Platform.OS === 'ios' ? 18 : 14,
            color: S.foreground, fontSize: 32, fontFamily: 'PlusJakartaSans_700Bold',
            textAlign: 'center', letterSpacing: 12, marginBottom: 12,
            shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
          }}
          placeholder="——————"
          placeholderTextColor={S.disabledTxt}
          keyboardType="number-pad"
          maxLength={6}
          value={otp}
          onChangeText={v => { setOtp(v); setError('') }}
        />

        <ErrorBanner message={error} />
        {!error && <View style={{ height: 12 }} />}

        {/* CTA */}
        <TouchableOpacity onPress={handleVerify} disabled={loading || !canVerify} activeOpacity={0.85}>
          {canVerify && !loading ? (
            <LinearGradient
              colors={['#ec4899', '#a855f7']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={{ borderRadius: 999, paddingVertical: 16, alignItems: 'center', marginBottom: 20,
                shadowColor: '#a855f7', shadowOpacity: 0.35, shadowRadius: 14, elevation: 6 }}
            >
              <Text style={{ color: '#fff', fontSize: 16, fontFamily: 'PlusJakartaSans_600SemiBold' }}>
                {t('auth.verify.verify')}
              </Text>
            </LinearGradient>
          ) : (
            <View style={{ borderRadius: 999, paddingVertical: 16, alignItems: 'center', marginBottom: 20,
              backgroundColor: loading ? '#a855f720' : S.disabled }}>
              {loading
                ? <ActivityIndicator color="#a855f7" />
                : <Text style={{ color: S.disabledTxt, fontSize: 16, fontFamily: 'PlusJakartaSans_600SemiBold' }}>
                    {t('auth.verify.verify')}
                  </Text>}
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={{ alignItems: 'center' }} onPress={() => router.back()}>
          <Text style={{ color: S.muted, fontSize: 14, fontFamily: 'PlusJakartaSans_500Medium' }}>
            {t('auth.verify.wrongNumber')}
          </Text>
        </TouchableOpacity>

      </View>
    </KeyboardAvoidingView>
  )
}
