import { View, Text } from 'react-native'

interface Props {
  message: string
}

export function ErrorBanner({ message }: Props) {
  if (!message) return null
  return (
    <View style={{
      backgroundColor: '#ef444418',
      borderRadius: 12,
      padding: 12,
      marginBottom: 16,
    }}>
      <Text style={{
        color: '#ef4444',
        fontSize: 13,
        fontFamily: 'PlusJakartaSans_500Medium',
      }}>
        {message}
      </Text>
    </View>
  )
}
