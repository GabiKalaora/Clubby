import { View, Text, Image, ScrollView, TouchableOpacity, ActivityIndicator, Share } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabase'
import { useBusiness, useIsMember, useEnrollBusiness } from '../../hooks/useBusinesses'

const DAY_LABELS: Record<string, string> = {
  mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday',
  thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday',
}
const DAY_ORDER = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']

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

export default function StoreProfile() {
  const { t } = useTranslation()
  const params = useLocalSearchParams<{ id: string }>()
  const id = Array.isArray(params.id) ? params.id[0] : params.id
  const router = useRouter()

  const { data: user } = useCurrentUser()
  const { data: session } = useSession()
  const { data: business, isLoading } = useBusiness(id)
  const { data: isMember = false, refetch: refetchMember } = useIsMember(user?.id, id)
  const { mutate: enroll, isPending: enrolling } = useEnrollBusiness()

  function handleJoin() {
    if (!session?.access_token || !business) return
    enroll(
      { token: business.qr_code_token, userJwt: session.access_token },
      { onSuccess: () => refetchMember() },
    )
  }

  function handleInvite() {
    if (!user || !business) return
    const url = `clubby://enroll?token=${business.qr_code_token}&ref=${user.id}`
    Share.share({
      message: t('store.inviteMessage', { name: business.name, url }),
      title: `Join ${business.name}`,
    })
  }

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 items-center justify-center">
        <ActivityIndicator color="#2ecc71" />
      </SafeAreaView>
    )
  }

  if (!business) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 items-center justify-center px-8">
        <Text className="text-gray-500 text-center">{t('store.notFound')}</Text>
        <TouchableOpacity onPress={() => router.back()} className="mt-4">
          <Text className="text-brand font-semibold">{t('store.goBack')}</Text>
        </TouchableOpacity>
      </SafeAreaView>
    )
  }

  const hours = business.opening_hours as Record<string, { open: string; close: string }> | null
  const activePromos = business.promotions ?? []

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900" edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Cover / header */}
        <View className="h-44 bg-brand/20 items-center justify-center relative">
          {business.cover_url ? (
            <Image
              source={{ uri: business.cover_url }}
              className="absolute inset-0 w-full h-full"
              resizeMode="cover"
            />
          ) : business.logo_url ? (
            <Image
              source={{ uri: business.logo_url }}
              className="absolute inset-0 w-full h-full"
              resizeMode="cover"
              style={{ opacity: 0.3 }}
            />
          ) : null}

          {/* Back button */}
          <TouchableOpacity
            className="absolute top-3 left-4 bg-white/80 rounded-full px-3 py-1.5"
            onPress={() => router.back()}
          >
            <Text className="text-gray-700 text-sm font-medium">← Back</Text>
          </TouchableOpacity>

          {/* Logo circle */}
          <View className="w-20 h-20 rounded-2xl bg-white items-center justify-center shadow-md overflow-hidden">
            {business.logo_url ? (
              <Image source={{ uri: business.logo_url }} className="w-full h-full" resizeMode="cover" />
            ) : (
              <Text className="text-4xl">🏪</Text>
            )}
          </View>
        </View>

        <View className="px-5 pt-4">
          {/* Business name + join button */}
          <View className="flex-row items-start justify-between mb-1">
            <View className="flex-1 me-3">
              <Text className="text-2xl font-bold text-gray-900 dark:text-white">{business.name}</Text>
              {business.category && (
                <Text className="text-gray-400 text-sm capitalize mt-0.5">{business.category}</Text>
              )}
            </View>

            <View className="items-end gap-y-2">
              <TouchableOpacity
                className={`rounded-full px-5 py-2.5 ${isMember ? 'bg-gray-100' : 'bg-brand'}`}
                onPress={isMember ? undefined : handleJoin}
                disabled={enrolling || isMember}
              >
                {enrolling
                  ? <ActivityIndicator size="small" color="white" />
                  : <Text className={`font-bold text-sm ${isMember ? 'text-gray-500' : 'text-white'}`}>
                      {isMember ? t('store.joined') : t('store.joinClub')}
                    </Text>
                }
              </TouchableOpacity>
              {isMember && (
                <TouchableOpacity
                  className="rounded-full px-4 py-1.5 bg-brand/10 border border-brand/20"
                  onPress={handleInvite}
                >
                  <Text className="text-brand text-xs font-semibold">{t('store.inviteFriends')}</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Address */}
          {business.address && (
            <Text className="text-gray-500 text-sm mb-1">📍 {business.address}</Text>
          )}
          {business.phone && (
            <Text className="text-gray-500 text-sm mb-3">📞 {business.phone}</Text>
          )}

          {/* Description */}
          {business.description && (
            <View className="bg-white rounded-2xl p-4 mb-4 border border-gray-100">
              <Text className="font-semibold text-gray-800 mb-1">{t('store.about')}</Text>
              <Text className="text-gray-600 text-sm leading-5">{business.description}</Text>
            </View>
          )}

          {/* Active promotions */}
          {activePromos.length > 0 && (
            <View className="mb-4">
              <Text className="font-semibold text-gray-800 mb-2">{t('store.currentOffers')}</Text>
              {activePromos.map((promo, i) => (
                <View key={i} className="bg-brand/10 border border-brand/20 rounded-2xl p-4 mb-2">
                  <Text className="text-brand font-bold text-sm">🎁 {promo.title}</Text>
                  {promo.benefit_value != null && (
                    <Text className="text-brand/70 text-xs mt-0.5">
                      {promo.benefit_type === 'credit'
                        ? `₪${(promo.benefit_value / 100).toFixed(0)} credit`
                        : promo.benefit_type === 'discount'
                        ? `${promo.benefit_value}% off`
                        : 'Free item'}
                    </Text>
                  )}
                </View>
              ))}
            </View>
          )}

          {/* Opening hours */}
          {hours && Object.keys(hours).length > 0 && (
            <View className="bg-white rounded-2xl p-4 mb-6 border border-gray-100">
              <Text className="font-semibold text-gray-800 mb-3">{t('store.openingHours')}</Text>
              {DAY_ORDER.filter((d) => hours[d]).map((day) => (
                <View key={day} className="flex-row justify-between py-1.5 border-b border-gray-50">
                  <Text className="text-gray-600 text-sm">{DAY_LABELS[day]}</Text>
                  <Text className="text-gray-900 text-sm font-medium">
                    {hours[day].open} – {hours[day].close}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
