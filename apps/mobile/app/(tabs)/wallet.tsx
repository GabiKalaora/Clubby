import { useState } from 'react'
import {
  View, Text, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, ScrollView, Image,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useBenefits, useRedeemBenefit, type Benefit } from '../../hooks/useBenefits'
import { useMemberships } from '../../hooks/useMemberships'
import { useUnreadCount } from '../../hooks/useNotifications'
import { useActiveStories } from '../../hooks/useStories'
import { useStampCards, type StampCard } from '../../hooks/useStampCards'
import BenefitCard from '../../components/BenefitCard'

type Tab = 'all' | 'credit' | 'discount' | 'free_item'

const TABS: { key: Tab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'credit', label: 'Balance' },
  { key: 'discount', label: 'Discounts' },
  { key: 'free_item', label: 'Free Items' },
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

function totalBalance(benefits: Benefit[]): string {
  const cents = benefits
    .filter((b) => b.type === 'credit' && b.amount_cents != null)
    .reduce((sum, b) => sum + (b.amount_cents ?? 0), 0)
  return `₪${(cents / 100).toFixed(2)}`
}

export default function Wallet() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>('all')

  const { data: user } = useCurrentUser()
  const { data: benefits = [], isLoading, refetch, isRefetching } = useBenefits(user?.id)
  const { data: unreadCount = 0 } = useUnreadCount(user?.id)
  const { data: stories = [] } = useActiveStories(user?.id)
  const { data: memberships = [] } = useMemberships(user?.id)
  const membershipBusinessIds = memberships.map((m) => m.business_id)
  const { data: stampCards = [] } = useStampCards(membershipBusinessIds, user?.id)

  const filtered = activeTab === 'all'
    ? benefits
    : benefits.filter((b) => b.type === activeTab)

  const activeCredits = benefits.filter(
    (b) => b.type === 'credit' && b.amount_cents != null,
  )

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 pt-2 pb-4">
        <Text className="text-2xl font-bold text-gray-900">Your Wallet</Text>
        <View className="flex-row gap-x-2">
          <TouchableOpacity
            className="w-9 h-9 rounded-full bg-gray-200 items-center justify-center"
            onPress={() => router.push('/notifications' as never)}
          >
            <Text className="text-base">🔔</Text>
            {unreadCount > 0 && (
              <View className="absolute top-0 right-0 w-4 h-4 rounded-full bg-red-500 items-center justify-center">
                <Text className="text-white text-[9px] font-bold">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            className="w-9 h-9 rounded-full bg-gray-200 items-center justify-center"
            onPress={() => router.push('/profile' as never)}
          >
            <Text className="text-base">👤</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Story circles */}
      {stories.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="px-4 mb-3"
          contentContainerStyle={{ gap: 12, paddingRight: 16 }}
        >
          {stories.map((story, i) => {
            const logo = story.businesses?.logo_url
            const name = story.businesses?.name ?? ''
            return (
              <TouchableOpacity
                key={story.id}
                onPress={() => router.push({ pathname: '/story/[id]', params: { id: story.business_id, businessId: story.business_id, startIndex: String(i) } } as never)}
                className="items-center"
                style={{ width: 64 }}
              >
                <View className="w-14 h-14 rounded-full border-2 border-brand items-center justify-center overflow-hidden bg-gray-200">
                  {logo ? (
                    <Image source={{ uri: logo }} className="w-full h-full" resizeMode="cover" />
                  ) : (
                    <Text className="text-xl">{name[0] ?? '🏪'}</Text>
                  )}
                </View>
                <Text className="text-[10px] text-gray-600 mt-1 text-center" numberOfLines={1}>{name}</Text>
              </TouchableOpacity>
            )
          })}
        </ScrollView>
      )}

      {/* Balance card */}
      <TouchableOpacity
        className="mx-4 mb-4 bg-brand rounded-2xl p-5 shadow-sm shadow-brand/30"
        onPress={() => router.push('/history' as never)}
        activeOpacity={0.85}
      >
        <Text className="text-white/80 text-sm mb-1">Total balance</Text>
        <Text className="text-white text-4xl font-bold">{totalBalance(benefits)}</Text>
        <View className="flex-row justify-between items-center mt-1">
          <Text className="text-white/70 text-xs">
            {activeCredits.length} active credit{activeCredits.length !== 1 ? 's' : ''}
          </Text>
          <Text className="text-white/60 text-xs">View history →</Text>
        </View>
      </TouchableOpacity>

      {/* My Clubs */}
      {memberships.length > 0 && (
        <View className="mb-4">
          <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-5 mb-2">
            My Clubs
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}
          >
            {memberships.map((m) => {
              const biz = m.businesses
              const bizBenefits = benefits.filter((b) => b.business_id === m.business_id && !b.redeemed)
              return (
                <TouchableOpacity
                  key={m.id}
                  onPress={() => router.push({ pathname: '/store/[id]', params: { id: m.business_id } } as never)}
                  className="items-center bg-white rounded-2xl px-3 py-3 shadow-sm border border-gray-100"
                  style={{ minWidth: 80 }}
                >
                  <View className="w-12 h-12 rounded-xl bg-gray-100 items-center justify-center overflow-hidden mb-1.5">
                    {biz.logo_url ? (
                      <Image source={{ uri: biz.logo_url }} className="w-full h-full" resizeMode="cover" />
                    ) : (
                      <Text className="text-2xl">🏪</Text>
                    )}
                  </View>
                  <Text className="text-[11px] font-semibold text-gray-800 text-center" numberOfLines={1}>{biz.name}</Text>
                  {bizBenefits.length > 0 && (
                    <View className="mt-1 bg-brand rounded-full px-1.5 py-0.5">
                      <Text className="text-white text-[9px] font-bold">{bizBenefits.length}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              )
            })}
          </ScrollView>
        </View>
      )}

      {/* Stamp cards */}
      {stampCards.length > 0 && (
        <View className="mb-4">
          <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-5 mb-2">
            Stamp Cards
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}
          >
            {stampCards.map((card) => (
              <StampCardWidget key={card.id} card={card} />
            ))}
          </ScrollView>
        </View>
      )}

      {/* Filter tabs */}
      <View className="flex-row px-4 mb-2 gap-x-2">
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            onPress={() => setActiveTab(tab.key)}
            className={`flex-1 rounded-full py-2 items-center ${
              activeTab === tab.key ? 'bg-brand' : 'bg-white border border-gray-200'
            }`}
          >
            <Text
              className={`text-xs font-semibold ${
                activeTab === tab.key ? 'text-white' : 'text-gray-500'
              }`}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Manual entry shortcut */}
      <TouchableOpacity
        className="mx-4 mb-3 border border-dashed border-brand/40 rounded-full py-2.5 items-center"
        onPress={() => router.push('/manual' as never)}
      >
        <Text className="text-brand text-xs font-semibold">+ Enter coupon manually</Text>
      </TouchableOpacity>

      {/* Benefit list */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#2ecc71" />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <BenefitCard benefit={item} onRedeem={() => {}} />
          )}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor="#2ecc71"
            />
          }
          ListEmptyComponent={
            <View className="items-center justify-center py-16 px-8">
              <Text className="text-4xl mb-3">🎁</Text>
              <Text className="text-gray-500 text-center text-base">
                {activeTab === 'all'
                  ? 'No benefits yet — scan a QR code to join a club!'
                  : `No ${activeTab.replace('_', ' ')} benefits`}
              </Text>
            </View>
          }
          ListFooterComponent={<View className="h-4" />}
        />
      )}

    </SafeAreaView>
  )
}

