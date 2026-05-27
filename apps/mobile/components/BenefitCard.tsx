import { useState } from 'react'
import { View, Text, Image, TouchableOpacity } from 'react-native'
import type { Benefit } from '../hooks/useBenefits'

type Props = {
  benefit: Benefit
  onRedeem: (id: string) => void
}

function expiryBadge(expiresAt: string | null): { label: string; color: string } | null {
  if (!expiresAt) return null
  const diff = new Date(expiresAt).getTime() - Date.now()
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
  if (days < 0) return { label: 'Expired', color: 'bg-gray-400' }
  if (days <= 3) return { label: `${days}d left`, color: 'bg-red-400' }
  if (days <= 7) return { label: `${days}d left`, color: 'bg-amber-400' }
  return null
}

function valueLabel(benefit: Benefit): string {
  if (benefit.type === 'credit' && benefit.amount_cents != null) {
    return `₪${(benefit.amount_cents / 100).toFixed(2)}`
  }
  if (benefit.type === 'discount' && benefit.discount_percent != null) {
    return `${benefit.discount_percent}% off`
  }
  return benefit.free_item_description ?? benefit.title
}

export default function BenefitCard({ benefit, onRedeem }: Props) {
  const [confirming, setConfirming] = useState(false)
  const badge = expiryBadge(benefit.expires_at)
  const businessName = benefit.businesses?.name ?? 'Unknown'
  const logoUrl = benefit.businesses?.logo_url
  const isExpired = benefit.expires_at != null && new Date(benefit.expires_at) < new Date()

  return (
    <View className="bg-white rounded-2xl mx-4 mb-3 p-4 shadow-sm border border-gray-100">
      <View className="flex-row items-center">
        {/* Logo */}
        <View className="w-12 h-12 rounded-xl bg-gray-100 items-center justify-center mr-3 overflow-hidden flex-shrink-0">
          {logoUrl ? (
            <Image source={{ uri: logoUrl }} className="w-full h-full" resizeMode="cover" />
          ) : (
            <Text className="text-xl">🏪</Text>
          )}
        </View>

        {/* Content */}
        <View className="flex-1">
          <View className="flex-row items-center gap-x-2 flex-wrap">
            <Text className="font-semibold text-gray-900 text-sm">{businessName}</Text>
            {!benefit.verified && (
              <View className="bg-gray-200 rounded px-1.5 py-0.5">
                <Text className="text-gray-500 text-xs">Manual</Text>
              </View>
            )}
          </View>
          <Text className="text-gray-500 text-xs mt-0.5" numberOfLines={1}>{benefit.title}</Text>
          {badge && (
            <View className={`${badge.color} rounded px-1.5 py-0.5 self-start mt-1`}>
              <Text className="text-white text-xs font-medium">{badge.label}</Text>
            </View>
          )}
        </View>

        {/* Value + Use button */}
        <View className="items-end ml-2 flex-shrink-0">
          <View className="bg-brand/10 rounded-xl px-2.5 py-1 mb-2">
            <Text className="text-brand font-bold text-sm">{valueLabel(benefit)}</Text>
          </View>
          {!confirming && !isExpired && (
            <TouchableOpacity
              className="bg-brand rounded-full px-3 py-1.5"
              onPress={() => setConfirming(true)}
            >
              <Text className="text-white text-xs font-semibold">Use</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Inline confirmation strip */}
      {confirming && (
        <View className="mt-3 pt-3 border-t border-gray-100 flex-row items-center justify-between">
          <Text className="text-gray-600 text-xs flex-1 mr-3">
            Redeem at {businessName}?
          </Text>
          <View className="flex-row gap-x-2">
            <TouchableOpacity
              className="bg-gray-100 rounded-full px-3 py-1.5"
              onPress={() => setConfirming(false)}
            >
              <Text className="text-gray-600 text-xs font-semibold">Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="bg-red-400 rounded-full px-3 py-1.5"
              onPress={() => { setConfirming(false); onRedeem(benefit.id) }}
            >
              <Text className="text-white text-xs font-semibold">Confirm</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  )
}
