import { View, Text, Image, TouchableOpacity } from 'react-native'
import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import type { Benefit } from '../hooks/useBenefits'

type Props = {
  benefit: Benefit
  onRedeem: (id: string) => void
}

function expiryBadge(expiresAt: string | null, t: ReturnType<typeof useTranslation>['t']): { label: string; color: string } | null {
  if (!expiresAt) return null
  const diff = new Date(expiresAt).getTime() - Date.now()
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
  if (days < 0) return { label: t('benefit.expired'), color: 'bg-gray-400' }
  if (days <= 3) return { label: t('benefit.daysLeft', { count: days }), color: 'bg-red-400' }
  if (days <= 7) return { label: t('benefit.daysLeft', { count: days }), color: 'bg-amber-400' }
  return null
}

function valueLabel(benefit: Benefit, t: ReturnType<typeof useTranslation>['t']): string {
  if (benefit.type === 'credit' && benefit.amount_cents != null) {
    return `₪${(benefit.amount_cents / 100).toFixed(2)}`
  }
  if (benefit.type === 'discount' && benefit.discount_percent != null) {
    return `${benefit.discount_percent}% off`
  }
  return t('benefit.freeItem')
}

export default function BenefitCard({ benefit }: Props) {
  const router = useRouter()
  const { t } = useTranslation()
  const badge = expiryBadge(benefit.expires_at, t)
  const businessName = benefit.businesses?.name ?? 'Unknown'
  const logoUrl = benefit.businesses?.logo_url
  const isExpired = benefit.expires_at != null && new Date(benefit.expires_at) < new Date()
  const isUsed = benefit.redeemed

  return (
    <View className={`bg-white dark:bg-gray-800 rounded-2xl mx-4 mb-3 p-4 shadow-sm border ${isUsed ? 'border-gray-100 opacity-60' : 'border-gray-100'}`}>
      <View className="flex-row items-center">
        {/* Logo */}
        <View className="w-12 h-12 rounded-xl bg-gray-100 items-center justify-center ms-3 overflow-hidden flex-shrink-0">
          {logoUrl ? (
            <Image source={{ uri: logoUrl }} className="w-full h-full" resizeMode="cover" />
          ) : (
            <Text className="text-xl">🏪</Text>
          )}
        </View>

        {/* Content — fixed layout, no flex-wrap on name row */}
        <View className="flex-1 min-w-0">
          <View className="flex-row items-center gap-x-1.5">
            <Text className="font-semibold text-gray-900 dark:text-white text-sm" numberOfLines={1}>{businessName}</Text>
            {!benefit.verified && (
              <View className="bg-gray-200 rounded px-1.5 py-0.5 flex-shrink-0">
                <Text className="text-gray-500 text-[10px]">{t('benefit.manual')}</Text>
              </View>
            )}
          </View>
          <Text className="text-gray-500 dark:text-gray-400 text-xs mt-0.5" numberOfLines={1}>{benefit.title}</Text>
          {badge && !isUsed && (
            <View className={`${badge.color} rounded px-1.5 py-0.5 self-start mt-1`}>
              <Text className="text-white text-xs font-medium">{badge.label}</Text>
            </View>
          )}
        </View>

        {/* Value + status */}
        <View className="items-end me-3 flex-shrink-0" style={{ maxWidth: 90 }}>
          {isUsed ? (
            <>
              <Text className="text-gray-400 font-bold text-sm">{valueLabel(benefit, t)}</Text>
              <View className="bg-gray-100 rounded-full px-2.5 py-1 mt-1.5">
                <Text className="text-gray-400 text-xs font-semibold">{t('benefit.used')}</Text>
              </View>
            </>
          ) : (
            <>
              <View className="bg-gray-900 rounded-xl px-2.5 py-1 mb-2">
                <Text className="text-white font-bold text-sm" numberOfLines={1}>{valueLabel(benefit, t)}</Text>
              </View>
              {!isExpired && (
                <TouchableOpacity
                  className="bg-brand rounded-full px-3 py-1.5"
                  onPress={() => router.push({ pathname: '/redeem/[id]', params: { id: benefit.id } } as never)}
                >
                  <Text className="text-white text-xs font-semibold">{t('benefit.use')}</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </View>
    </View>
  )
}
