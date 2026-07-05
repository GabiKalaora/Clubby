import { View, Text, Image, ScrollView, TouchableOpacity, ActivityIndicator, Share } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabase'
import { useCurrentUser, useSession } from '../../hooks/useAuth'
import { useBusiness, useIsMember, useEnrollBusiness } from '../../hooks/useBusinesses'

const DAY_LABELS: Record<string, string> = {
  mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday',
  thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday',
}
const DAY_ORDER = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']

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
      <View style={{ flex: 1, backgroundColor: '#f8f9fa', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#c084fc" />
      </View>
    )
  }

  if (!business) {
    return (
      <View style={{ flex: 1, backgroundColor: '#f8f9fa', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
        <Text style={{ color: '#94a3b8', textAlign: 'center', fontFamily: 'PlusJakartaSans_500Medium' }}>{t('store.notFound')}</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
          <Text style={{ color: '#c084fc', fontFamily: 'PlusJakartaSans_600SemiBold' }}>{t('store.goBack')}</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const hours = business.opening_hours as Record<string, { open: string; close: string }> | null
  const activePromos = business.promotions ?? []

  return (
    <View style={{ flex: 1, backgroundColor: '#f8f9fa' }}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Cover — full bleed dark hero */}
        <View style={{ height: 240, backgroundColor: '#2d2640', position: 'relative' }}>
          {business.cover_url ? (
            <Image source={{ uri: business.cover_url }} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} resizeMode="cover" />
          ) : business.logo_url ? (
            <Image source={{ uri: business.logo_url }} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.25 }} resizeMode="cover" />
          ) : null}

          {/* Dark gradient overlay */}
          <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 100, backgroundColor: 'rgba(21,22,23,0.6)' }} />

          {/* Back button */}
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ position: 'absolute', top: 52, left: 16, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 4 }}
          >
            <Text style={{ color: '#ffffff', fontSize: 14, fontFamily: 'PlusJakartaSans_600SemiBold' }}>← {t('common.back')}</Text>
          </TouchableOpacity>
        </View>

        {/* White bottom sheet style content */}
        <View style={{ backgroundColor: '#ffffff', borderTopLeftRadius: 28, borderTopRightRadius: 28, marginTop: -28, paddingTop: 24, paddingHorizontal: 20, paddingBottom: 40 }}>
          {/* Logo + name row */}
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 }}>
            <View style={{ width: 72, height: 72, borderRadius: 22, backgroundColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginEnd: 14, borderWidth: 3, borderColor: '#f8f9fa', flexShrink: 0 }}>
              {business.logo_url
                ? <Image source={{ uri: business.logo_url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                : <Text style={{ fontSize: 32 }}>🏪</Text>}
            </View>

            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 22, fontFamily: 'PlusJakartaSans_800ExtraBold', color: '#2d3748', marginBottom: 2 }}>{business.name}</Text>
              {business.category && (
                <Text style={{ color: '#94a3b8', fontSize: 13, fontFamily: 'PlusJakartaSans_500Medium', textTransform: 'capitalize' }}>{business.category}</Text>
              )}
            </View>
          </View>

          {/* Join / Invite buttons */}
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
            <TouchableOpacity
              onPress={isMember ? undefined : handleJoin}
              disabled={enrolling || isMember}
              style={{
                flex: 1, borderRadius: 16, paddingVertical: 14, alignItems: 'center',
                backgroundColor: isMember ? '#e2e8f0' : '#a855f7',
                shadowColor: isMember ? 'transparent' : '#a855f7',
                shadowOpacity: 0.4, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 6,
              }}
            >
              {enrolling
                ? <ActivityIndicator size="small" color="white" />
                : <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 15, color: isMember ? '#94a3b8' : '#ffffff' }}>
                    {isMember ? `✓ ${t('store.joined')}` : t('store.joinClub')}
                  </Text>}
            </TouchableOpacity>
            {isMember && (
              <TouchableOpacity
                onPress={handleInvite}
                style={{ flex: 1, borderRadius: 16, paddingVertical: 14, alignItems: 'center', backgroundColor: '#a855f722', borderWidth: 1.5, borderColor: '#a855f7' }}
              >
                <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 15, color: '#c084fc' }}>{t('store.inviteFriends')}</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Address + phone */}
          {(business.address || business.phone) && (
            <View style={{ backgroundColor: '#f8f9fa', borderRadius: 16, padding: 14, marginBottom: 16, gap: 8 }}>
              {business.address && (
                <Text style={{ color: '#94a3b8', fontSize: 13, fontFamily: 'PlusJakartaSans_500Medium' }}>📍 {business.address}</Text>
              )}
              {business.phone && (
                <Text style={{ color: '#94a3b8', fontSize: 13, fontFamily: 'PlusJakartaSans_500Medium' }}>📞 {business.phone}</Text>
              )}
            </View>
          )}

          {/* About */}
          {business.description && (
            <View style={{ backgroundColor: '#f8f9fa', borderRadius: 16, padding: 16, marginBottom: 16 }}>
              <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', color: '#2d3748', fontSize: 15, marginBottom: 8 }}>{t('store.about')}</Text>
              <Text style={{ color: '#94a3b8', fontSize: 14, fontFamily: 'PlusJakartaSans_400Regular', lineHeight: 22 }}>{business.description}</Text>
            </View>
          )}

          {/* Active promotions */}
          {activePromos.length > 0 && (
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', color: '#2d3748', fontSize: 15, marginBottom: 10 }}>{t('store.currentOffers')}</Text>
              {activePromos.map((promo, i) => (
                <View key={i} style={{ backgroundColor: '#a855f722', borderWidth: 1, borderColor: '#a855f744', borderRadius: 16, padding: 14, marginBottom: 8, borderLeftWidth: 4, borderLeftColor: '#a855f7' }}>
                  <Text style={{ color: '#c084fc', fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14 }}>🎁 {promo.title}</Text>
                  {promo.benefit_value != null && (
                    <Text style={{ color: '#c084fc', fontSize: 12, marginTop: 4, fontFamily: 'PlusJakartaSans_500Medium' }}>
                      {promo.benefit_type === 'credit' ? `₪${(promo.benefit_value / 100).toFixed(0)} credit`
                        : promo.benefit_type === 'discount' ? `${promo.benefit_value}% off`
                        : 'Free item'}
                    </Text>
                  )}
                </View>
              ))}
            </View>
          )}

          {/* Opening hours */}
          {hours && Object.keys(hours).length > 0 && (
            <View style={{ backgroundColor: '#f8f9fa', borderRadius: 16, padding: 16 }}>
              <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', color: '#2d3748', fontSize: 15, marginBottom: 12 }}>{t('store.openingHours')}</Text>
              {DAY_ORDER.filter((d) => hours[d]).map((day, i, arr) => (
                <View key={day} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: i < arr.length - 1 ? 1 : 0, borderBottomColor: '#e2e8f0' }}>
                  <Text style={{ color: '#94a3b8', fontSize: 14, fontFamily: 'PlusJakartaSans_500Medium' }}>{DAY_LABELS[day]}</Text>
                  <Text style={{ color: '#ffffff', fontSize: 14, fontFamily: 'PlusJakartaSans_600SemiBold' }}>{hours[day].open} – {hours[day].close}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  )
}
