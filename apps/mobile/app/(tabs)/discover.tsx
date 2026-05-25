import { View, Text } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function Discover() {
  return (
    <SafeAreaView className="flex-1 bg-gray-50 items-center justify-center">
      <Text className="text-2xl font-bold text-gray-800 mb-2">Discover</Text>
      <Text className="text-gray-400">Business discovery coming in Slice 5</Text>
    </SafeAreaView>
  )
}
