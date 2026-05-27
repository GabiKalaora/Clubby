import '../global.css'
import { useEffect } from 'react'
import { Platform } from 'react-native'
import { Stack, useRouter, useSegments } from 'expo-router'
import * as Notifications from 'expo-notifications'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

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

function AuthGuard() {
  const router = useRouter()
  const segments = useSegments()

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const inTabs = segments[0] === '(tabs)'
      // Only kick out if session is lost while on a protected tab
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

  useEffect(() => {
    if (Platform.OS !== 'web') registerPushToken()
  }, [])

  useEffect(() => {
    if (Platform.OS === 'web') return
    // Navigate to wallet when user taps a push notification
    const sub = Notifications.addNotificationResponseReceivedListener(() => {
      router.push('/(tabs)/wallet')
    })
    return () => sub.remove()
  }, [router])

  return (
    <QueryClientProvider client={queryClient}>
      <AuthGuard />
      <Stack screenOptions={{ headerShown: false }} />
    </QueryClientProvider>
  )
}

async function registerPushToken() {
  const { status } = await Notifications.requestPermissionsAsync()
  if (status !== 'granted') return

  const token = (await Notifications.getExpoPushTokenAsync()).data
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    await supabase.from('profiles').update({ expo_push_token: token }).eq('id', user.id)
  }
}
