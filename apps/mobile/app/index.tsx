import { useEffect } from 'react'
import { useRouter } from 'expo-router'
import { supabase } from '../lib/supabase'

export default function Index() {
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        router.replace('/(auth)/sign-in')
        return
      }
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', session.user.id)
        .single()

      if (!profile?.display_name) {
        router.replace('/(auth)/register')
      } else {
        router.replace('/(tabs)/wallet')
      }
    })
  }, [])

  return null
}
