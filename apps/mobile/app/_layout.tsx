import '../global.css'
import { useEffect, useState } from 'react'
import { I18nManager, Platform, useColorScheme } from 'react-native'
import { Stack, useRouter, useSegments } from 'expo-router'
import * as Notifications from 'expo-notifications'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  useFonts,
  Urbanist_400Regular,
  Urbanist_500Medium,
  Urbanist_600SemiBold,
  Urbanist_700Bold,
  Urbanist_800ExtraBold,
} from '@expo-google-fonts/urbanist'
import { supabase } from '../lib/supabase'
import { initI18n, isHebrew } from '../lib/i18n'

export const THEME_KEY = '@clubby_theme'
export type ThemePreference = 'auto' | 'light' | 'dark'

const queryClient = new QueryClient()

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  })
}

// Allow RTL — must be called before any component renders
I18nManager.allowRTL(true)

function AuthGuard() {
  const router = useRouter()
  const segments = useSegments()

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const inTabs = segments[0] === '(tabs)'
      if (!session && inTabs) {
        router.replace('/(auth)/sign-in')
      }
    })
    return () => subscription.unsubscribe()
  }, [segments])

  return null
}

export default function RootLayout() {
  const router = useRouter()
  const systemScheme = useColorScheme()
  const [i18nReady, setI18nReady] = useState(false)
  const [themePreference, setThemePreference] = useState<ThemePreference>('auto')

  const [fontsLoaded] = useFonts({
    Urbanist_400Regular,
    Urbanist_500Medium,
    Urbanist_600SemiBold,
    Urbanist_700Bold,
    Urbanist_800ExtraBold,
  })

  const isDark = themePreference === 'dark' || (themePreference === 'auto' && systemScheme === 'dark')

  useEffect(() => {
    Promise.all([
      initI18n(),
      AsyncStorage.getItem(THEME_KEY),
    ]).then(([, savedTheme]) => {
      if (savedTheme) setThemePreference(savedTheme as ThemePreference)
      if (Platform.OS !== 'web') {
        const shouldBeRTL = isHebrew()
        if (I18nManager.isRTL !== shouldBeRTL) {
          I18nManager.forceRTL(shouldBeRTL)
        }
      }
      setI18nReady(true)
    })
  }, [])

  useEffect(() => {
    if (Platform.OS !== 'web') registerPushToken()
    else registerWebPush()
  }, [])

  useEffect(() => {
    if (Platform.OS === 'web') return
    const sub = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data as Record<string, string> | undefined
      if (data?.benefitId) {
        router.push({ pathname: '/redeem/[id]', params: { id: data.benefitId } } as never)
      } else {
        router.push('/(tabs)/wallet')
      }
    })
    return () => sub.remove()
  }, [router])

  if (!i18nReady || !fontsLoaded) return null

  return (
    <QueryClientProvider client={queryClient}>
      <AuthGuard />
      <Stack
        screenOptions={{ headerShown: false }}
        // Apply dark class for NativeWind dark: variants
        {...(isDark ? { className: 'dark' } : {})}
      />
    </QueryClientProvider>
  )
}

async function registerPushToken() {
  const { status } = await Notifications.requestPermissionsAsync()

  const token = (await Notifications.getExpoPushTokenAsync()).data
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    // Save to push_tokens table (multi-device support)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('push_tokens').upsert(
      { user_id: user.id, token, platform: 'mobile', last_seen: new Date().toISOString() },
      { onConflict: 'user_id,token' },
    )
    // Keep profiles.expo_push_token updated for backward compat
    await supabase.from('profiles').update({ expo_push_token: token }).eq('id', user.id)
  }
}

// Web push registration — only runs on HTTPS deployments
async function registerWebPush() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) return
  if (window.location.hostname === 'localhost') return

  try {
    const reg = await navigator.serviceWorker.register('/sw.js')
    const VAPID_KEY = process.env.EXPO_PUBLIC_VAPID_KEY
    if (!VAPID_KEY) return

    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: VAPID_KEY,
    })

    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from('push_tokens').upsert(
        { user_id: user.id, token: JSON.stringify(sub), platform: 'web', last_seen: new Date().toISOString() },
        { onConflict: 'user_id,token' },
      )
    }
  } catch {
    // Silently fail — web push is enhancement only
  }
}
