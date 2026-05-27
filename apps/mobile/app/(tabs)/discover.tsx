import { useState, useCallback, useEffect } from 'react'
import {
  View, Text, FlatList, TouchableOpacity,
  TextInput, ActivityIndicator, Image,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useBusinesses, useEnrollBusiness, type Business } from '../../hooks/useBusinesses'
import { useMemberships } from '../../hooks/useMemberships'

type Category = 'all' | 'food' | 'clothing' | 'shoes' | 'health' | 'tech' | 'service'

const CATEGORIES: { key: Category; label: string; emoji: string }[] = [
  { key: 'all', label: 'All', emoji: '🌐' },
  { key: 'food', label: 'Food', emoji: '🍔' },
  { key: 'clothing', label: 'Clothing', emoji: '👕' },
  { key: 'shoes', label: 'Shoes', emoji: '👟' },
  { key: 'health', label: 'Health', emoji: '💊' },
  { key: 'tech', label: 'Tech', emoji: '💻' },
  { key: 'service', label: 'Service', emoji: '🛠️' },
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

function useSession() {
  return useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession()
      return session
    },
    staleTime: Infinity,
  })
}

function BusinessCard({
  business,
  onEnroll,
  enrolling,
  enrolled,
}: {
  business: Business
  onEnroll: () => void
  enrolling: boolean
  enrolled: boolean
}) {
  const router = useRouter()
  const activePromo = business.promotions?.[0]

  return (
    <TouchableOpacity
      className="bg-white rounded-2xl mx-4 mb-3 p-4 shadow-sm border border-gray-100"
      onPress={() => router.push(`/store/${business.id}` as never)}
      activeOpacity={0.8}
    >
      <View className="flex-row items-center">
        {/* Logo */}
        <View className="w-14 h-14 rounded-2xl bg-gray-100 items-center justify-center mr-3 overflow-hidden flex-shrink-0">
          {business.logo_url ? (
            <Image source={{ uri: business.logo_url }} className="w-full h-full" resizeMode="cover" />
          ) : (
            <Text className="text-2xl">🏪</Text>
          )}
        </View>

        {/* Info */}
        <View className="flex-1">
          <Text className="font-bold text-gray-900 text-base">{business.name}</Text>
          {business.category && (
            <Text className="text-gray-400 text-xs capitalize mt-0.5">{business.category}</Text>
          )}
          {activePromo && (
            <View className="bg-brand/10 rounded-lg px-2 py-0.5 self-start mt-1.5">
              <Text className="text-brand text-xs font-semibold" numberOfLines={1}>
                🎁 {activePromo.title}
              </Text>
            </View>
          )}
          {!activePromo && business.description && (
            <Text className="text-gray-500 text-xs mt-0.5" numberOfLines={1}>
              {business.description}
            </Text>
          )}
        </View>

        {/* Enroll button */}
        <TouchableOpacity
          className={`rounded-full w-9 h-9 items-center justify-center ml-2 flex-shrink-0 ${
            enrolled ? 'bg-green-100' : 'bg-brand'
          }`}
          onPress={onEnroll}
          disabled={enrolling || enrolled}
        >
          {enrolling
            ? <ActivityIndicator size="small" color="white" />
            : enrolled
            ? <Text className="text-brand text-base font-bold">✓</Text>
            : <Text className="text-white text-xl font-light leading-none">+</Text>
          }
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  )
}

export default function Discover() {
  const [activeCategory, setActiveCategory] = useState<Category>('all')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [enrollingId, setEnrollingId] = useState<string | null>(null)
  const [enrolledIds, setEnrolledIds] = useState<Set<string>>(new Set())

  const { data: user } = useCurrentUser()
  const { data: session } = useSession()
  const { data: businesses = [], isLoading, refetch } = useBusinesses(
    activeCategory === 'all' ? undefined : activeCategory,
    debouncedSearch || undefined,
  )
  const { mutate: enroll } = useEnrollBusiness()
  const { data: memberships = [] } = useMemberships(user?.id)

  // Pre-populate enrolledIds from existing memberships
  useEffect(() => {
    if (memberships.length > 0) {
      setEnrolledIds(new Set(memberships.map(m => m.business_id)))
    }
  }, [memberships.length])

  const handleSearchChange = useCallback((text: string) => {
    setSearch(text)
    clearTimeout((handleSearchChange as unknown as { timer?: ReturnType<typeof setTimeout> }).timer)
    ;(handleSearchChange as unknown as { timer?: ReturnType<typeof setTimeout> }).timer = setTimeout(() => {
      setDebouncedSearch(text)
    }, 350)
  }, [])

  function handleEnroll(business: Business) {
    if (!session?.access_token) return
    if (enrolledIds.has(business.id)) return

    setEnrollingId(business.id)
    enroll(
      { token: business.qr_code_token, userJwt: session.access_token },
      {
        onSuccess: () => {
          setEnrolledIds((prev) => new Set(prev).add(business.id))
          setEnrollingId(null)
        },
        onError: () => setEnrollingId(null),
      },
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="px-5 pt-2 pb-3">
        <Text className="text-2xl font-bold text-gray-900 mb-3">Discover</Text>

        {/* Search */}
        <View className="bg-white border border-gray-200 rounded-2xl flex-row items-center px-4 py-2.5">
          <Text className="text-gray-400 mr-2">🔍</Text>
          <TextInput
            className="flex-1 text-gray-900 text-sm"
            placeholder="Search businesses..."
            placeholderTextColor="#9ca3af"
            value={search}
            onChangeText={handleSearchChange}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => { setSearch(''); setDebouncedSearch('') }}>
              <Text className="text-gray-400 text-base ml-1">✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Category pills */}
      <FlatList
        horizontal
        data={CATEGORIES}
        keyExtractor={(item) => item.key}
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 12, gap: 8, alignItems: 'flex-start' }}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => setActiveCategory(item.key)}
            className={`flex-row items-center rounded-full px-3.5 py-2 ${
              activeCategory === item.key
                ? 'bg-brand'
                : 'bg-white border border-gray-200'
            }`}
          >
            <Text className="text-sm mr-1">{item.emoji}</Text>
            <Text className={`text-xs font-semibold ${activeCategory === item.key ? 'text-white' : 'text-gray-600'}`}>
              {item.label}
            </Text>
          </TouchableOpacity>
        )}
      />

      {/* Business list */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#2ecc71" />
        </View>
      ) : (
        <FlatList
          data={businesses}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <BusinessCard
              business={item}
              onEnroll={() => handleEnroll(item)}
              enrolling={enrollingId === item.id}
              enrolled={enrolledIds.has(item.id)}
            />
          )}
          onRefresh={refetch}
          refreshing={false}
          ListEmptyComponent={
            <View className="items-center justify-center py-16 px-8">
              <Text className="text-4xl mb-3">🏪</Text>
              <Text className="text-gray-500 text-center text-base">
                {search
                  ? `No businesses matching "${search}"`
                  : activeCategory === 'all'
                  ? 'No businesses yet'
                  : `No ${activeCategory} businesses yet`}
              </Text>
            </View>
          }
          ListFooterComponent={<View className="h-4" />}
        />
      )}
    </SafeAreaView>
  )
}
