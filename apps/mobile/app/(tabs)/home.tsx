import { useCallback, useRef, useState } from 'react'
import {
  View, Text, FlatList, TouchableOpacity, useWindowDimensions,
  type NativeSyntheticEvent, type NativeScrollEvent,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import DiscoveryFeedScreen from '../../screens/DiscoveryFeedScreen'
import HomeScreen from '../../screens/HomeScreen'
import WalletScreen from '../../screens/WalletScreen'
import { font, radius, useTheme } from '../../lib/theme'

type PageKey = 'feed' | 'home' | 'wallet'
const PAGES: PageKey[] = ['feed', 'home', 'wallet']
const HOME_INDEX = 1

/**
 * Main experience — one horizontal pager, three pages:
 *   [Discovery feed (TikTok-style)] ← [Home (your clubs)] → [Wallet]
 * Home is the initial page; swipe or tap the top pills to move.
 */
export default function MainPager() {
  const { t } = useTranslation()
  const { width } = useWindowDimensions()
  const { colors, isDark } = useTheme()
  const listRef = useRef<FlatList<PageKey>>(null)
  const [pageIndex, setPageIndex] = useState(HOME_INDEX)

  const onFeedPage = PAGES[pageIndex] === 'feed'

  const handleScrollEnd = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / width)
    if (idx >= 0 && idx < PAGES.length) setPageIndex(idx)
  }, [width])

  const goToPage = useCallback((idx: number) => {
    listRef.current?.scrollToIndex({ index: idx, animated: true })
    setPageIndex(idx)
  }, [])

  const renderPage = useCallback(({ item }: { item: PageKey }) => (
    <View style={{ width, flex: 1 }}>
      {item === 'feed' && <DiscoveryFeedScreen />}
      {item === 'home' && <HomeScreen colors={colors} />}
      {item === 'wallet' && <WalletScreen colors={colors} />}
    </View>
  ), [width, colors])

  // On the immersive feed page the pills sit on dark media; elsewhere on the surface
  const pillTextColor = (active: boolean) => {
    if (onFeedPage) return active ? '#ffffff' : 'rgba(255,255,255,0.55)'
    return active ? colors.text : colors.textMuted
  }

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: onFeedPage ? '#000' : colors.background }}
      edges={['top']}
    >
      <View style={{ flex: 1 }}>
        <FlatList
          ref={listRef}
          data={PAGES}
          keyExtractor={(k) => k}
          renderItem={renderPage}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={HOME_INDEX}
          getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
          onMomentumScrollEnd={handleScrollEnd}
          // Vertical feed list scrolls inside; directions are orthogonal so both work
          nestedScrollEnabled
        />

        {/* Page pills — floating on top, TikTok-style position, Instagram-style look */}
        <View
          pointerEvents="box-none"
          style={{
            position: 'absolute', top: 8, left: 0, right: 0,
            flexDirection: 'row', justifyContent: 'center', gap: 6,
          }}
        >
          <View style={{
            flexDirection: 'row', gap: 4,
            backgroundColor: onFeedPage ? 'rgba(0,0,0,0.35)' : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.06)'),
            borderRadius: radius.full, padding: 4,
          }}>
            {PAGES.map((key, idx) => {
              const active = idx === pageIndex
              return (
                <TouchableOpacity
                  key={key}
                  onPress={() => goToPage(idx)}
                  style={{
                    paddingVertical: 5, paddingHorizontal: 14, borderRadius: radius.full,
                    backgroundColor: active
                      ? (onFeedPage ? 'rgba(255,255,255,0.22)' : colors.surface)
                      : 'transparent',
                  }}
                >
                  <Text style={{ fontSize: 12, fontFamily: active ? font.bold : font.medium, color: pillTextColor(active) }}>
                    {t(`pager.${key}`)}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>
        </View>
      </View>
    </SafeAreaView>
  )
}
