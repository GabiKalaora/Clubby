import { useState } from 'react'
import {
  View, Text, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, ScrollView, Image,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabase'
import { useCurrentUser } from '../../hooks/useAuth'
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
    promotion: '#c084fc',
    offer: '#f59e0b',
    announcement: '#ec4899',
    story: '#ec4899',
  }
  const color = TYPE_COLOR[post.type] ?? '#c084fc'
  return (
    <View style={{ backgroundColor: '#ffffff', borderRadius: 20, marginHorizontal: 16, marginBottom: 10, overflow: 'hidden', borderWidth: 1, borderColor: '#e2e8f0' }}>
      {post.image_url && (
        <Image source={{ uri: post.image_url }} style={{ width: '100%', height: 160 }} resizeMode="cover" />
      )}
      <View style={{ padding: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 }}>
          <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            {biz?.logo_url ? <Image source={{ uri: biz.logo_url }} style={{ width: 28, height: 28 }} /> : <Text style={{ fontSize: 14 }}>🏪</Text>}
          </View>
          <Text style={{ fontSize: 12, fontFamily: 'PlusJakartaSans_600SemiBold', color: '#94a3b8', flex: 1 }} numberOfLines={1}>{biz?.name}</Text>
          <View style={{ borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, backgroundColor: color + '25' }}>
            <Text style={{ fontSize: 10, fontFamily: 'PlusJakartaSans_700Bold', color }}>{post.type.toUpperCase()}</Text>
          </View>
        </View>
        <Text style={{ fontSize: 14, fontFamily: 'PlusJakartaSans_700Bold', color: '#2d3748', marginBottom: 4 }}>{post.title}</Text>
        {post.body && <Text style={{ fontSize: 12, color: '#94a3b8', fontFamily: 'PlusJakartaSans_400Regular', lineHeight: 18 }} numberOfLines={3}>{post.body}</Text>}
        {post.cta_text && (
          <TouchableOpacity
            onPress={() => router.push({ pathname: '/store/[id]', params: { id: post.business_id } } as never)}
            style={{ marginTop: 12, borderRadius: 14, paddingVertical: 10, alignItems: 'center', backgroundColor: color }}
          >
            <Text style={{ color: 'white', fontSize: 12, fontFamily: 'PlusJakartaSans_700Bold' }}>{post.cta_text}</Text>
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
  const activeBenefits = benefits.filter(
    (b) => !b.redeemed && (!b.expires_at || new Date(b.expires_at) > new Date()),
  )
  const creditTotal = activeCredits.reduce((s, b) => s + (b.amount_cents ?? 0), 0)

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8f9fa' }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 }}>
        <Text style={{ fontSize: 26, fontFamily: 'PlusJakartaSans_700Bold', color: '#2d3748' }}>{t('wallet.title')}</Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity
            onPress={() => router.push('/notifications' as never)}
            style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center' }}
          >
            <Text style={{ fontSize: 16 }}>🔔</Text>
            {unreadCount > 0 && (
              <View style={{ position: 'absolute', top: 0, right: 0, width: 16, height: 16, borderRadius: 8, backgroundColor: '#ef4444', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: 'white', fontSize: 9, fontFamily: 'PlusJakartaSans_700Bold' }}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push('/profile' as never)}
            style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center' }}
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
                <View style={{ width: 56, height: 56, borderRadius: 28, borderWidth: 2, borderColor: '#a855f7', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: '#ffffff' }}>
                  {logo ? <Image source={{ uri: logo }} style={{ width: '100%', height: '100%' }} resizeMode="cover" /> : <Text style={{ fontSize: 22 }}>{name[0] ?? '🏪'}</Text>}
                </View>
                <Text style={{ fontSize: 10, color: '#94a3b8', marginTop: 4, textAlign: 'center', fontFamily: 'PlusJakartaSans_500Medium' }} numberOfLines={1}>{name}</Text>
              </TouchableOpacity>
            )
          })}
        </ScrollView>
      )}

      {/* Balance card — gradient hero */}
      <TouchableOpacity
        onPress={() => router.push('/history' as never)}
        activeOpacity={0.88}
        style={{ marginHorizontal: 16, marginBottom: 16 }}
      >
        <LinearGradient
          colors={['#ec4899', '#a855f7']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={{
            borderRadius: 24, padding: 22,
            shadowColor: '#a855f7', shadowOpacity: 0.4, shadowRadius: 16, shadowOffset: { width: 0, height: 8 },
            elevation: 10,
          }}
        >
          <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, fontFamily: 'PlusJakartaSans_500Medium', marginBottom: 12 }}>{t('wallet.yourBenefits')}</Text>
          <View style={{ flexDirection: 'row', gap: 24 }}>
            <View>
              <Text style={{ color: '#ffffff', fontSize: 36, fontFamily: 'PlusJakartaSans_800ExtraBold', letterSpacing: -1 }}>{activeBenefits.length}</Text>
              <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12, fontFamily: 'PlusJakartaSans_500Medium', marginTop: 2 }}>{t('wallet.activeBenefits')}</Text>
            </View>
            {creditTotal > 0 && (
              <View style={{ borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.2)', paddingLeft: 24 }}>
                <Text style={{ color: '#ffffff', fontSize: 36, fontFamily: 'PlusJakartaSans_800ExtraBold', letterSpacing: -1 }}>₪{(creditTotal / 100).toFixed(0)}</Text>
                <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12, fontFamily: 'PlusJakartaSans_500Medium', marginTop: 2 }}>{t('wallet.creditBalance')}</Text>
              </View>
            )}
          </View>
          <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, fontFamily: 'PlusJakartaSans_500Medium', marginTop: 12 }}>{t('wallet.viewHistory')} →</Text>
        </LinearGradient>
      </TouchableOpacity>

      {/* Filter tabs — immediately after balance card */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
        style={{ marginBottom: 8 }}
      >
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            onPress={() => setActiveTab(tab.key)}
            style={{
              borderRadius: 20, paddingVertical: 9, paddingHorizontal: 14, alignItems: 'center',
              backgroundColor: activeTab === tab.key ? '#a855f7' : '#ffffff',
              borderWidth: 1, borderColor: activeTab === tab.key ? '#a855f7' : '#e2e8f0',
            }}
          >
            <Text style={{ fontSize: 12, fontFamily: 'PlusJakartaSans_600SemiBold', color: activeTab === tab.key ? '#ffffff' : '#94a3b8' }}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Coupon shortcut */}
      <TouchableOpacity
        onPress={() => router.push('/manual' as never)}
        style={{ marginHorizontal: 16, marginBottom: 10, borderWidth: 1, borderStyle: 'dashed', borderColor: '#a855f7', borderRadius: 20, paddingVertical: 11, alignItems: 'center' }}
      >
        <Text style={{ color: '#c084fc', fontSize: 12, fontFamily: 'PlusJakartaSans_600SemiBold' }}>{t('wallet.enterCoupon')}</Text>
      </TouchableOpacity>

      {/* Benefit list — first visible content */}
      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color="#c084fc" />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <BenefitCard benefit={item} onRedeem={(id) => router.push({ pathname: '/redeem/[id]', params: { id } } as never)} />}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#c084fc" />}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 40, paddingHorizontal: 32 }}>
              <Text style={{ fontSize: 40, marginBottom: 12 }}>🎁</Text>
              <Text style={{ color: '#64748b', textAlign: 'center', fontSize: 15, fontFamily: 'PlusJakartaSans_500Medium' }}>
                {activeTab === 'all' ? t('wallet.empty') : t('wallet.emptyTab', { tab: activeTab.replace('_', ' ') })}
              </Text>
            </View>
          }
          ListFooterComponent={
            <>
              {/* My Clubs */}
              {memberships.length > 0 && (
                <View style={{ marginTop: 8, marginBottom: 20 }}>
                  <Text style={{ fontSize: 11, fontFamily: 'PlusJakartaSans_700Bold', color: '#64748b', letterSpacing: 1.2, textTransform: 'uppercase', paddingHorizontal: 20, marginBottom: 10 }}>
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
                          style={{ alignItems: 'center', backgroundColor: '#ffffff', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 12, minWidth: 84, borderWidth: 1, borderColor: '#e2e8f0' }}
                        >
                          <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginBottom: 6 }}>
                            {biz.logo_url ? <Image source={{ uri: biz.logo_url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" /> : <Text style={{ fontSize: 22 }}>🏪</Text>}
                          </View>
                          <Text style={{ fontSize: 11, fontFamily: 'PlusJakartaSans_600SemiBold', color: '#2d3748', textAlign: 'center' }} numberOfLines={1}>{biz.name}</Text>
                          {tier && (
                            <View style={{ marginTop: 4, borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2, backgroundColor: tier.color + '25' }}>
                              <Text style={{ fontSize: 9, fontFamily: 'PlusJakartaSans_700Bold', color: tier.color }}>{tier.icon} {tier.name}</Text>
                            </View>
                          )}
                          {bizBenefits.length > 0 && (
                            <View style={{ marginTop: 4, backgroundColor: '#a855f7', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 }}>
                              <Text style={{ color: 'white', fontSize: 9, fontFamily: 'PlusJakartaSans_700Bold' }}>{bizBenefits.length}</Text>
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
                <View style={{ marginBottom: 20 }}>
                  <Text style={{ fontSize: 11, fontFamily: 'PlusJakartaSans_700Bold', color: '#64748b', letterSpacing: 1.2, textTransform: 'uppercase', paddingHorizontal: 20, marginBottom: 10 }}>
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
                  <Text style={{ fontSize: 11, fontFamily: 'PlusJakartaSans_700Bold', color: '#64748b', letterSpacing: 1.2, textTransform: 'uppercase', paddingHorizontal: 20, marginBottom: 10 }}>
                    Points
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}>
                    {pointsBalances.map((pb) => (
                      <TouchableOpacity key={pb.id}
                        onPress={() => router.push({ pathname: '/store/[id]', params: { id: pb.business_id } } as never)}
                        style={{ backgroundColor: '#ffffff', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 12, alignItems: 'center', minWidth: 110, borderWidth: 1, borderColor: '#e2e8f0' }}
                      >
                        <Text style={{ color: '#c084fc', fontSize: 26, fontFamily: 'PlusJakartaSans_800ExtraBold' }}>{pb.balance}</Text>
                        <Text style={{ fontSize: 11, color: '#94a3b8', marginTop: 2, fontFamily: 'PlusJakartaSans_500Medium' }} numberOfLines={1}>{pb.program?.name ?? 'Points'}</Text>
                        <Text style={{ fontSize: 9, color: '#64748b', marginTop: 2, fontFamily: 'PlusJakartaSans_400Regular' }}>pts available</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Updates feed */}
              {feedPosts.length > 0 && (
                <View style={{ marginBottom: 20 }}>
                  <Text style={{ fontSize: 11, fontFamily: 'PlusJakartaSans_700Bold', color: '#64748b', letterSpacing: 1.2, textTransform: 'uppercase', paddingHorizontal: 20, marginBottom: 10 }}>
                    {t('wallet.feed')}
                  </Text>
                  {feedPosts.map(post => <FeedCard key={post.id} post={post} />)}
                </View>
              )}
              <View style={{ height: 24 }} />
            </>
          }
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
    <View style={{ backgroundColor: '#ffffff', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 12, minWidth: 160, maxWidth: 200, borderWidth: 1, borderColor: '#e2e8f0' }}>
      <Text style={{ fontSize: 12, fontFamily: 'PlusJakartaSans_700Bold', color: '#2d3748', marginBottom: 8 }} numberOfLines={1}>{card.name}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 8, maxWidth: cols * 20 }}>
        {dots.map((filled, i) => (
          <View key={i} style={{
            width: 14, height: 14, borderRadius: 7,
            backgroundColor: filled ? '#a855f7' : '#e2e8f0',
            borderWidth: filled ? 0 : 1, borderColor: '#3a3d3f',
          }} />
        ))}
      </View>
      <Text style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'PlusJakartaSans_500Medium' }}>
        {card.completed ? t('stampCard.rewardEarned') : t('stampCard.stamps', { current: card.current_stamps, required: card.required_stamps })}
      </Text>
      {!card.completed && (
        <>
          <Text style={{ fontSize: 11, color: '#c084fc', marginTop: 2, fontFamily: 'PlusJakartaSans_500Medium' }} numberOfLines={1}>🎁 {card.reward_title}</Text>
          <Text style={{ fontSize: 10, color: '#64748b', marginTop: 2, fontFamily: 'PlusJakartaSans_400Regular' }} numberOfLines={1}>
            {t('stampCard.moreToEarn', { count: card.required_stamps - card.current_stamps })}
          </Text>
        </>
      )}
    </View>
  )
}
