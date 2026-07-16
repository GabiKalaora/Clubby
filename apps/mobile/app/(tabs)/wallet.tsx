import { SafeAreaView } from 'react-native-safe-area-context'
import WalletScreen from '../../screens/WalletScreen'
import { useTheme } from '../../lib/theme'

/**
 * Standalone wallet route — kept for deep links (enroll success,
 * notifications, auth flows). The primary way to reach the wallet
 * is swiping right on the Home pager.
 */
export default function Wallet() {
  const { colors } = useTheme()
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <WalletScreen colors={colors} />
    </SafeAreaView>
  )
}
