import { View, Text } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function Scan() {
  return (
    <SafeAreaView className="flex-1 bg-gray-900 items-center justify-center">
      <Text className="text-white text-xl font-semibold">Scan QR Code</Text>
      <Text className="text-gray-400 mt-2">Camera coming in Slice 3</Text>
    </SafeAreaView>
  )
}
