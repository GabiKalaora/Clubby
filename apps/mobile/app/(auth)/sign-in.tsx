import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, Linking, Image } from 'react-native'
import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabase'

const PORTAL_URL = process.env.EXPO_PUBLIC_PORTAL_URL ?? 'http://localhost:5174'

export default function SignIn() {
  const router = useRouter()
  const { t } = useTranslation()
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
      className="flex-1 bg-white dark:bg-gray-900 justify-center px-6"
    >
      {/* Wordmark logo */}
      <View className="items-center mb-10">
        <Image
          source={require('../../assets/wordmark.png')}
          style={{ width: 200, height: 60 }}
          resizeMode="contain"
        />
        <Text className="text-gray-400 dark:text-gray-500 text-sm mt-2">{t('auth.signIn.logoTagline')}</Text>
      </View>

      <Text className="text-xl font-bold text-gray-800 dark:text-white mb-1">{t('auth.signIn.welcome')}</Text>
      <Text className="text-gray-500 dark:text-gray-400 mb-6">{t('auth.signIn.subtitle')}</Text>

      <TextInput
        className="border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-4 text-base mb-4 bg-gray-50 dark:bg-gray-800 dark:text-white"
        placeholder={t('auth.signIn.phonePlaceholder')}
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
          {loading ? t('auth.signIn.sending') : t('auth.signIn.continue')}
        </Text>
      </TouchableOpacity>

      <View className="mt-10 items-center">
        <Text className="text-gray-400 text-sm mb-1">{t('auth.signIn.ownBusiness')}</Text>
        <TouchableOpacity onPress={() => Linking.openURL(PORTAL_URL)}>
          <Text className="text-brand font-semibold text-sm">{t('auth.signIn.goToPortal')}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}
