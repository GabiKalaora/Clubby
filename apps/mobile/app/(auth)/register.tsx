import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, StatusBar, ActivityIndicator, Image } from 'react-native'
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
  const [error, setError] = useState('')

  async function handleRegister() {
    setError('')
    const displayName = `${firstName.trim()} ${lastName.trim()}`.trim()
    if (!displayName) {
      setError('Please enter your name')
      return
    }
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const { error: updateErr } = await supabase
      .from('profiles')
      .update({ display_name: displayName })
      .eq('id', user.id)

    setLoading(false)
    if (updateErr) {
      setError(updateErr.message)
      return
    }

    const pendingToken = consumePendingToken()
    if (pendingToken) {
      router.replace({ pathname: '/enroll', params: { token: pendingToken } } as never)
      return
    }
    const onboarded = await AsyncStorage.getItem(ONBOARDED_KEY)
    if (!onboarded) {
      router.replace('/(auth)/onboarding' as never)
    } else {
      router.replace('/(tabs)/wallet')
    }
  }

  const canSubmit = firstName.trim().length > 0

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: '#151617' }}
    >
      <StatusBar barStyle="light-content" backgroundColor="#151617" />
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 28, paddingVertical: 48 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Wordmark */}
        <View style={{ alignItems: 'center', marginBottom: 48 }}>
          <Image
            source={require('../../assets/wordmark.png')}
            style={{ width: 180, height: 52 }}
            resizeMode="contain"
          />
        </View>

        <Text style={{ color: '#ffffff', fontSize: 28, fontFamily: 'Urbanist_700Bold', marginBottom: 6 }}>
          Create your account
        </Text>
        <Text style={{ color: '#8e969f', fontSize: 15, fontFamily: 'Urbanist_400Regular', marginBottom: 32 }}>
          Almost there — just your name
        </Text>

        <Text style={{ color: '#8e969f', fontSize: 13, fontFamily: 'Urbanist_600SemiBold', marginBottom: 8, textTransform: 'uppercase' }}>
          First name
        </Text>
        <TextInput
          style={{
            backgroundColor: '#1e2022', borderWidth: 1, borderColor: '#2a2d2f',
            borderRadius: 14, paddingHorizontal: 16,
            paddingVertical: Platform.OS === 'ios' ? 18 : 14,
            color: '#ffffff', fontSize: 15, fontFamily: 'Urbanist_500Medium', marginBottom: 16,
          }}
          placeholder="Jane"
          placeholderTextColor="#4a5260"
          autoComplete="given-name"
          value={firstName}
          onChangeText={v => { setFirstName(v); setError('') }}
        />

        <Text style={{ color: '#8e969f', fontSize: 13, fontFamily: 'Urbanist_600SemiBold', marginBottom: 8, textTransform: 'uppercase' }}>
          Last name
        </Text>
        <TextInput
          style={{
            backgroundColor: '#1e2022', borderWidth: 1, borderColor: '#2a2d2f',
            borderRadius: 14, paddingHorizontal: 16,
            paddingVertical: Platform.OS === 'ios' ? 18 : 14,
            color: '#ffffff', fontSize: 15, fontFamily: 'Urbanist_500Medium', marginBottom: 24,
          }}
          placeholder="Smith"
          placeholderTextColor="#4a5260"
          autoComplete="family-name"
          value={lastName}
          onChangeText={setLastName}
        />

        {error ? (
          <View style={{ backgroundColor: '#ef444418', borderRadius: 12, padding: 12, marginBottom: 16 }}>
            <Text style={{ color: '#ef4444', fontSize: 13, fontFamily: 'Urbanist_500Medium' }}>{error}</Text>
          </View>
        ) : null}

        <TouchableOpacity
          onPress={handleRegister}
          disabled={loading || !canSubmit}
          style={{
            backgroundColor: canSubmit ? '#1a7a4a' : '#1e2022',
            borderRadius: 16, paddingVertical: 18, alignItems: 'center',
            shadowColor: '#1a7a4a', shadowOpacity: canSubmit ? 0.4 : 0,
            shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: canSubmit ? 6 : 0,
          }}
        >
          {loading
            ? <ActivityIndicator color="white" />
            : <Text style={{ color: canSubmit ? '#ffffff' : '#4a5260', fontSize: 17, fontFamily: 'Urbanist_700Bold' }}>
                Get started
              </Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
