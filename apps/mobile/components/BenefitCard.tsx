import { View, Text, Image, TouchableOpacity } from 'react-native'
import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import type { Benefit } from '../hooks/useBenefits'

type Props = {
  benefit: Benefit
  onRedeem: (id: string) => void
}

const TYPE_ACCENT: Record<string, string> = {
  credit:    '#1a7a4a',
  discount:  '#2563eb',
  free_item: '#9333ea',
}

function expiryBadge(expiresAt: string | null, t: ReturnType<typeof useTranslation>['t']): { label: string; color: string } | null {
  if (!expiresAt) return null
  const diff = new Date(expiresAt).getTime() - Date.now()
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
  if (days < 0) return { label: t('benefit.expired'), color: '#6b7280' }
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

export default function BenefitCard({ benefit }: Props) {
  const router = useRouter()
  const { t } = useTranslation()
  const badge = expiryBadge(benefit.expires_at, t)
  const businessName = benefit.businesses?.name ?? 'Unknown'
  const logoUrl = benefit.businesses?.logo_url
  const isExpired = benefit.expires_at != null && new Date(benefit.expires_at) < new Date()
  const isUsed = benefit.redeemed
  const accent = TYPE_ACCENT[benefit.type] ?? '#1a7a4a'

  return (
    <View style={{
      backgroundColor: '#1e2022',
      borderRadius: 20,
      marginHorizontal: 16,
      marginBottom: 10,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: '#2a2d2f',
      opacity: isUsed ? 0.55 : 1,
      // colored left accent bar
      borderLeftWidth: 4,
      borderLeftColor: isUsed ? '#2a2d2f' : accent,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 14 }}>
        {/* Logo */}
        <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: '#2a2d2f', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginEnd: 12, flexShrink: 0 }}>
          {logoUrl
            ? <Image source={{ uri: logoUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
            : <Text style={{ fontSize: 22 }}>🏪</Text>}
        </View>

        {/* Content */}
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ fontFamily: 'Urbanist_700Bold', color: '#ffffff', fontSize: 14 }} numberOfLines={1}>{businessName}</Text>
            {!benefit.verified && (
              <View style={{ backgroundColor: '#2a2d2f', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                <Text style={{ color: '#8e969f', fontSize: 10, fontFamily: 'Urbanist_500Medium' }}>{t('benefit.manual')}</Text>
              </View>
            )}
          </View>
          <Text style={{ color: '#8e969f', fontSize: 12, marginTop: 2, fontFamily: 'Urbanist_400Regular' }} numberOfLines={1}>{benefit.title}</Text>
          {badge && !isUsed && (
            <View style={{ backgroundColor: badge.color + '22', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start', marginTop: 6 }}>
              <Text style={{ color: badge.color, fontSize: 11, fontFamily: 'Urbanist_600SemiBold' }}>{badge.label}</Text>
            </View>
          )}
        </View>

        {/* Value + action */}
        <View style={{ alignItems: 'flex-end', marginStart: 8, flexShrink: 0, maxWidth: 90 }}>
          {isUsed ? (
            <>
              <Text style={{ color: '#4a5260', fontFamily: 'Urbanist_700Bold', fontSize: 14 }}>{valueLabel(benefit, t)}</Text>
              <View style={{ backgroundColor: '#2a2d2f', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5, marginTop: 6 }}>
                <Text style={{ color: '#4a5260', fontSize: 11, fontFamily: 'Urbanist_600SemiBold' }}>{t('benefit.used')}</Text>
              </View>
            </>
          ) : (
            <>
              <View style={{ backgroundColor: accent + '22', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5, marginBottom: 8 }}>
                <Text style={{ color: accent === '#1a7a4a' ? '#2ecc71' : accent, fontFamily: 'Urbanist_800ExtraBold', fontSize: 15 }} numberOfLines={1}>{valueLabel(benefit, t)}</Text>
              </View>
              {!isExpired && (
                <TouchableOpacity
                  style={{ backgroundColor: accent, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8 }}
                  onPress={() => router.push({ pathname: '/redeem/[id]', params: { id: benefit.id } } as never)}
                >
                  <Text style={{ color: 'white', fontSize: 12, fontFamily: 'Urbanist_700Bold' }}>{t('benefit.use')}</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </View>
    </View>
  )
}
