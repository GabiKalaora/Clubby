import { View, Text, TouchableOpacity } from 'react-native'

interface Props {
  icon?: string
  message: string
  actionLabel?: string
  onAction?: () => void
}

export function EmptyState({ icon = '🎁', message, actionLabel, onAction }: Props) {
  return (
    <View style={{
      alignItems: 'center', justifyContent: 'center',
      paddingVertical: 64, paddingHorizontal: 32,
    }}>
      <Text style={{ fontSize: 40, marginBottom: 12 }}>{icon}</Text>
      <Text style={{
        color: '#64748b', textAlign: 'center',
        fontSize: 15, fontFamily: 'PlusJakartaSans_500Medium',
        lineHeight: 22,
      }}>
        {message}
      </Text>
      {actionLabel && onAction && (
        <TouchableOpacity
          onPress={onAction}
          style={{
            marginTop: 20, backgroundColor: '#a855f7',
            borderRadius: 14, paddingVertical: 12, paddingHorizontal: 24,
          }}
        >
          <Text style={{ color: '#ffffff', fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 14 }}>
            {actionLabel}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  )
}
