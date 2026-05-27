import { Tabs } from 'expo-router'
import { View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#2ecc71',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: { borderTopColor: '#f3f4f6' },
      }}
    >
      <Tabs.Screen
        name="wallet"
        options={{
          title: 'Wallet',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="wallet-outline" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="scan"
        options={{
          title: '',
          tabBarLabel: () => null,
          tabBarItemStyle: { maxWidth: 60 },
          tabBarIcon: () => (
            <View className="w-12 h-12 rounded-2xl bg-brand items-center justify-center shadow-sm">
              <Ionicons name="qr-code-outline" size={22} color="white" />
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="manual"
        options={{
          title: '',
          tabBarLabel: () => null,
          tabBarItemStyle: { maxWidth: 60 },
          tabBarIcon: ({ focused }) => (
            <View
              className={`w-12 h-12 rounded-2xl items-center justify-center border-2 ${
                focused ? 'bg-brand border-brand' : 'bg-white border-brand'
              }`}
            >
              <Ionicons name="ticket-outline" size={22} color="#2ecc71" />
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="discover"
        options={{
          title: 'Discover',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="storefront-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  )
}
