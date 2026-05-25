import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '../../lib/supabase'

export default function SignIn() {
  const router = useRouter()
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSendOtp() {
    const formatted = phone.startsWith('+') ? phone : `+${phone}`
    setLoading(true)
    const { error } = await supabase.auth.signInWithOtp({ phone: formatted })
    setLoading(false)
    if (error) {
      Alert.alert('Error', error.message)
    } else {
      router.push({ pathname: '/(auth)/verify', params: { phone: formatted } })
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-white justify-center px-6"
    >
      <Text className="text-3xl font-bold text-gray-800 mb-2">Welcome to Clubby</Text>
      <Text className="text-gray-500 mb-8">Enter your phone number to get started</Text>

      <TextInput
        className="border border-gray-200 rounded-xl px-4 py-4 text-base mb-4 bg-gray-50"
        placeholder="+1 555 000 0000"
        keyboardType="phone-pad"
        autoComplete="tel"
        value={phone}
        onChangeText={setPhone}
      />

      <TouchableOpacity
        className="bg-brand rounded-full py-4 items-center"
        onPress={handleSendOtp}
        disabled={loading || phone.length < 7}
      >
        <Text className="text-white font-semibold text-base">
          {loading ? 'Sending...' : 'Continue'}
        </Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  )
}
