import { useEffect, useState } from 'react'
import {
  View, Text, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import {
  useNotifications, useMarkAllRead, type NotificationItem,
} from '../hooks/useNotifications'

type Tab = 'all' | 'unread'

type NotifType = NotificationItem['type'] | 'birthday' | 're_engagement'

const TYPE_ICON: Record<string, string> = {
  expiry_reminder: '⏰',
  new_promotion:   '🎁',
  direct_message:  '📣',
  birthday:        '🎂',
  re_engagement:   '👋',
}

const TYPE_BG: Record<string, string> = {
  expiry_reminder: '#fff7ed',
  new_promotion:   '#f0fdf4',
  direct_message:  '#eff6ff',
  birthday:        '#fdf4ff',
  re_engagement:   '#f0fdf4',
}

function timeLabel(iso: string): string {
  const now = new Date()
  const d = new Date(iso)
  const diffMs = now.getTime() - d.getTime()
  const diffMin = Math.floor(diffMs / 60_000)
  if (diffMin < 1)   return 'Just now'
  if (diffMin < 60)  return `${diffMin}m ago`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24)    return `${diffH}h ago`
  if (diffH < 48)    return 'Yesterday'
  const diffD = Math.floor(diffH / 24)
  return `${diffD} days ago`
}

function groupLabel(iso: string): string {
  const now = new Date()
  const d = new Date(iso)
  const todayStr = now.toDateString()
  const yesterdayStr = new Date(now.getTime() - 86_400_000).toDateString()
  if (d.toDateString() === todayStr)     return 'Today'
  if (d.toDateString() === yesterdayStr) return 'Yesterday'
  return 'Earlier'
}

function useCurrentUser() {
  return useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      return user
    },
    staleTime: Infinity,
  })
}

export default function Notifications() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('all')

  const { data: user } = useCurrentUser()
  const {
    data: notifications = [], isLoading, refetch, isRefetching,
  } = useNotifications(user?.id)
  const { mutate: markAllRead } = useMarkAllRead()

  // Mark all unread as read when the screen mounts
  useEffect(() => {
    if (user?.id) markAllRead(user.id)
  }, [user?.id])

  const displayed = tab === 'unread'
    ? notifications.filter((n) => !n.read_at)
    : notifications

  // Build grouped list: insert section headers
  type ListItem = { type: 'header'; label: string } | { type: 'item'; data: NotificationItem }
  const listData: ListItem[] = []
  let lastGroup = ''
  for (const n of displayed) {
    const g = groupLabel(n.sent_at)
    if (g !== lastGroup) {
      listData.push({ type: 'header', label: g })
      lastGroup = g
    }
    listData.push({ type: 'item', data: n })
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="flex-row items-center px-5 pt-2 pb-4 gap-x-3">
        <TouchableOpacity onPress={() => router.back()} className="w-9 h-9 items-center justify-center">
          <Text className="text-2xl text-gray-600">‹</Text>
        </TouchableOpacity>
        <Text className="text-2xl font-bold text-gray-900 flex-1">Notifications</Text>
      </View>

      {/* Tabs */}
      <View className="flex-row px-4 mb-3 gap-x-2">
        {(['all', 'unread'] as Tab[]).map((t) => (
          <TouchableOpacity
            key={t}
            onPress={() => setTab(t)}
            className={`flex-1 rounded-full py-2 items-center ${
              tab === t ? 'bg-brand' : 'bg-white border border-gray-200'
            }`}
          >
            <Text className={`text-xs font-semibold ${tab === t ? 'text-white' : 'text-gray-500'}`}>
              {t === 'all' ? 'All' : 'Unread'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#2ecc71" />
        </View>
      ) : (
        <FlatList
          data={listData}
          keyExtractor={(item, i) =>
            item.type === 'header' ? `h-${item.label}` : `n-${item.data.id}-${i}`
          }
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#2ecc71" />
          }
          renderItem={({ item }) => {
            if (item.type === 'header') {
              return (
                <Text className="px-5 pt-5 pb-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
                  {item.label}
                </Text>
              )
            }
            const n = item.data
            const isUnread = !n.read_at
            return (
              <TouchableOpacity
                className={`mx-4 mb-2 rounded-2xl p-4 flex-row gap-x-3 items-start ${
                  isUnread ? 'bg-white border border-brand/20' : 'bg-white'
                }`}
                style={{ shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1 }}
                onPress={() => {
                  if (n.benefit_id) router.push('/(tabs)/wallet' as never)
                }}
                activeOpacity={n.benefit_id ? 0.7 : 1}
              >
                <View className="w-10 h-10 rounded-full items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: TYPE_BG[n.type] ?? '#f3f4f6' }}>
                  <Text className="text-lg">{TYPE_ICON[n.type] ?? '🔔'}</Text>
                </View>
                <View className="flex-1">
                  <Text className={`text-sm leading-5 ${isUnread ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                    {n.message ?? 'You have a new notification'}
                  </Text>
                  <Text className="text-xs text-gray-400 mt-1">{timeLabel(n.sent_at)}</Text>
                </View>
                {isUnread && (
                  <View className="w-2 h-2 rounded-full bg-brand mt-1.5" />
                )}
              </TouchableOpacity>
            )
          }}
          ListEmptyComponent={
            <View className="items-center justify-center py-16 px-8">
              <Text className="text-4xl mb-3">🔔</Text>
              <Text className="text-gray-500 text-center text-base">
                {tab === 'unread' ? 'No unread notifications' : 'No notifications yet'}
              </Text>
            </View>
          }
          ListFooterComponent={<View className="h-6" />}
        />
      )}
    </SafeAreaView>
  )
}
