import { Tabs } from 'expo-router'
import { View, Platform } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTranslation } from 'react-i18next'

const BG    = '#151617'
const GREEN = '#1a7a4a'
const INACTIVE = '#4a5260'

export default function TabsLayout() {
  const { t } = useTranslation()

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#2ecc71',
        tabBarInactiveTintColor: INACTIVE,
        tabBarStyle: {
          backgroundColor: BG,
          borderTopColor: '#2a2d2f',
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 84 : 64,
          paddingBottom: Platform.OS === 'ios' ? 24 : 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontFamily: 'Urbanist_600SemiBold',
          fontSize: 11,
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="wallet"
        options={{
          title: t('tabs.wallet'),
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
          tabBarItemStyle: { maxWidth: 72 },
          tabBarIcon: () => (
            <View style={{
              width: 56, height: 56,
              borderRadius: 18,
              backgroundColor: GREEN,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: Platform.OS === 'ios' ? 16 : 8,
              shadowColor: '#1a7a4a',
              shadowOpacity: 0.5,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 4 },
              elevation: 8,
            }}>
              <Ionicons name="qr-code-outline" size={24} color="white" />
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
            <View style={{
              width: 44, height: 44,
              borderRadius: 14,
              backgroundColor: focused ? GREEN : 'transparent',
              borderWidth: focused ? 0 : 1.5,
              borderColor: focused ? 'transparent' : '#2a2d2f',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Ionicons name="ticket-outline" size={20} color={focused ? 'white' : INACTIVE} />
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="discover"
        options={{
          title: t('tabs.discover'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="storefront-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  )
}
