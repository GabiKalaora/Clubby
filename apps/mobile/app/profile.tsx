import { useState } from 'react'
import {
  View, Text, TouchableOpacity, TextInput,
  ActivityIndicator, Alert, Switch, ScrollView,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useProfile, useUpdateProfile, type NotificationPrefs } from '../hooks/useProfile'

const NOTIF_TYPES: { key: keyof NotificationPrefs; label: string; description: string }[] = [
  { key: 'expiry_reminder', label: 'Expiry reminders', description: 'When a benefit is about to expire' },
  { key: 'birthday',        label: 'Birthday rewards',  description: 'Special offer on your birthday' },
  { key: 're_engagement',   label: 'We miss you',       description: 'When you haven\'t visited in a while' },
  { key: 'direct_message',  label: 'Business messages', description: 'Promotions sent by businesses' },
]

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

function Initials({ name, phone }: { name: string | null; phone: string | null }) {
  const letters = name
    ? name.trim().split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : (phone ?? '?')[0]
  return (
    <View className="w-20 h-20 rounded-full bg-brand items-center justify-center mb-3">
      <Text className="text-white text-3xl font-bold">{letters}</Text>
    </View>
  )
}

export default function ProfileScreen() {
  const router = useRouter()
  const { data: user } = useCurrentUser()
  const { data: profile, isLoading } = useProfile(user?.id)
  const { mutate: updateProfile, isPending: saving } = useUpdateProfile()

  const [editing, setEditing] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [dobInput, setDobInput] = useState('')
  const [editingDob, setEditingDob] = useState(false)

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

  const [dobError, setDobError] = useState('')

  function saveDob() {
    if (!user?.id) return
    if (dobInput) {
      const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dobInput)
      if (!match) { setDobError('Use format YYYY-MM-DD'); return }
      const [, y, m, d] = match.map(Number)
      const date = new Date(y, m - 1, d)
      const now = new Date()
      if (date > now) { setDobError('Date cannot be in the future'); return }
      if (y < 1900) { setDobError('Enter a valid year'); return }
      if (date.getMonth() !== m - 1) { setDobError('Invalid date'); return }
    }
    setDobError('')
    updateProfile(
      { userId: user.id, date_of_birth: dobInput || null },
      { onSuccess: () => setEditingDob(false) },
    )
  }

  async function handleSignOut() {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out', style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut()
          router.replace('/(auth)/sign-in')
        },
      },
    ])
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="flex-row items-center px-5 pt-2 pb-4">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-9 h-9 rounded-full bg-gray-200 items-center justify-center mr-3"
        >
          <Text className="text-base">←</Text>
        </TouchableOpacity>
        <Text className="text-xl font-bold text-gray-900">Profile</Text>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#2ecc71" />
        </View>
      ) : (
        <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
          {/* Avatar + name */}
          <View className="items-center py-8">
            <Initials name={profile?.display_name ?? null} phone={profile?.phone ?? user?.phone ?? null} />

            {editing ? (
              <View className="flex-row items-center gap-x-2 mt-1">
                <TextInput
                  className="border border-gray-300 rounded-xl px-4 py-2 bg-white text-base text-gray-900 min-w-[160px]"
                  value={nameInput}
                  onChangeText={setNameInput}
                  placeholder="Your name"
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={saveEdit}
                />
                <TouchableOpacity
                  className="bg-brand rounded-xl px-4 py-2"
                  onPress={saveEdit}
                  disabled={saving}
                >
                  <Text className="text-white font-semibold text-sm">
                    {saving ? '…' : 'Save'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="rounded-xl px-3 py-2"
                  onPress={() => setEditing(false)}
                >
                  <Text className="text-gray-500 text-sm">Cancel</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity onPress={startEdit} className="flex-row items-center gap-x-1 mt-1">
                <Text className="text-lg font-semibold text-gray-900">
                  {profile?.display_name ?? 'Set your name'}
                </Text>
                <Text className="text-gray-400 text-sm">✎</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Info rows */}
          <View className="bg-white rounded-2xl shadow-sm overflow-hidden mb-4">
            <InfoRow label="Phone" value={profile?.phone ?? user?.phone ?? '—'} />
            <InfoRow label="Email" value={user?.email ?? '—'} last />
          </View>

          {/* Birthday */}
          <View className="bg-white rounded-2xl shadow-sm overflow-hidden mb-4">
            <View className="flex-row justify-between items-center px-5 py-4">
              <Text className="text-gray-500 text-sm">Date of birth</Text>
              {editingDob ? (
                <View className="flex-row items-center gap-x-2">
                  <TextInput
                    className="border border-gray-300 rounded-xl px-3 py-1.5 text-sm text-gray-900 bg-gray-50 w-36"
                    value={dobInput}
                    onChangeText={text => { setDobInput(text); setDobError('') }}
                    placeholder="YYYY-MM-DD"
                    keyboardType="numbers-and-punctuation"
                    autoFocus
                    returnKeyType="done"
                    onSubmitEditing={saveDob}
                  />
                  <TouchableOpacity className="bg-brand rounded-xl px-3 py-1.5" onPress={saveDob} disabled={saving}>
                    <Text className="text-white text-xs font-semibold">{saving ? '…' : 'Save'}</Text>
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
                  <Text className="text-gray-900 text-sm font-medium">
                    {profile?.date_of_birth
                      ? new Date(profile.date_of_birth + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                      : 'Not set'}
                  </Text>
                  <Text className="text-gray-400 text-xs">✎</Text>
                </TouchableOpacity>
              )}
            </View>
            {!!dobError && (
              <Text className="text-red-500 text-xs px-5 pb-3">{dobError}</Text>
            )}
          </View>

          {/* Notification preferences */}
          <View className="bg-white rounded-2xl shadow-sm overflow-hidden mb-4">
            <View className="px-5 pt-4 pb-2">
              <Text className="text-sm font-semibold text-gray-900">Notification Preferences</Text>
              <Text className="text-xs text-gray-400 mt-0.5">Choose which push notifications you receive</Text>
            </View>
            {NOTIF_TYPES.map(({ key, label, description }, i) => {
              const prefs = profile?.notification_prefs ?? {}
              const enabled = prefs[key] !== false
              return (
                <View
                  key={key}
                  className={`flex-row items-center justify-between px-5 py-3.5 ${i < NOTIF_TYPES.length - 1 ? 'border-b border-gray-100' : ''}`}
                >
                  <View className="flex-1 mr-3">
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
            className="bg-white border border-red-200 rounded-2xl py-4 items-center"
            onPress={handleSignOut}
          >
            <Text className="text-red-500 font-semibold">Sign out</Text>
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
