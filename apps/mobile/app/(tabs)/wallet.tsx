import { useState } from 'react'
import {
  View, Text, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, ScrollView, Image,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabase'
import { useBenefits, useRedeemBenefit, type Benefit } from '../../hooks/useBenefits'
import { useFeedPosts, type FeedPost } from '../../hooks/useFeedPosts'
import { useMemberships } from '../../hooks/useMemberships'
import { useUnreadCount } from '../../hooks/useNotifications'
import { useActiveStories } from '../../hooks/useStories'
import { useStampCards, type StampCard } from '../../hooks/useStampCards'
import BenefitCard from '../../components/BenefitCard'
import type { Tier } from '../../hooks/useTiers'
import { usePointsBalances } from '../../hooks/usePoints'

type Tab = 'all' | 'credit' | 'discount' | 'free_item'

function FeedCard({ post }: { post: FeedPost }) {
  const router = useRouter()
  const biz = post.businesses
  const TYPE_COLOR: Record<string, string> = {
    promotion: '#2ecc71',
    offer: '#f59e0b',
    announcement: '#6366f1',
    story: '#ec4899',
  }
  const color = TYPE_COLOR[post.type] ?? '#2ecc71'
  return (
    <View style={{ backgroundColor: '#1e2022', borderRadius: 20, marginHorizontal: 16, marginBottom: 10, overflow: 'hidden', borderWidth: 1, borderColor: '#2a2d2f' }}>
      {post.image_url && (
        <Image source={{ uri: post.image_url }} style={{ width: '100%', height: 160 }} resizeMode="cover" />
      )}
      <View style={{ padding: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 }}>
          <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: '#2a2d2f', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            {biz?.logo_url ? <Image source={{ uri: biz.logo_url }} style={{ width: 28, height: 28 }} /> : <Text style={{ fontSize: 14 }}>🏪</Text>}
          </View>
          <Text style={{ fontSize: 12, fontFamily: 'Urbanist_600SemiBold', color: '#8e969f', flex: 1 }} numberOfLines={1}>{biz?.name}</Text>
          <View style={{ borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, backgroundColor: color + '25' }}>
            <Text style={{ fontSize: 10, fontFamily: 'Urbanist_700Bold', color }}>{post.type.toUpperCase()}</Text>
          </View>
        </View>
        <Text style={{ fontSize: 14, fontFamily: 'Urbanist_700Bold', color: '#ffffff', marginBottom: 4 }}>{post.title}</Text>
        {post.body && <Text style={{ fontSize: 12, color: '#8e969f', fontFamily: 'Urbanist_400Regular', lineHeight: 18 }} numberOfLines={3}>{post.body}</Text>}
        {post.cta_text && (
          <TouchableOpacity
            onPress={() => router.push({ pathname: '/store/[id]', params: { id: post.business_id } } as never)}
            style={{ marginTop: 12, borderRadius: 14, paddingVertical: 10, alignItems: 'center', backgroundColor: color }}
          >
            <Text style={{ color: 'white', fontSize: 12, fontFamily: 'Urbanist_700Bold' }}>{post.cta_text}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  )
}

function useAllTiers(businessIds: string[]) {
  return useQuery({
    queryKey: ['tiers-all', businessIds.join(',')],
    enabled: businessIds.length > 0,
    staleTime: 300_000,
    queryFn: async (): Promise<Record<string, Tier[]>> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any)
        .from('tiers')
        .select('id, name, min_stamps, color, icon, business_id')
        .in('business_id', businessIds)
        .order('min_stamps', { ascending: true })
      const map: Record<string, Tier[]> = {}
      for (const t of data ?? []) {
        const row = t as Tier & { business_id: string }
        if (!map[row.business_id]) map[row.business_id] = []
        map[row.business_id].push(row)
      }
      return map
    },
  })
}

function getCurrentTier(totalStamps: number, tiers: Tier[]): Tier | null {
  if (!tiers.length) return null
  let current: Tier | null = null
  for (const t of tiers) {
    if (totalStamps >= t.min_stamps) current = t
  }
  return current
}

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
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<Tab>('all')

  const TABS: { key: Tab; label: string }[] = [
    { key: 'all', label: t('wallet.tabs.all') },
    { key: 'credit', label: t('wallet.tabs.balance') },
    { key: 'discount', label: t('wallet.tabs.discounts') },
    { key: 'free_item', label: t('wallet.tabs.freeItems') },
  ]

  const { data: user } = useCurrentUser()
  const { data: benefits = [], isLoading, refetch, isRefetching } = useBenefits(user?.id)
  const { data: unreadCount = 0 } = useUnreadCount(user?.id)
  const { data: stories = [] } = useActiveStories(user?.id)
  const { data: memberships = [] } = useMemberships(user?.id)
  const membershipBusinessIds = memberships.map((m) => m.business_id)
  const { data: stampCards = [] } = useStampCards(membershipBusinessIds, user?.id)
  const { data: allTiers = {} } = useAllTiers(membershipBusinessIds)
  const { data: pointsBalances = [] } = usePointsBalances(user?.id)
  const { data: feedPosts = [] } = useFeedPosts(membershipBusinessIds)

  const filtered = activeTab === 'all'
    ? benefits
    : benefits.filter((b) => b.type === activeTab)

  const activeCredits = benefits.filter(
    (b) => b.type === 'credit' && b.amount_cents != null,
  )

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#151617' }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 }}>
        <Text style={{ fontSize: 26, fontFamily: 'Urbanist_700Bold', color: '#ffffff' }}>{t('wallet.title')}</Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity
            onPress={() => router.push('/notifications' as never)}
            style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#1e2022', alignItems: 'center', justifyContent: 'center' }}
          >
            <Text style={{ fontSize: 16 }}>🔔</Text>
            {unreadCount > 0 && (
              <View style={{ position: 'absolute', top: 0, right: 0, width: 16, height: 16, borderRadius: 8, backgroundColor: '#ef4444', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: 'white', fontSize: 9, fontFamily: 'Urbanist_700Bold' }}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push('/profile' as never)}
            style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#1e2022', alignItems: 'center', justifyContent: 'center' }}
          >
            <Text style={{ fontSize: 16 }}>👤</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Story circles */}
      {stories.length > 0 && (
        <ScrollView
          horizontal showsHorizontalScrollIndicator={false}
          style={{ marginBottom: 12 }}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
        >
          {stories.map((story, i) => {
            const logo = story.businesses?.logo_url
            const name = story.businesses?.name ?? ''
            return (
              <TouchableOpacity
                key={story.id}
                onPress={() => router.push({ pathname: '/story/[id]', params: { id: story.business_id, businessId: story.business_id, startIndex: String(i) } } as never)}
                style={{ alignItems: 'center', width: 64 }}
              >
                <View style={{ width: 56, height: 56, borderRadius: 28, borderWidth: 2, borderColor: '#1a7a4a', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: '#1e2022' }}>
                  {logo ? <Image source={{ uri: logo }} style={{ width: '100%', height: '100%' }} resizeMode="cover" /> : <Text style={{ fontSize: 22 }}>{name[0] ?? '🏪'}</Text>}
                </View>
                <Text style={{ fontSize: 10, color: '#8e969f', marginTop: 4, textAlign: 'center', fontFamily: 'Urbanist_500Medium' }} numberOfLines={1}>{name}</Text>
              </TouchableOpacity>
            )
          })}
        </ScrollView>
      )}

      {/* Balance card — deep green */}
      <TouchableOpacity
        onPress={() => router.push('/history' as never)}
        activeOpacity={0.88}
        style={{
          marginHorizontal: 16, marginBottom: 20,
          backgroundColor: '#1a7a4a',
          borderRadius: 24, padding: 22,
          shadowColor: '#1a7a4a', shadowOpacity: 0.4, shadowRadius: 16, shadowOffset: { width: 0, height: 8 },
          elevation: 10,
        }}
      >
        <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, fontFamily: 'Urbanist_500Medium', marginBottom: 4 }}>{t('wallet.totalBalance')}</Text>
        <Text style={{ color: '#ffffff', fontSize: 42, fontFamily: 'Urbanist_800ExtraBold', letterSpacing: -1 }}>{totalBalance(benefits)}</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
          <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, fontFamily: 'Urbanist_500Medium' }}>
            {t('wallet.activeCredits', { count: activeCredits.length })}
          </Text>
          <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, fontFamily: 'Urbanist_500Medium' }}>{t('wallet.viewHistory')} →</Text>
        </View>
      </TouchableOpacity>

      {/* My Clubs */}
      {memberships.length > 0 && (
        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontSize: 11, fontFamily: 'Urbanist_700Bold', color: '#4a5260', letterSpacing: 1.2, textTransform: 'uppercase', paddingHorizontal: 20, marginBottom: 10 }}>
            {t('wallet.myClubs')}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}>
            {memberships.map((m) => {
              const biz = m.businesses
              const bizBenefits = benefits.filter((b) => b.business_id === m.business_id && !b.redeemed)
              const tier = getCurrentTier(m.total_stamps ?? 0, allTiers[m.business_id] ?? [])
              return (
                <TouchableOpacity
                  key={m.id}
                  onPress={() => router.push({ pathname: '/store/[id]', params: { id: m.business_id } } as never)}
                  style={{ alignItems: 'center', backgroundColor: '#1e2022', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 12, minWidth: 84, borderWidth: 1, borderColor: '#2a2d2f' }}
                >
                  <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: '#2a2d2f', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginBottom: 6 }}>
                    {biz.logo_url ? <Image source={{ uri: biz.logo_url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" /> : <Text style={{ fontSize: 22 }}>🏪</Text>}
                  </View>
                  <Text style={{ fontSize: 11, fontFamily: 'Urbanist_600SemiBold', color: '#ffffff', textAlign: 'center' }} numberOfLines={1}>{biz.name}</Text>
                  {tier && (
                    <View style={{ marginTop: 4, borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2, backgroundColor: tier.color + '25' }}>
                      <Text style={{ fontSize: 9, fontFamily: 'Urbanist_700Bold', color: tier.color }}>{tier.icon} {tier.name}</Text>
                    </View>
                  )}
                  {bizBenefits.length > 0 && (
                    <View style={{ marginTop: 4, backgroundColor: '#1a7a4a', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 }}>
                      <Text style={{ color: 'white', fontSize: 9, fontFamily: 'Urbanist_700Bold' }}>{bizBenefits.length}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              )
            })}
          </ScrollView>
        </View>
      )}

      {/* Feed posts */}
      {feedPosts.length > 0 && (
        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontSize: 11, fontFamily: 'Urbanist_700Bold', color: '#4a5260', letterSpacing: 1.2, textTransform: 'uppercase', paddingHorizontal: 20, marginBottom: 10 }}>
            {t('wallet.feed')}
          </Text>
          {feedPosts.map(post => <FeedCard key={post.id} post={post} />)}
        </View>
      )}

      {/* Stamp cards */}
      {stampCards.length > 0 && (
        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontSize: 11, fontFamily: 'Urbanist_700Bold', color: '#4a5260', letterSpacing: 1.2, textTransform: 'uppercase', paddingHorizontal: 20, marginBottom: 10 }}>
            {t('wallet.stampCards')}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}>
            {stampCards.map((card) => <StampCardWidget key={card.id} card={card} />)}
          </ScrollView>
        </View>
      )}

      {/* Points */}
      {pointsBalances.length > 0 && (
        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontSize: 11, fontFamily: 'Urbanist_700Bold', color: '#4a5260', letterSpacing: 1.2, textTransform: 'uppercase', paddingHorizontal: 20, marginBottom: 10 }}>
            Points
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}>
            {pointsBalances.map((pb) => (
              <TouchableOpacity key={pb.id}
                onPress={() => router.push({ pathname: '/store/[id]', params: { id: pb.business_id } } as never)}
                style={{ backgroundColor: '#1e2022', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 12, alignItems: 'center', minWidth: 110, borderWidth: 1, borderColor: '#2a2d2f' }}
              >
                <Text style={{ color: '#2ecc71', fontSize: 26, fontFamily: 'Urbanist_800ExtraBold' }}>{pb.balance}</Text>
                <Text style={{ fontSize: 11, color: '#8e969f', marginTop: 2, fontFamily: 'Urbanist_500Medium' }} numberOfLines={1}>{pb.program?.name ?? 'Points'}</Text>
                <Text style={{ fontSize: 9, color: '#4a5260', marginTop: 2, fontFamily: 'Urbanist_400Regular' }}>pts available</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Filter tabs */}
      <View style={{ flexDirection: 'row', paddingHorizontal: 16, marginBottom: 8, gap: 8 }}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            onPress={() => setActiveTab(tab.key)}
            style={{
              flex: 1, borderRadius: 20, paddingVertical: 9, alignItems: 'center',
              backgroundColor: activeTab === tab.key ? '#1a7a4a' : '#1e2022',
              borderWidth: 1, borderColor: activeTab === tab.key ? '#1a7a4a' : '#2a2d2f',
            }}
          >
            <Text style={{ fontSize: 12, fontFamily: 'Urbanist_600SemiBold', color: activeTab === tab.key ? '#ffffff' : '#8e969f' }}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Coupon shortcut */}
      <TouchableOpacity
        onPress={() => router.push('/manual' as never)}
        style={{ marginHorizontal: 16, marginBottom: 10, borderWidth: 1, borderStyle: 'dashed', borderColor: '#1a7a4a', borderRadius: 20, paddingVertical: 11, alignItems: 'center' }}
      >
        <Text style={{ color: '#2ecc71', fontSize: 12, fontFamily: 'Urbanist_600SemiBold' }}>{t('wallet.enterCoupon')}</Text>
      </TouchableOpacity>

      {/* Benefit list */}
      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color="#2ecc71" />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <BenefitCard benefit={item} onRedeem={() => {}} />}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#2ecc71" />}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 64, paddingHorizontal: 32 }}>
              <Text style={{ fontSize: 40, marginBottom: 12 }}>🎁</Text>
              <Text style={{ color: '#4a5260', textAlign: 'center', fontSize: 15, fontFamily: 'Urbanist_500Medium' }}>
                {activeTab === 'all' ? t('wallet.empty') : `No ${activeTab.replace('_', ' ')} benefits`}
              </Text>
            </View>
          }
          ListFooterComponent={<View style={{ height: 16 }} />}
        />
      )}
    </SafeAreaView>
  )
}

