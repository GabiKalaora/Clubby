import { View, Text, FlatList, ActivityIndicator, Image } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { TouchableOpacity } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAllBenefits, type Benefit } from '../hooks/useBenefits'

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

function valueLabel(b: Benefit): string {
  if (b.type === 'credit' && b.amount_cents != null) return `₪${(b.amount_cents / 100).toFixed(0)}`
  if (b.type === 'discount' && b.discount_percent != null) return `${b.discount_percent}% off`
  return 'Free item'
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IL', { day: 'numeric', month: 'short', year: 'numeric' })
}

function totalSaved(benefits: Benefit[]): number {
  return benefits
    .filter(b => b.type === 'credit' && b.amount_cents != null)
    .reduce((sum, b) => sum + (b.amount_cents ?? 0), 0)
}

function BenefitRow({ benefit }: { benefit: Benefit }) {
  const biz = benefit.businesses
  const isRedeemed = benefit.redeemed

  return (
    <View className="flex-row items-center px-4 py-3 bg-white border-b border-gray-100">
      {/* Logo */}
      <View className="w-10 h-10 rounded-xl bg-gray-100 items-center justify-center overflow-hidden mr-3 flex-shrink-0">
        {biz?.logo_url ? (
          <Image source={{ uri: biz.logo_url }} className="w-full h-full" resizeMode="cover" />
        ) : (
          <Text className="text-lg">🏪</Text>
        )}
      </View>

      {/* Info */}
      <View className="flex-1 min-w-0">
        <Text className="text-sm font-semibold text-gray-900" numberOfLines={1}>{benefit.title}</Text>
        <Text className="text-xs text-gray-400 mt-0.5">{biz?.name ?? '—'} · {formatDate(benefit.created_at)}</Text>
      </View>

      {/* Value + status */}
      <View className="items-end ml-2 flex-shrink-0" style={{ maxWidth: 100 }}>
        <Text className={`text-sm font-bold ${isRedeemed ? 'text-gray-400' : 'text-brand'}`}
          numberOfLines={1}>{valueLabel(benefit)}</Text>
        <View className={`mt-0.5 px-2 py-0.5 rounded-full ${isRedeemed ? 'bg-gray-100' : 'bg-green-100'}`}>
          <Text className={`text-[10px] font-semibold ${isRedeemed ? 'text-gray-400' : 'text-brand'}`}>
            {isRedeemed ? 'Used' : 'Active'}
          </Text>
        </View>
      </View>
    </View>
  )
}

export default function HistoryScreen() {
  const router = useRouter()
  const { data: user } = useCurrentUser()
  const { data: benefits = [], isLoading } = useAllBenefits(user?.id)

  const saved = totalSaved(benefits)
  const redeemedCount = benefits.filter(b => b.redeemed).length

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
        <Text className="text-xl font-bold text-gray-900">Benefit History</Text>
      </View>

      {/* Summary card */}
      {benefits.length > 0 && (
        <View className="mx-4 mb-4 bg-brand rounded-2xl p-5">
          <Text className="text-white/80 text-sm mb-1">Your benefits</Text>
          <Text className="text-white text-3xl font-bold">
            {benefits.length} benefit{benefits.length !== 1 ? 's' : ''}
          </Text>
          <Text className="text-white/70 text-xs mt-1">
            {redeemedCount} redeemed{saved > 0 ? ` · ₪${(saved / 100).toFixed(0)} credit earned` : ''}
          </Text>
        </View>
      )}

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#2ecc71" />
        </View>
      ) : benefits.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-4xl mb-3">🎁</Text>
          <Text className="text-gray-500 text-center text-base">
            No benefits yet. Scan a QR code or join a club to start earning rewards.
          </Text>
        </View>
      ) : (
        <FlatList
          data={benefits}
          keyExtractor={b => b.id}
          renderItem={({ item }) => <BenefitRow benefit={item} />}
          contentContainerStyle={{ paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  )
}
