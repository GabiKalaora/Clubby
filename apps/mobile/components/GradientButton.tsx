import { TouchableOpacity, Text, ActivityIndicator, ViewStyle } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { brand, font, radius } from '../lib/theme'

type Props = {
  label: string
  onPress: () => void
  loading?: boolean
  disabled?: boolean
  /** Solid success state (e.g. "Joined ✓") replaces the gradient */
  done?: boolean
  doneLabel?: string
  size?: 'sm' | 'md' | 'lg'
  style?: ViewStyle
}

const SIZES = {
  sm: { paddingVertical: 8, paddingHorizontal: 16, fontSize: 12 },
  md: { paddingVertical: 12, paddingHorizontal: 22, fontSize: 14 },
  lg: { paddingVertical: 16, paddingHorizontal: 28, fontSize: 16 },
}

export default function GradientButton({
  label, onPress, loading, disabled, done, doneLabel, size = 'md', style,
}: Props) {
  const s = SIZES[size]

  if (done) {
    return (
      <TouchableOpacity
        disabled
        style={[{
          borderRadius: radius.full,
          paddingVertical: s.paddingVertical,
          paddingHorizontal: s.paddingHorizontal,
          alignItems: 'center',
          backgroundColor: 'rgba(34,197,94,0.15)',
          borderWidth: 1,
          borderColor: '#22c55e',
        }, style]}
      >
        <Text style={{ color: '#22c55e', fontSize: s.fontSize, fontFamily: font.bold }}>
          {doneLabel ?? label}
        </Text>
      </TouchableOpacity>
    )
  }

  return (
    <TouchableOpacity onPress={onPress} disabled={disabled || loading} activeOpacity={0.85} style={style}>
      <LinearGradient
        colors={brand.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          borderRadius: radius.full,
          paddingVertical: s.paddingVertical,
          paddingHorizontal: s.paddingHorizontal,
          alignItems: 'center',
          opacity: disabled ? 0.5 : 1,
        }}
      >
        {loading
          ? <ActivityIndicator color="#ffffff" size="small" />
          : <Text style={{ color: '#ffffff', fontSize: s.fontSize, fontFamily: font.bold }}>{label}</Text>}
      </LinearGradient>
    </TouchableOpacity>
  )
}
