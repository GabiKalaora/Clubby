import { View, Text, Image, TouchableOpacity } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useTranslation } from 'react-i18next'
import type { Benefit } from '../hooks/useBenefits'

type Props = {
  benefit: Benefit
  onRedeem: (id: string) => void
}

// credit=purple, discount=pink, free_item=light purple
const TYPE_ACCENT: Record<string, string> = {
  credit:    '#a855f7',
  discount:  '#ec4899',
  free_item: '#c084fc',
}

function expiryBadge(expiresAt: string | null, t: ReturnType<typeof useTranslation>['t']): { label: string; color: string } | null {
  if (!expiresAt) return null
  const diff = new Date(expiresAt).getTime() - Date.now()
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
  if (days < 0) return { label: t('benefit.expired'), color: '#94a3b8' }
  if (days <= 3) return { label: t('benefit.daysLeft', { count: days }), color: '#ef4444' }
  if (days <= 7) return { label: t('benefit.daysLeft', { count: days }), color: '#f59e0b' }
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

export default function BenefitCard({ benefit, onRedeem }: Props) {
  const { t } = useTranslation()
  const badge = expiryBadge(benefit.expires_at, t)
  const businessName = benefit.businesses?.name ?? 'Unknown'
  const logoUrl = benefit.businesses?.logo_url
  const isExpired = benefit.expires_at != null && new Date(benefit.expires_at) < new Date()
  const isUsed = benefit.redeemed
  const accent = TYPE_ACCENT[benefit.type] ?? '#a855f7'

  return (
    <View style={{
      backgroundColor: '#ffffff',
      borderRadius: 16,
      marginHorizontal: 16,
      marginBottom: 10,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: isUsed ? '#e2e8f0' : 'rgba(168,85,247,0.18)',
      opacity: isUsed ? 0.5 : 1,
      shadowColor: '#a855f7',
      shadowOpacity: isUsed ? 0 : 0.06,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
      elevation: isUsed ? 0 : 2,
    }}>
      {/* Accent top bar */}
      {!isUsed && <View style={{ height: 3, backgroundColor: accent }} />}

      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 14 }}>
        {/* Logo */}
        <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginEnd: 12, flexShrink: 0 }}>
          {logoUrl
            ? <Image source={{ uri: logoUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
            : <Text style={{ fontSize: 22 }}>🏪</Text>}
        </View>

        {/* Content */}
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', color: '#2d3748', fontSize: 14 }} numberOfLines={1}>{businessName}</Text>
            {!benefit.verified && (
              <View style={{ backgroundColor: '#f1f5f9', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                <Text style={{ color: '#94a3b8', fontSize: 10, fontFamily: 'PlusJakartaSans_500Medium' }}>{t('benefit.manual')}</Text>
              </View>
            )}
          </View>
          <Text style={{ color: '#64748b', fontSize: 12, marginTop: 2, fontFamily: 'PlusJakartaSans_400Regular' }} numberOfLines={1}>{benefit.title}</Text>
          {badge && !isUsed && (
            <View style={{ backgroundColor: badge.color + '18', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start', marginTop: 6 }}>
              <Text style={{ color: badge.color, fontSize: 11, fontFamily: 'PlusJakartaSans_600SemiBold' }}>{badge.label}</Text>
            </View>
          )}
        </View>

        {/* Value + action */}
        <View style={{ alignItems: 'flex-end', marginStart: 8, flexShrink: 0, maxWidth: 90 }}>
          {isUsed ? (
            <>
              <Text style={{ color: '#94a3b8', fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14 }}>{valueLabel(benefit, t)}</Text>
              <View style={{ backgroundColor: '#f1f5f9', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, marginTop: 6 }}>
                <Text style={{ color: '#94a3b8', fontSize: 11, fontFamily: 'PlusJakartaSans_600SemiBold' }}>{t('benefit.used')}</Text>
              </View>
            </>
          ) : (
            <>
              <View style={{ backgroundColor: accent + '15', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, marginBottom: 8 }}>
                <Text style={{ color: accent, fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 15 }} numberOfLines={1}>{valueLabel(benefit, t)}</Text>
              </View>
              {!isExpired && (
                <TouchableOpacity
                  onPress={() => onRedeem(benefit.id)}
                >
                  <LinearGradient
                    colors={['#ec4899', '#a855f7']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    style={{ borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 }}
                  >
                    <Text style={{ color: 'white', fontSize: 12, fontFamily: 'PlusJakartaSans_700Bold' }}>{t('benefit.use')}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </View>
    </View>
  )
}
