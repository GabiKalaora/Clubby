import { Tabs } from 'expo-router'
import { Platform } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { useTranslation } from 'react-i18next'
import { brand, useTheme } from '../../lib/theme'

/**
 * Instagram-style bottom bar: minimal, icon-only.
 * Home hosts the 3-page swipe experience (feed ← home → wallet);
 * wallet & manual stay as hidden routes for deep links.
 */
export default function TabsLayout() {
  const { t } = useTranslation()
  const { colors, isDark } = useTheme()

  return (
    <Tabs
      initialRouteName="home"
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          borderTopWidth: 0.5,
          height: Platform.OS === 'ios' ? 80 : 60,
          paddingBottom: Platform.OS === 'ios' ? 24 : 6,
          paddingTop: 6,
          elevation: 0,
          shadowOpacity: 0,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: t('pager.home'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={26} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="scan"
        options={{
          title: t('tabs.scan'),
          tabBarIcon: () => (
            <LinearGradient
              colors={brand.gradient}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={{
                width: 52, height: 52,
                borderRadius: 26,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: Platform.OS === 'ios' ? 14 : 6,
                shadowColor: brand.purple,
                shadowOpacity: isDark ? 0.6 : 0.4,
                shadowRadius: 12,
                shadowOffset: { width: 0, height: 4 },
                elevation: 8,
              }}
            >
              <Ionicons name="qr-code-outline" size={22} color="white" />
            </LinearGradient>
          ),
        }}
      />

      <Tabs.Screen
        name="discover"
        options={{
          title: t('tabs.discover'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'search' : 'search-outline'} size={26} color={color} />
          ),
        }}
      />

      {/* Hidden routes — reachable by link, not from the bar */}
      <Tabs.Screen name="wallet" options={{ href: null }} />
      <Tabs.Screen name="manual" options={{ href: null }} />
    </Tabs>
  )
}
