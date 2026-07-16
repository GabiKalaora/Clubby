import { useMemo } from 'react'
import {
  View, Text, Image, FlatList, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { Ionicons } from '@expo/vector-icons'
import { useCurrentUser } from '../hooks/useAuth'
import { useMemberships } from '../hooks/useMemberships'
import { useFeedPosts, type FeedPost } from '../hooks/useFeedPosts'
import { useActiveStories } from '../hooks/useStories'
import { useUnreadCount } from '../hooks/useNotifications'
import StoryRing from '../components/StoryRing'
import { font, radius, type ThemeColors } from '../lib/theme'

function timeAgo(iso: string, t: (k: string, o?: Record<string, unknown>) => string): string {
  const mins = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 60_000))
  if (mins < 60) return t('home.minutesAgo', { count: mins })
  const hours = Math.floor(mins / 60)
  if (hours < 24) return t('home.hoursAgo', { count: hours })
  return t('home.daysAgo', { count: Math.floor(hours / 24) })
}

function PostCard({ post, colors }: { post: FeedPost; colors: ThemeColors }) {
  const router = useRouter()
  const { t } = useTranslation()
  const biz = post.businesses

  return (
    <View style={{ marginBottom: 24 }}>
      {/* Header row — Instagram post header */}
      <TouchableOpacity
        onPress={() => router.push({ pathname: '/store/[id]', params: { id: post.business_id } } as never)}
        style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 10, gap: 10 }}
      >
        <StoryRing logoUrl={biz?.logo_url} name={biz?.name ?? ''} size={38} ringWidth={2} backgroundColor={colors.background} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 13, fontFamily: font.bold, color: colors.text }} numberOfLines={1}>{biz?.name}</Text>
          <Text style={{ fontSize: 11, fontFamily: font.regular, color: colors.textMuted }}>{timeAgo(post.created_at, t)}</Text>
        </View>
      </TouchableOpacity>

      {/* Full-bleed image */}
      {post.image_url && (
        <Image source={{ uri: post.image_url }} style={{ width: '100%', aspectRatio: 4 / 3, backgroundColor: colors.surfaceAlt }} resizeMode="cover" />
      )}

      {/* Body */}
      <View style={{ paddingHorizontal: 16, paddingTop: post.image_url ? 10 : 0 }}>
        <Text style={{ fontSize: 15, fontFamily: font.bold, color: colors.text, marginBottom: 3 }}>{post.title}</Text>
        {post.body && (
          <Text style={{ fontSize: 13, fontFamily: font.regular, color: colors.textSecondary, lineHeight: 19 }} numberOfLines={4}>
            {post.body}
          </Text>
        )}
        {post.cta_text && (
          <TouchableOpacity
            onPress={() => router.push({ pathname: '/store/[id]', params: { id: post.business_id } } as never)}
            style={{
              marginTop: 10, alignSelf: 'flex-start',
              borderRadius: radius.full, paddingVertical: 8, paddingHorizontal: 18,
              borderWidth: 1.5, borderColor: colors.accent,
            }}
          >
            <Text style={{ color: colors.accent, fontSize: 12, fontFamily: font.bold }}>{post.cta_text}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  )
}

/**
 * Home — updates only from clubs you belong to (WhatsApp-style function,
 * Instagram-style form): story rings on top, clean post cards below.
 */
export default function HomeScreen({ colors }: { colors: ThemeColors }) {
  const router = useRouter()
  const { t } = useTranslation()

  const { data: user } = useCurrentUser()
  const { data: memberships = [] } = useMemberships(user?.id)
  const membershipBusinessIds = useMemo(() => memberships.map((m) => m.business_id), [memberships])
  const { data: posts = [], isLoading, refetch, isRefetching } = useFeedPosts(membershipBusinessIds)
  const { data: stories = [] } = useActiveStories(user?.id)
  const { data: unreadCount = 0 } = useUnreadCount(user?.id)

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header — wordmark like Instagram */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 6, paddingBottom: 10 }}>
        <Text style={{ fontSize: 26, fontFamily: font.extrabold, color: colors.text, letterSpacing: -0.5 }}>clubby</Text>
        <View style={{ flexDirection: 'row', gap: 18, alignItems: 'center' }}>
          <TouchableOpacity onPress={() => router.push('/notifications' as never)}>
            <Ionicons name="heart-outline" size={26} color={colors.text} />
            {unreadCount > 0 && (
              <View style={{ position: 'absolute', top: -3, right: -5, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 }}>
                <Text style={{ color: '#fff', fontSize: 9, fontFamily: font.bold }}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/profile' as never)}>
            <Ionicons name="person-circle-outline" size={27} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <PostCard post={item} colors={colors} />}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.accent} />}
          ListHeaderComponent={
            stories.length > 0 ? (
              <ScrollView
                horizontal showsHorizontalScrollIndicator={false}
                style={{ marginBottom: 16, borderBottomWidth: 0.5, borderBottomColor: colors.border }}
                contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 12, gap: 14 }}
              >
                {stories.map((story, i) => {
                  const name = story.businesses?.name ?? ''
                  return (
                    <TouchableOpacity
                      key={story.id}
                      onPress={() => router.push({ pathname: '/story/[id]', params: { id: story.business_id, businessId: story.business_id, startIndex: String(i) } } as never)}
                      style={{ alignItems: 'center', width: 68 }}
                    >
                      <StoryRing logoUrl={story.businesses?.logo_url} name={name} size={62} backgroundColor={colors.background} />
                      <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 4, fontFamily: font.medium }} numberOfLines={1}>{name}</Text>
                    </TouchableOpacity>
                  )
                })}
              </ScrollView>
            ) : null
          }
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingVertical: 60, paddingHorizontal: 40 }}>
              <Text style={{ fontSize: 44, marginBottom: 14 }}>👋</Text>
              <Text style={{ fontSize: 17, fontFamily: font.bold, color: colors.text, textAlign: 'center', marginBottom: 6 }}>
                {t('home.emptyTitle')}
              </Text>
              <Text style={{ fontSize: 13, fontFamily: font.regular, color: colors.textMuted, textAlign: 'center', lineHeight: 19 }}>
                {t('home.emptyHint')}
              </Text>
            </View>
          }
          ListFooterComponent={<View style={{ height: 24 }} />}
        />
      )}
    </View>
  )
}
