import { useState, useEffect } from 'react'
import {
  View, Text, TouchableOpacity, TextInput,
  ActivityIndicator, Alert, Switch, ScrollView, Platform, Image,
} from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import * as ImagePicker from 'expo-image-picker'
import { supabase } from '../lib/supabase'
import { useProfile, useUpdateProfile, type NotificationPrefs } from '../hooks/useProfile'
import { changeLanguage, type SupportedLang } from '../lib/i18n'
import i18n from '../lib/i18n'
import { THEME_KEY, type ThemePreference } from './_layout'

function useCurrentUser() {
  return useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      return user
    },
    staleTime: Infinity,
  })
}

function Avatar({
  name, phone, avatarUrl, onPress, uploading,
}: {
  name: string | null
  phone: string | null
  avatarUrl: string | null
  onPress: () => void
  uploading: boolean
}) {
  const letters = name
    ? name.trim().split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : (phone ?? '?')[0]
  return (
    <TouchableOpacity onPress={onPress} className="items-center mb-3" disabled={uploading}>
      <View className="w-20 h-20 rounded-full bg-brand items-center justify-center overflow-hidden">
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} className="w-full h-full" resizeMode="cover" />
        ) : (
          <Text className="text-white text-3xl font-bold">{letters}</Text>
        )}
        {uploading && (
          <View className="absolute inset-0 bg-black/40 items-center justify-center">
            <ActivityIndicator color="white" size="small" />
          </View>
        )}
      </View>
      <Text className="text-xs text-brand mt-1">📷 Change photo</Text>
    </TouchableOpacity>
  )
}

