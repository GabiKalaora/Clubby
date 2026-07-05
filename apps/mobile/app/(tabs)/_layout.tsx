import { Tabs } from 'expo-router'
import { View, Platform } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { useTranslation } from 'react-i18next'

export default function TabsLayout() {
  const { t } = useTranslation()

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#a855f7',
        tabBarInactiveTintColor: '#94a3b8',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopColor: '#e2e8f0',
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 84 : 64,
          paddingBottom: Platform.OS === 'ios' ? 24 : 8,
          paddingTop: 8,
          shadowColor: '#000',
          shadowOpacity: 0.06,
          shadowRadius: 8,
          elevation: 8,
        },
        tabBarLabelStyle: {
          fontFamily: 'PlusJakartaSans_600SemiBold',
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
            <LinearGradient
              colors={['#ec4899', '#a855f7']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={{
                width: 56, height: 56,
                borderRadius: 28,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: Platform.OS === 'ios' ? 16 : 8,
                shadowColor: '#a855f7',
                shadowOpacity: 0.45,
                shadowRadius: 14,
                shadowOffset: { width: 0, height: 4 },
                elevation: 8,
              }}
            >
              <Ionicons name="qr-code-outline" size={24} color="white" />
            </LinearGradient>
          ),
        }}
      />

      <Tabs.Screen
        name="manual"
        options={{
          title: t('tabs.manual'),
          tabBarItemStyle: { maxWidth: 72 },
          tabBarIcon: ({ focused }) => (
            <View style={{
              width: 36, height: 36,
              borderRadius: 10,
              backgroundColor: focused ? 'rgba(168,85,247,0.1)' : 'transparent',
              borderWidth: focused ? 0 : 1.5,
              borderColor: focused ? 'transparent' : '#e2e8f0',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Ionicons name="ticket-outline" size={18} color={focused ? '#a855f7' : '#94a3b8'} />
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
