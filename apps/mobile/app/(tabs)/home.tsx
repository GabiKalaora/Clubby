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
  const { width: windowWidth } = useWindowDimensions()
  const { colors, isDark } = useTheme()
  const listRef = useRef<FlatList<PageKey>>(null)
  const [pageIndex, setPageIndex] = useState(HOME_INDEX)
  // Measured pager viewport. We page by this, not by useWindowDimensions():
  //  • width — the window width and the actual list viewport disagree on web
  //    (scrollbars, dev tools), which left the pager stuck between pages.
  //  • height — each page needs an explicit pixel height, because the discovery
  //    feed's vertical FlatList is nested inside this horizontal one and on web
  //    a `flex: 1` child gives it no bounded height, so its container blows up
  //    to ~16.7M px and the feed renders off-screen.
  const [pager, setPager] = useState({ width: 0, height: 0 })
  const pageWidth = pager.width || windowWidth

  const onFeedPage = PAGES[pageIndex] === 'feed'

  const handleScrollEnd = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / pageWidth)
    if (idx >= 0 && idx < PAGES.length) setPageIndex(idx)
  }, [pageWidth])

  const goToPage = useCallback((idx: number) => {
    const offset = pageWidth * idx
    // On web, scrollToOffset doesn't reliably reach the scroll-snap container;
    // scroll the underlying DOM node directly. Native keeps scrollToOffset.
    const node = (listRef.current as unknown as { getScrollableNode?: () => { scrollTo?: (o: { left: number; behavior: string }) => void } } | null)?.getScrollableNode?.()
    if (node?.scrollTo) node.scrollTo({ left: offset, behavior: 'smooth' })
    else listRef.current?.scrollToOffset({ offset, animated: true })
    setPageIndex(idx)
  }, [pageWidth])

  const handleLayout = useCallback((e: { nativeEvent: { layout: { width: number; height: number } } }) => {
    const { width: w, height: h } = e.nativeEvent.layout
    setPager((prev) => {
      // On the first real measurement, land on the initial page (Home) using the
      // true viewport width — before this, getItemLayout ran with the wrong width.
      if (prev.width === 0 && w > 0) {
        requestAnimationFrame(() =>
          listRef.current?.scrollToOffset({ offset: w * HOME_INDEX, animated: false }),
        )
      }
      return w === prev.width && h === prev.height ? prev : { width: w, height: h }
    })
  }, [])

  const renderPage = useCallback(({ item }: { item: PageKey }) => (
    <View style={pager.height ? { width: pageWidth, height: pager.height } : { width: pageWidth, flex: 1 }}>
      {item === 'feed' && <DiscoveryFeedScreen height={pager.height || undefined} />}
      {item === 'home' && <HomeScreen colors={colors} />}
      {item === 'wallet' && <WalletScreen colors={colors} />}
    </View>
  ), [pageWidth, pager.height, colors])

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
          // Measure the scroll viewport itself — a wrapping View's width can
          // differ from the list's on web (scrollbars), desyncing the paging.
          onLayout={handleLayout}
          getItemLayout={(_, index) => ({ length: pageWidth, offset: pageWidth * index, index })}
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