function StampCardWidget({ card }: { card: StampCard }) {
  const { t } = useTranslation()
  const dots = Array.from({ length: card.required_stamps }, (_, i) => i < card.current_stamps)
  const cols = Math.min(card.required_stamps, 5)

  return (
    <View style={{ backgroundColor: '#1e2022', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 12, minWidth: 160, maxWidth: 200, borderWidth: 1, borderColor: '#2a2d2f' }}>
      <Text style={{ fontSize: 12, fontFamily: 'Urbanist_700Bold', color: '#ffffff', marginBottom: 8 }} numberOfLines={1}>{card.name}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 8, maxWidth: cols * 20 }}>
        {dots.map((filled, i) => (
          <View key={i} style={{
            width: 14, height: 14, borderRadius: 7,
            backgroundColor: filled ? '#1a7a4a' : '#2a2d2f',
            borderWidth: filled ? 0 : 1, borderColor: '#3a3d3f',
          }} />
        ))}
      </View>
      <Text style={{ fontSize: 11, color: '#8e969f', fontFamily: 'Urbanist_500Medium' }}>
        {card.completed ? t('stampCard.rewardEarned') : t('stampCard.stamps', { current: card.current_stamps, required: card.required_stamps })}
      </Text>
      {!card.completed && (
        <>
          <Text style={{ fontSize: 11, color: '#2ecc71', marginTop: 2, fontFamily: 'Urbanist_500Medium' }} numberOfLines={1}>🎁 {card.reward_title}</Text>
          <Text style={{ fontSize: 10, color: '#4a5260', marginTop: 2, fontFamily: 'Urbanist_400Regular' }} numberOfLines={1}>
            {t('stampCard.moreToEarn', { count: card.required_stamps - card.current_stamps })}
          </Text>
        </>
      )}
    </View>
  )
}
