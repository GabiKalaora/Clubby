import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, Linking } from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '../../lib/supabase'

const PORTAL_URL = process.env.EXPO_PUBLIC_PORTAL_URL ?? 'http://localhost:5174'

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
      {/* Logo mark */}
      <View className="items-center mb-10">
        <View className="w-20 h-20 rounded-3xl bg-brand items-center justify-center mb-4 shadow-sm shadow-brand/30">
          <Text style={{ fontSize: 40 }}>🏪</Text>
        </View>
        <Text className="text-3xl font-bold text-gray-900">Clubby</Text>
        <Text className="text-gray-400 text-sm mt-1">Your loyalty wallet</Text>
      </View>

      <Text className="text-xl font-bold text-gray-800 mb-1">Welcome</Text>
      <Text className="text-gray-500 mb-6">Enter your phone number to get started</Text>

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

      <View className="mt-10 items-center">
        <Text className="text-gray-400 text-sm mb-1">Own a business?</Text>
        <TouchableOpacity onPress={() => Linking.openURL(PORTAL_URL)}>
          <Text className="text-brand font-semibold text-sm">Go to Business Portal →</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}
