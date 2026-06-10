import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, StatusBar, ActivityIndicator, Image } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabase'
import { consumePendingToken } from '../enroll'

export default function Verify() {
  const params = useLocalSearchParams<{ phone: string }>()
  const phone = Array.isArray(params.phone) ? params.phone[0] : params.phone
  const router = useRouter()
  const { t } = useTranslation()
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleVerify() {
    setError('')
    setLoading(true)
    const { data, error: verifyErr } = await supabase.auth.verifyOtp({
      phone: phone!,
      token: otp,
      type: 'sms',
    })
    setLoading(false)
    if (verifyErr) {
      setError(verifyErr.message)
      return
    }
    if (data.session) {
      const pendingToken = consumePendingToken()
      if (pendingToken) {
        router.replace({ pathname: '/enroll', params: { token: pendingToken } } as never)
        return
      }
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', data.session.user.id)
        .single()
      if (!profile?.display_name) {
        router.replace('/(auth)/register')
      } else {
        router.replace('/(tabs)/wallet')
      }
    }
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
        </View>

        <Text style={{ color: '#ffffff', fontSize: 28, fontFamily: 'Urbanist_700Bold', marginBottom: 6 }}>
          {t('auth.verify.title')}
        </Text>
        <Text style={{ color: '#8e969f', fontSize: 15, fontFamily: 'Urbanist_400Regular', marginBottom: 8 }}>
          {t('auth.verify.subtitle', { phone })}
        </Text>
        {(process.env.EXPO_PUBLIC_SUPABASE_URL ?? '').includes('127.0.0.1') ? (
          <Text style={{ color: '#4a5260', fontSize: 13, fontFamily: 'Urbanist_400Regular', marginBottom: 32 }}>
            Local dev: use <Text style={{ color: '#2ecc71', fontFamily: 'Urbanist_700Bold' }}>000000</Text>
          </Text>
        ) : <View style={{ height: 32 }} />}

        {/* OTP input */}
        <TextInput
          style={{
            backgroundColor: '#1e2022',
            borderWidth: 1,
            borderColor: error ? '#ef444455' : '#2a2d2f',
            borderRadius: 16,
            paddingHorizontal: 16,
            paddingVertical: Platform.OS === 'ios' ? 20 : 16,
            color: '#ffffff',
            fontSize: 32,
            fontFamily: 'Urbanist_700Bold',
            textAlign: 'center',
            letterSpacing: 12,
            marginBottom: 12,
          }}
          placeholder="------"
          placeholderTextColor="#2a2d2f"
          keyboardType="number-pad"
          maxLength={6}
          value={otp}
          onChangeText={v => { setOtp(v); setError('') }}
        />

        {/* Error */}
        {error ? (
          <View style={{ backgroundColor: '#ef444418', borderRadius: 12, padding: 12, marginBottom: 16 }}>
            <Text style={{ color: '#ef4444', fontSize: 13, fontFamily: 'Urbanist_500Medium' }}>{error}</Text>
          </View>
        ) : <View style={{ height: 16 }} />}

        {/* CTA */}
        <TouchableOpacity
          onPress={handleVerify}
          disabled={loading || otp.length < 6}
          style={{
            backgroundColor: otp.length >= 6 ? '#1a7a4a' : '#1e2022',
            borderRadius: 16, paddingVertical: 18, alignItems: 'center', marginBottom: 20,
            shadowColor: '#1a7a4a', shadowOpacity: otp.length >= 6 ? 0.4 : 0,
            shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: otp.length >= 6 ? 6 : 0,
          }}
        >
          {loading
            ? <ActivityIndicator color="white" />
            : <Text style={{ color: otp.length >= 6 ? '#ffffff' : '#4a5260', fontSize: 17, fontFamily: 'Urbanist_700Bold' }}>
                {t('auth.verify.verify')}
              </Text>}
        </TouchableOpacity>

        <TouchableOpacity style={{ alignItems: 'center' }} onPress={() => router.back()}>
          <Text style={{ color: '#4a5260', fontSize: 14, fontFamily: 'Urbanist_500Medium' }}>
            {t('auth.verify.wrongNumber')}
          </Text>
        </TouchableOpacity>

      </View>
    </KeyboardAvoidingView>
  )
}
