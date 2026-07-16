import { useState } from 'react'
import {
  View, Text, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, ScrollView, Image,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../lib/supabase'
import { useCurrentUser } from '../hooks/useAuth'
import { useBenefits, type Benefit } from '../hooks/useBenefits'
import { useMemberships } from '../hooks/useMemberships'
import { useStampCards, type StampCard } from '../hooks/useStampCards'
import { usePointsBalances } from '../hooks/usePoints'
import type { Tier } from '../hooks/useTiers'
import BenefitCard from '../components/BenefitCard'
import { brand, font, radius, type ThemeColors } from '../lib/theme'

type Tab = 'all' | 'credit' | 'discount' | 'free_item'

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

function SectionLabel({ children, colors }: { children: string; colors: ThemeColors }) {
  return (
    <Text style={{
      fontSize: 11, fontFamily: font.bold, color: colors.textMuted,
      letterSpacing: 1.2, textTransform: 'uppercase', paddingHorizontal: 20, marginBottom: 10,
    }}>
      {children}
    </Text>
  )
}

function StampCardWidget({ card, colors }: { card: StampCard; colors: ThemeColors }) {
  const { t } = useTranslation()
  const dots = Array.from({ length: card.required_stamps }, (_, i) => i < card.current_stamps)
  const cols = Math.min(card.required_stamps, 5)

  return (
    <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, paddingHorizontal: 14, paddingVertical: 12, minWidth: 160, maxWidth: 200, borderWidth: 1, borderColor: colors.border }}>
      <Text style={{ fontSize: 12, fontFamily: font.bold, color: colors.text, marginBottom: 8 }} numberOfLines={1}>{card.name}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 8, maxWidth: cols * 20 }}>
        {dots.map((filled, i) => (
          <View key={i} style={{
            width: 14, height: 14, borderRadius: 7,
            backgroundColor: filled ? colors.accent : colors.surfaceAlt,
            borderWidth: filled ? 0 : 1, borderColor: colors.border,
          }} />
        ))}
      </View>
      <Text style={{ fontSize: 11, color: colors.textMuted, fontFamily: font.medium }}>
        {card.completed ? t('stampCard.rewardEarned') : t('stampCard.stamps', { current: card.current_stamps, required: card.required_stamps })}
      </Text>
      {!card.completed && (
        <>
          <Text style={{ fontSize: 11, color: colors.accent, marginTop: 2, fontFamily: font.medium }} numberOfLines={1}>🎁 {card.reward_title}</Text>
          <Text style={{ fontSize: 10, color: colors.textMuted, marginTop: 2, fontFamily: font.regular }} numberOfLines={1}>
            {t('stampCard.moreToEarn', { count: card.required_stamps - card.current_stamps })}
          </Text>
        </>
      )}
    </View>
  )
}

/**
 * Wallet — benefits, clubs, stamp cards, points.
 * Stories and the updates feed live on the Home screen now.
 */
