import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { consumePendingToken } from '../enroll'

export default function Verify() {
  const params = useLocalSearchParams<{ phone: string }>()
  const phone = Array.isArray(params.phone) ? params.phone[0] : params.phone
  const router = useRouter()
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleVerify() {
    setLoading(true)
    const { data, error } = await supabase.auth.verifyOtp({
      phone: phone!,
      token: otp,
      type: 'sms',
    })
    setLoading(false)
    if (error) {
      Alert.alert('Invalid code', error.message)
    } else if (data.session) {
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
      className="flex-1 bg-white justify-center px-6"
    >
      <Text className="text-3xl font-bold text-gray-800 mb-2">Enter your code</Text>
      <Text className="text-gray-500 mb-8">
        We sent a 6-digit code to {phone}
        {'\n'}In local dev, use <Text className="font-mono font-bold">000000</Text>
      </Text>

      <TextInput
        className="border border-gray-200 rounded-xl px-4 py-4 text-2xl text-center tracking-widest mb-4 bg-gray-50"
        placeholder="000000"
        keyboardType="number-pad"
        maxLength={6}
        value={otp}
        onChangeText={setOtp}
      />

      <TouchableOpacity
        className="bg-brand rounded-full py-4 items-center"
        onPress={handleVerify}
        disabled={loading || otp.length < 6}
      >
        <Text className="text-white font-semibold text-base">
          {loading ? 'Verifying...' : 'Verify'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity className="mt-4 items-center" onPress={() => router.back()}>
        <Text className="text-gray-400 text-sm">Wrong number? Go back</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  )
}
