import { useState } from 'react'
import {
  View, Text, TouchableOpacity, TextInput,
  ActivityIndicator, Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useProfile, useUpdateProfile } from '../hooks/useProfile'

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

  function saveDob() {
    if (!user?.id) return
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
        <View className="flex-1 px-5">
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
                    onChangeText={setDobInput}
                    placeholder="YYYY-MM-DD"
                    keyboardType="numbers-and-punctuation"
                    autoFocus
                    returnKeyType="done"
                    onSubmitEditing={saveDob}
                  />
                  <TouchableOpacity className="bg-brand rounded-xl px-3 py-1.5" onPress={saveDob} disabled={saving}>
                    <Text className="text-white text-xs font-semibold">{saving ? '…' : 'Save'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setEditingDob(false)}>
                    <Text className="text-gray-400 text-sm">✕</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  className="flex-row items-center gap-x-1"
                  onPress={() => { setDobInput(profile?.date_of_birth ?? ''); setEditingDob(true) }}
                >
                  <Text className="text-gray-900 text-sm font-medium">
                    {profile?.date_of_birth ?? 'Not set'}
                  </Text>
                  <Text className="text-gray-400 text-xs">✎</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Sign out */}
          <TouchableOpacity
            className="bg-white border border-red-200 rounded-2xl py-4 items-center"
            onPress={handleSignOut}
          >
            <Text className="text-red-500 font-semibold">Sign out</Text>
          </TouchableOpacity>
        </View>
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