export default function ProfileScreen() {
  const router = useRouter()
  const { t } = useTranslation()
  const { data: user } = useCurrentUser()
  const { data: profile, isLoading } = useProfile(user?.id)
  const { mutate: updateProfile, isPending: saving } = useUpdateProfile()

  const [editing, setEditing] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [dobInput, setDobInput] = useState('')
  const [editingDob, setEditingDob] = useState(false)
  const [dobError, setDobError] = useState('')
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [themePreference, setThemePreferenceState] = useState<ThemePreference>('auto')

  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY).then(v => { if (v) setThemePreferenceState(v as ThemePreference) })
  }, [])

  async function handleAvatarUpload() {
    if (!user?.id) return
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    })
    if (result.canceled) return

    setUploadingAvatar(true)
    try {
      const uri = result.assets[0].uri
      const ext = uri.split('.').pop() ?? 'jpg'
      const path = `${user.id}/avatar.${ext}`
      const response = await fetch(uri)
      const blob = await response.blob()
      const { error: uploadError } = await supabase.storage
        .from('user-avatars')
        .upload(path, blob, { upsert: true, contentType: `image/${ext}` })
      if (uploadError) throw uploadError
      const { data: { publicUrl } } = supabase.storage.from('user-avatars').getPublicUrl(path)
      updateProfile({ userId: user.id, avatar_url: publicUrl })
    } catch (e) {
      Alert.alert('Upload failed', String(e))
    } finally {
      setUploadingAvatar(false)
    }
  }

  const NOTIF_TYPES: { key: keyof NotificationPrefs; label: string; description: string }[] = [
    { key: 'expiry_reminder', label: t('profile.notifications.expiryReminder'), description: t('profile.notifications.expiryReminderDesc') },
    { key: 'birthday',        label: t('profile.notifications.birthday'),        description: t('profile.notifications.birthdayDesc') },
    { key: 're_engagement',   label: t('profile.notifications.reEngagement'),    description: t('profile.notifications.reEngagementDesc') },
    { key: 'direct_message',  label: t('profile.notifications.directMessage'),   description: t('profile.notifications.directMessageDesc') },
  ]

  function startEdit() {
    setNameInput(profile?.display_name ?? '')
    setEditing(true)
  }

  function saveEdit() {
    if (!user?.id) return
    updateProfile(
      { userId: user.id, display_name: nameInput },
      { onSuccess: () => setEditing(false) },
    )
  }

  function saveDob() {
    if (!user?.id) return
    if (dobInput) {
      const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dobInput)
      if (!match) { setDobError(t('profile.dobError.format')); return }
      const [, y, m, d] = match.map(Number)
      const date = new Date(y, m - 1, d)
      const now = new Date()
      if (date > now) { setDobError(t('profile.dobError.future')); return }
      if (y < 1900) { setDobError(t('profile.dobError.year')); return }
      if (date.getMonth() !== m - 1) { setDobError(t('profile.dobError.invalid')); return }
    }
    setDobError('')
    updateProfile(
      { userId: user.id, date_of_birth: dobInput || null },
      { onSuccess: () => setEditingDob(false) },
    )
  }

  async function handleSignOut() {
    Alert.alert(t('profile.signOutTitle'), t('profile.signOutConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('profile.signOut'), style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut()
          router.replace('/(auth)/sign-in')
        },
      },
    ])
  }

  async function handleLanguageChange(lang: SupportedLang) {
    await changeLanguage(lang)
    if (Platform.OS !== 'web') {
      // On native, I18nManager.forceRTL requires a full reload
      Alert.alert(t('language.restartRequired'), '', [
        { text: t('language.restart'), onPress: () => { /* RN DevMenu.reload() not available — user taps OK */ } },
      ])
    }
    // On web, react-i18next re-renders automatically — no reload needed
  }

  function formatDob(dob: string | null): string {
    if (!dob) return t('profile.notSet')
    const locale = i18n.language === 'he' ? 'he-IL' : 'en-US'
    return new Date(dob + 'T12:00:00').toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <View className="flex-row items-center px-5 pt-2 pb-4">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-9 h-9 rounded-full bg-gray-200 items-center justify-center me-3"
        >
          <Text className="text-base">{t('common.back')}</Text>
        </TouchableOpacity>
        <Text className="text-xl font-bold text-gray-900 dark:text-white">{t('profile.title')}</Text>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#2ecc71" />
        </View>
      ) : (
        <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
          {/* Avatar + name */}
          <View className="items-center py-8">
            <Avatar
              name={profile?.display_name ?? null}
              phone={profile?.phone ?? user?.phone ?? null}
              avatarUrl={profile?.avatar_url ?? null}
              onPress={handleAvatarUpload}
              uploading={uploadingAvatar}
            />

            {editing ? (
              <View className="flex-row items-center gap-x-2 mt-1">
                <TextInput
                  className="border border-gray-300 rounded-xl px-4 py-2 bg-white text-base text-gray-900 min-w-[160px]"
                  value={nameInput}
                  onChangeText={setNameInput}
                  placeholder={t('auth.register.namePlaceholder')}
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={saveEdit}
                />
                <TouchableOpacity className="bg-brand rounded-xl px-4 py-2" onPress={saveEdit} disabled={saving}>
                  <Text className="text-white font-semibold text-sm">{saving ? '…' : t('common.save')}</Text>
                </TouchableOpacity>
                <TouchableOpacity className="rounded-xl px-3 py-2" onPress={() => setEditing(false)}>
                  <Text className="text-gray-500 text-sm">{t('common.cancel')}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity onPress={startEdit} className="flex-row items-center gap-x-1 mt-1">
                <Text className="text-lg font-semibold text-gray-900">
                  {profile?.display_name ?? t('profile.setName')}
                </Text>
                <Text className="text-gray-400 text-sm">{t('common.edit')}</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Info rows */}
          <View className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden mb-4">
            <InfoRow label={t('profile.phone')} value={profile?.phone ?? user?.phone ?? '—'} />
            <InfoRow label={t('profile.email')} value={user?.email ?? '—'} last />
          </View>

          {/* Birthday */}
          <View className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden mb-4">
            <View className="flex-row justify-between items-center px-5 py-4">
              <Text className="text-gray-500 text-sm">{t('profile.dateOfBirth')}</Text>
              {editingDob ? (
                <View className="flex-row items-center gap-x-2">
                  <TextInput
                    className="border border-gray-300 rounded-xl px-3 py-1.5 text-sm text-gray-900 bg-gray-50 w-36"
                    value={dobInput}
                    onChangeText={text => { setDobInput(text); setDobError('') }}
                    placeholder={t('profile.dobPlaceholder')}
                    keyboardType="numbers-and-punctuation"
                    autoFocus
                    returnKeyType="done"
                    onSubmitEditing={saveDob}
                  />
                  <TouchableOpacity className="bg-brand rounded-xl px-3 py-1.5" onPress={saveDob} disabled={saving}>
                    <Text className="text-white text-xs font-semibold">{saving ? '…' : t('common.save')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => { setEditingDob(false); setDobError('') }}>
                    <Text className="text-gray-400 text-sm">✕</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  className="flex-row items-center gap-x-1"
                  onPress={() => { setDobInput(profile?.date_of_birth ?? ''); setEditingDob(true) }}
                >
                  <Text className="text-gray-900 text-sm font-medium">{formatDob(profile?.date_of_birth ?? null)}</Text>
                  <Text className="text-gray-400 text-xs">{t('common.edit')}</Text>
                </TouchableOpacity>
              )}
            </View>
            {!!dobError && (
              <Text className="text-red-500 text-xs px-5 pb-3">{dobError}</Text>
            )}
          </View>

          {/* Language */}
          <View className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden mb-4">
            <View className="px-5 pt-4 pb-2">
              <Text className="text-sm font-semibold text-gray-900">{t('profile.language')}</Text>
              <Text className="text-xs text-gray-400 mt-0.5">{t('profile.languageSubtitle')}</Text>
            </View>
            {(['en', 'he'] as SupportedLang[]).map((lang, i) => (
              <TouchableOpacity
                key={lang}
                className={`flex-row items-center justify-between px-5 py-3.5 ${i === 0 ? 'border-b border-gray-100' : ''}`}
                onPress={() => handleLanguageChange(lang)}
              >
                <Text className="text-sm text-gray-900">
                  {lang === 'en' ? t('language.english') : t('language.hebrew')}
                </Text>
                {i18n.language === lang && (
                  <View className="w-5 h-5 rounded-full bg-brand items-center justify-center">
                    <Text className="text-white text-xs font-bold">✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* Theme */}
          <View className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden mb-4">
            <View className="px-5 pt-4 pb-2">
              <Text className="text-sm font-semibold text-gray-900 dark:text-white">🌙 Theme</Text>
              <Text className="text-xs text-gray-400 mt-0.5">Choose your preferred display theme</Text>
            </View>
            {(['auto', 'light', 'dark'] as ThemePreference[]).map((th, i) => {
              const labels: Record<ThemePreference, string> = { auto: '🖥 Auto', light: '☀️ Light', dark: '🌙 Dark' }
              const isSelected = themePreference === th
              return (
                <TouchableOpacity
                  key={th}
                  className={`flex-row items-center justify-between px-5 py-3.5 ${i < 2 ? 'border-b border-gray-100 dark:border-gray-700' : ''}`}
                  onPress={async () => {
                    setThemePreferenceState(th)
                    await AsyncStorage.setItem(THEME_KEY, th)
                  }}
                >
                  <Text className="text-sm text-gray-900 dark:text-white">{labels[th]}</Text>
                  {isSelected && (
                    <View className="w-5 h-5 rounded-full bg-brand items-center justify-center">
                      <Text className="text-white text-xs font-bold">✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              )
            })}
          </View>

          {/* Notification preferences */}
          <View className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden mb-4">
            <View className="px-5 pt-4 pb-2">
              <Text className="text-sm font-semibold text-gray-900">{t('profile.notificationPrefs')}</Text>
              <Text className="text-xs text-gray-400 mt-0.5">{t('profile.notificationPrefsSubtitle')}</Text>
            </View>
            {NOTIF_TYPES.map(({ key, label, description }, i) => {
              const prefs = profile?.notification_prefs ?? {}
              const enabled = prefs[key] !== false
              return (
                <View
                  key={key}
                  className={`flex-row items-center justify-between px-5 py-3.5 ${i < NOTIF_TYPES.length - 1 ? 'border-b border-gray-100' : ''}`}
                >
                  <View className="flex-1 me-3">
                    <Text className="text-sm font-medium text-gray-900">{label}</Text>
                    <Text className="text-xs text-gray-400 mt-0.5">{description}</Text>
                  </View>
                  <Switch
                    value={enabled}
                    onValueChange={(val) => {
                      if (!user?.id) return
                      const updated: NotificationPrefs = { ...(profile?.notification_prefs ?? {}), [key]: val }
                      updateProfile({ userId: user.id, notification_prefs: updated })
                    }}
                    trackColor={{ false: '#e5e7eb', true: '#2ecc71' }}
                    thumbColor="white"
                  />
                </View>
              )
            })}
          </View>

          {/* Sign out */}
          <TouchableOpacity
            className="bg-white border border-red-200 rounded-2xl py-4 items-center mb-8"
            onPress={handleSignOut}
          >
            <Text className="text-red-500 font-semibold">{t('profile.signOut')}</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </SafeAreaView>
  )
}

function InfoRow({ label, value, last = false }: { label: string; value: string; last?: boolean }) {
  return (
    <View className={`flex-row justify-between px-5 py-4 ${!last ? 'border-b border-gray-100' : ''}`}>
      <Text className="text-gray-500 text-sm">{label}</Text>
      <Text className="text-gray-900 text-sm font-medium">{value}</Text>
    </View>
  )
}
