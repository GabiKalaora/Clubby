import { View, Text, Image } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { brand } from '../lib/theme'

type Props = {
  logoUrl: string | null | undefined
  name: string
  size?: number
  /** Ring is shown when true (unseen story / active state), gray when false */
  active?: boolean
  ringWidth?: number
  backgroundColor?: string
}

/**
 * Instagram-style avatar with a gradient story ring.
 * Falls back to the first letter of the name when there is no logo.
 */
export default function StoryRing({
  logoUrl,
  name,
  size = 64,
  active = true,
  ringWidth = 2.5,
  backgroundColor = '#ffffff',
}: Props) {
  const inner = size - ringWidth * 2 - 4
  return (
    <LinearGradient
      colors={active ? brand.storyRing : ['#d1d5db', '#d1d5db', '#d1d5db']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <View
        style={{
          width: size - ringWidth * 2,
          height: size - ringWidth * 2,
          borderRadius: (size - ringWidth * 2) / 2,
          backgroundColor,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <View
          style={{
            width: inner,
            height: inner,
            borderRadius: inner / 2,
            overflow: 'hidden',
            backgroundColor: '#e5e7eb',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {logoUrl ? (
            <Image source={{ uri: logoUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
          ) : (
            <Text style={{ fontSize: inner * 0.42 }}>{name?.[0] ?? '🏪'}</Text>
          )}
        </View>
      </View>
    </LinearGradient>
  )
}
