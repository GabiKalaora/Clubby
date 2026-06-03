import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native'
import { useRouter } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from '../../lib/supabase'
import { consumePendingToken } from '../enroll'
import { ONBOARDED_KEY } from './onboarding'

export default function Register() {
  const router = useRouter()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleRegister() {
    const displayName = `${firstName.trim()} ${lastName.trim()}`.trim()
    if (!displayName) {
      Alert.alert('Error', 'Please enter your name')
      return
    }
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setLoading(false)
      return
    }
    const { error } = await supabase
      .from('profiles')
      .update({ display_name: displayName })
      .eq('id', user.id)
    setLoading(false)
    if (error) {
      Alert.alert('Error', error.message)
    } else {
      const pendingToken = consumePendingToken()
      if (pendingToken) {
        router.replace({ pathname: '/enroll', params: { token: pendingToken } } as never)
        return
      }
      // Show onboarding for new users
      const onboarded = await AsyncStorage.getItem(ONBOARDED_KEY)
      if (!onboarded) {
        router.replace('/(auth)/onboarding' as never)
      } else {
        router.replace('/(tabs)/wallet')
      }
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-white"
    >
      <ScrollView contentContainerClassName="px-6 py-12 justify-center flex-grow">
        <Text className="text-3xl font-bold text-gray-800 mb-2">Create your account</Text>
        <Text className="text-gray-500 mb-8">Almost there — just your name</Text>

        <Text className="text-sm font-medium text-gray-700 mb-1">First name</Text>
        <TextInput
          className="border border-gray-200 rounded-xl px-4 py-4 text-base mb-4 bg-gray-50"
          placeholder="Jane"
          autoComplete="given-name"
          value={firstName}
          onChangeText={setFirstName}
        />

        <Text className="text-sm font-medium text-gray-700 mb-1">Last name</Text>
        <TextInput
          className="border border-gray-200 rounded-xl px-4 py-4 text-base mb-6 bg-gray-50"
          placeholder="Smith"
          autoComplete="family-name"
          value={lastName}
          onChangeText={setLastName}
        />

        <TouchableOpacity
          className="bg-brand rounded-full py-4 items-center"
          onPress={handleRegister}
          disabled={loading}
        >
          <Text className="text-white font-semibold text-base">
            {loading ? 'Creating account...' : 'Get started'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
