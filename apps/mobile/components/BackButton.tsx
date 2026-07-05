import { TouchableOpacity, Text } from 'react-native'
import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'

interface Props {
  label?: string
  onPress?: () => void
}

export function BackButton({ label, onPress }: Props) {
  const router = useRouter()
  const { t } = useTranslation()

  return (
    <TouchableOpacity
      onPress={onPress ?? (() => router.back())}
      style={{
        width: 36, height: 36, borderRadius: 18,
        backgroundColor: '#ffffff',
        alignItems: 'center', justifyContent: 'center',
        marginEnd: 12,
      }}
      accessibilityRole="button"
      accessibilityLabel={label ?? t('common.back')}
    >
      <Text style={{ color: '#94a3b8', fontSize: 18 }}>‹</Text>
    </TouchableOpacity>
  )
}
