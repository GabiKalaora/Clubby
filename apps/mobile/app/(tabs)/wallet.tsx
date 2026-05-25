import { View, Text } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function Wallet() {
  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="flex-1 items-center justify-center">
        <Text className="text-2xl font-bold text-gray-800 mb-2">Your Wallet</Text>
        <Text className="text-gray-400">No benefits yet — scan a QR code to get started</Text>
      </View>
    </SafeAreaView>
  )
}
