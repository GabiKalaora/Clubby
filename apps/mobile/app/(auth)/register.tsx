import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, KeyboardAvoidingView, Platform, StatusBar, ActivityIndicator, Image,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from '../../lib/supabase'
import { consumePendingToken } from '../enroll'
import { ONBOARDED_KEY } from './onboarding'
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

export default function Register() {
  const router = useRouter()
  const { t } = useTranslation()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const canSubmit = firstName.trim().length > 0

  async function handleRegister() {
    setError('')
    const displayName = `${firstName.trim()} ${lastName.trim()}`.trim()
    if (!displayName) { setError(t('auth.register.errors.nameRequired')); return }
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }
    const { error: updateErr } = await supabase.from('profiles')
      .update({ display_name: displayName }).eq('id', user.id)
    setLoading(false)
    if (updateErr) { setError(updateErr.message); return }
    const pendingToken = consumePendingToken()
    if (pendingToken) {
      router.replace({ pathname: '/enroll', params: { token: pendingToken } } as never)
      return
    }
    const onboarded = await AsyncStorage.getItem(ONBOARDED_KEY)
    if (!onboarded) router.replace('/(auth)/onboarding' as never)
    else router.replace('/(tabs)/home')
  }

  const inputStyle = {
    backgroundColor: S.card, borderWidth: 1.5, borderColor: S.border,
    borderRadius: 12, paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 15 : 12,
    color: S.foreground, fontSize: 15, fontFamily: 'PlusJakartaSans_500Medium',
    shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 4, elevation: 1,
  } as const

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: S.bg }}
    >
      <StatusBar barStyle="dark-content" backgroundColor={S.bg} />
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 28, paddingVertical: 48 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ alignItems: 'center', marginBottom: 44 }}>
          <Image source={require('../../assets/wordmark.png')} style={{ width: 180, height: 52 }} resizeMode="contain" />
        </View>

        <Text style={{ color: S.foreground, fontSize: 30, fontFamily: 'PlusJakartaSans_800ExtraBold', letterSpacing: -0.8, marginBottom: 6 }}>
          {t('auth.register.title')}
        </Text>
        <Text style={{ color: S.muted, fontSize: 15, fontFamily: 'PlusJakartaSans_400Regular', marginBottom: 28 }}>
          {t('auth.register.subtitle')}
        </Text>

        <Text style={{ color: S.muted, fontSize: 12, fontFamily: 'PlusJakartaSans_700Bold', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.8 }}>
          {t('auth.register.firstNameLabel')}
        </Text>
        <TextInput
          style={{ ...inputStyle, marginBottom: 16 }}
          placeholder={t('auth.register.firstNamePlaceholder')}
          placeholderTextColor={S.disabledTxt}
          autoComplete="given-name"
          value={firstName}
          onChangeText={v => { setFirstName(v); setError('') }}
        />

        <Text style={{ color: S.muted, fontSize: 12, fontFamily: 'PlusJakartaSans_700Bold', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.8 }}>
          {t('auth.register.lastNameLabel')}
        </Text>
        <TextInput
          style={{ ...inputStyle, marginBottom: 24 }}
          placeholder={t('auth.register.lastNamePlaceholder')}
          placeholderTextColor={S.disabledTxt}
          autoComplete="family-name"
          value={lastName}
          onChangeText={setLastName}
        />

        <ErrorBanner message={error} />

        <TouchableOpacity onPress={handleRegister} disabled={loading || !canSubmit} activeOpacity={0.85}>
          {canSubmit && !loading ? (
            <LinearGradient
              colors={['#ec4899', '#a855f7']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={{ borderRadius: 999, paddingVertical: 16, alignItems: 'center',
                shadowColor: '#a855f7', shadowOpacity: 0.35, shadowRadius: 14, elevation: 6 }}
            >
              <Text style={{ color: '#fff', fontSize: 16, fontFamily: 'PlusJakartaSans_600SemiBold' }}>
                {t('auth.register.getStarted')}
              </Text>
            </LinearGradient>
          ) : (
            <View style={{ borderRadius: 999, paddingVertical: 16, alignItems: 'center',
              backgroundColor: loading ? '#a855f720' : S.disabled }}>
              {loading
                ? <ActivityIndicator color="#a855f7" />
                : <Text style={{ color: S.disabledTxt, fontSize: 16, fontFamily: 'PlusJakartaSans_600SemiBold' }}>
                    {t('auth.register.getStarted')}
                  </Text>}
            </View>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