function StampCardWidget({ card }: { card: StampCard }) {
  const dots = Array.from({ length: card.required_stamps }, (_, i) => i < card.current_stamps)
  const cols = Math.min(card.required_stamps, 5)

  return (
    <View className="bg-white rounded-2xl px-4 py-3 shadow-sm border border-gray-100"
      style={{ minWidth: 160, maxWidth: 200 }}>
      <Text className="text-[12px] font-bold text-gray-800 mb-2" numberOfLines={1}>{card.name}</Text>
      {/* Dot grid */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 8, maxWidth: cols * 18 }}>
        {dots.map((filled, i) => (
          <View key={i} style={{
            width: 14, height: 14, borderRadius: 7,
            backgroundColor: filled ? '#2ecc71' : '#e5e7eb',
          }} />
        ))}
      </View>
      <Text className="text-[11px] text-gray-500">
        {card.completed
          ? '✅ Reward earned!'
          : `${card.current_stamps} / ${card.required_stamps} stamps`}
      </Text>
      {!card.completed && (
        <>
          <Text className="text-[10px] text-brand mt-0.5" numberOfLines={1}>
            🎁 {card.reward_title}
          </Text>
          <Text className="text-[10px] text-gray-400 mt-0.5" numberOfLines={1}>
            {card.required_stamps - card.current_stamps} more to earn!
          </Text>
        </>
      )}
    </View>
  )
}