export default function WalletScreen({ colors }: { colors: ThemeColors }) {
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
  const { data: memberships = [] } = useMemberships(user?.id)
  const membershipBusinessIds = memberships.map((m) => m.business_id)
  const { data: stampCards = [] } = useStampCards(membershipBusinessIds, user?.id)
  const { data: allTiers = {} } = useAllTiers(membershipBusinessIds)
  const { data: pointsBalances = [] } = usePointsBalances(user?.id)

  const filtered = activeTab === 'all'
    ? benefits
    : benefits.filter((b: Benefit) => b.type === activeTab)

  const activeBenefits = benefits.filter(
    (b: Benefit) => !b.redeemed && (!b.expires_at || new Date(b.expires_at) > new Date()),
  )
  const creditTotal = benefits
    .filter((b: Benefit) => b.type === 'credit' && b.amount_cents != null)
    .reduce((s: number, b: Benefit) => s + (b.amount_cents ?? 0), 0)

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 6, paddingBottom: 12 }}>
        <Text style={{ fontSize: 24, fontFamily: font.extrabold, color: colors.text, letterSpacing: -0.5 }}>{t('wallet.title')}</Text>
        <TouchableOpacity onPress={() => router.push('/manual' as never)} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <Ionicons name="ticket-outline" size={18} color={colors.accent} />
          <Text style={{ color: colors.accent, fontSize: 13, fontFamily: font.semibold }}>{t('wallet.enterCoupon')}</Text>
        </TouchableOpacity>
      </View>

      {/* Balance hero */}
      <TouchableOpacity onPress={() => router.push('/history' as never)} activeOpacity={0.88} style={{ marginHorizontal: 16, marginBottom: 16 }}>
        <LinearGradient
          colors={brand.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={{
            borderRadius: radius.xl, padding: 22,
            shadowColor: brand.purple, shadowOpacity: 0.35, shadowRadius: 16, shadowOffset: { width: 0, height: 8 },
            elevation: 10,
          }}
        >
          <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, fontFamily: font.medium, marginBottom: 12 }}>{t('wallet.yourBenefits')}</Text>
          <View style={{ flexDirection: 'row', gap: 24 }}>
            <View>
              <Text style={{ color: '#fff', fontSize: 36, fontFamily: font.extrabold, letterSpacing: -1 }}>{activeBenefits.length}</Text>
              <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12, fontFamily: font.medium, marginTop: 2 }}>{t('wallet.activeBenefits')}</Text>
            </View>
            {creditTotal > 0 && (
              <View style={{ borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.2)', paddingLeft: 24 }}>
                <Text style={{ color: '#fff', fontSize: 36, fontFamily: font.extrabold, letterSpacing: -1 }}>₪{(creditTotal / 100).toFixed(0)}</Text>
                <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12, fontFamily: font.medium, marginTop: 2 }}>{t('wallet.creditBalance')}</Text>
              </View>
            )}
          </View>
          <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, fontFamily: font.medium, marginTop: 12 }}>{t('wallet.viewHistory')} →</Text>
        </LinearGradient>
      </TouchableOpacity>

      {/* Filter pills */}
      <ScrollView
        horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
        style={{ marginBottom: 10, flexGrow: 0 }}
      >
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            onPress={() => setActiveTab(tab.key)}
            style={{
              borderRadius: radius.full, paddingVertical: 9, paddingHorizontal: 15, alignItems: 'center',
              backgroundColor: activeTab === tab.key ? colors.text : colors.surface,
              borderWidth: 1, borderColor: activeTab === tab.key ? colors.text : colors.border,
            }}
          >
            <Text style={{ fontSize: 12, fontFamily: font.semibold, color: activeTab === tab.key ? colors.background : colors.textSecondary }}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <BenefitCard benefit={item} onRedeem={(id) => router.push({ pathname: '/redeem/[id]', params: { id } } as never)} />}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.accent} />}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 40, paddingHorizontal: 32 }}>
              <Text style={{ fontSize: 40, marginBottom: 12 }}>🎁</Text>
              <Text style={{ color: colors.textSecondary, textAlign: 'center', fontSize: 15, fontFamily: font.medium }}>
                {activeTab === 'all' ? t('wallet.empty') : t('wallet.emptyTab', { tab: activeTab.replace('_', ' ') })}
              </Text>
            </View>
          }
          ListFooterComponent={
            <>
              {memberships.length > 0 && (
                <View style={{ marginTop: 8, marginBottom: 20 }}>
                  <SectionLabel colors={colors}>{t('wallet.myClubs')}</SectionLabel>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}>
                    {memberships.map((m) => {
                      const biz = m.businesses
                      const bizBenefits = benefits.filter((b: Benefit) => b.business_id === m.business_id && !b.redeemed)
                      const tier = getCurrentTier(m.total_stamps ?? 0, allTiers[m.business_id] ?? [])
                      return (
                        <TouchableOpacity
                          key={m.id}
                          onPress={() => router.push({ pathname: '/store/[id]', params: { id: m.business_id } } as never)}
                          style={{ alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.lg, paddingHorizontal: 14, paddingVertical: 12, minWidth: 84, borderWidth: 1, borderColor: colors.border }}
                        >
                          <View style={{ width: 48, height: 48, borderRadius: radius.md, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginBottom: 6 }}>
                            {biz.logo_url ? <Image source={{ uri: biz.logo_url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" /> : <Text style={{ fontSize: 22 }}>🏪</Text>}
                          </View>
                          <Text style={{ fontSize: 11, fontFamily: font.semibold, color: colors.text, textAlign: 'center' }} numberOfLines={1}>{biz.name}</Text>
                          {tier && (
                            <View style={{ marginTop: 4, borderRadius: radius.sm, paddingHorizontal: 6, paddingVertical: 2, backgroundColor: tier.color + '25' }}>
                              <Text style={{ fontSize: 9, fontFamily: font.bold, color: tier.color }}>{tier.icon} {tier.name}</Text>
                            </View>
                          )}
                          {bizBenefits.length > 0 && (
                            <View style={{ marginTop: 4, backgroundColor: colors.accent, borderRadius: radius.sm, paddingHorizontal: 6, paddingVertical: 2 }}>
                              <Text style={{ color: '#fff', fontSize: 9, fontFamily: font.bold }}>{bizBenefits.length}</Text>
                            </View>
                          )}
                        </TouchableOpacity>
                      )
                    })}
                  </ScrollView>
                </View>
              )}

              {stampCards.length > 0 && (
                <View style={{ marginBottom: 20 }}>
                  <SectionLabel colors={colors}>{t('wallet.stampCards')}</SectionLabel>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}>
                    {stampCards.map((card) => <StampCardWidget key={card.id} card={card} colors={colors} />)}
                  </ScrollView>
                </View>
              )}

              {pointsBalances.length > 0 && (
                <View style={{ marginBottom: 20 }}>
                  <SectionLabel colors={colors}>{t('wallet.points')}</SectionLabel>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}>
                    {pointsBalances.map((pb) => (
                      <TouchableOpacity key={pb.id}
                        onPress={() => router.push({ pathname: '/store/[id]', params: { id: pb.business_id } } as never)}
                        style={{ backgroundColor: colors.surface, borderRadius: radius.lg, paddingHorizontal: 16, paddingVertical: 12, alignItems: 'center', minWidth: 110, borderWidth: 1, borderColor: colors.border }}
                      >
                        <Text style={{ color: colors.accent, fontSize: 26, fontFamily: font.extrabold }}>{pb.balance}</Text>
                        <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 2, fontFamily: font.medium }} numberOfLines={1}>{pb.program?.name ?? t('wallet.points')}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
              <View style={{ height: 24 }} />
            </>
          }
        />
      )}
    </View>
  )
}
