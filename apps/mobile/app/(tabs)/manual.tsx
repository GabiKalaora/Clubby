import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator, StatusBar,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { useCurrentUser } from '../../hooks/useAuth'
import { useAddBenefit } from '../../hooks/useBenefits'

type BenefitType = 'credit' | 'discount' | 'free_item'

const TYPE_OPTIONS: { key: BenefitType; label: string; emoji: string }[] = [
  { key: 'credit',    label: 'Credit (₪)', emoji: '💰' },
  { key: 'discount',  label: 'Discount',   emoji: '🏷️' },
  { key: 'free_item', label: 'Free item',  emoji: '🎁' },
]

const TYPE_COLOR: Record<BenefitType, string> = {
  credit:    '#a855f7',
  discount:  '#ec4899',
  free_item: '#c084fc',
}

export default function Manual() {
  const router = useRouter()
  const { t } = useTranslation()
  const [businessName, setBusinessName] = useState('')
  const [title, setTitle] = useState('')
  const [type, setType] = useState<BenefitType>('credit')
  const [value, setValue] = useState('')
  const [expiryDate, setExpiryDate] = useState('')
  const [error, setError] = useState('')

  const { data: user } = useCurrentUser()

  const { mutate: addBenefit, isPending } = useAddBenefit()

  function handleSubmit() {
    setError('')
    if (!businessName.trim()) { setError('Store name is required'); return }
    if (!title.trim()) { setError('Coupon title is required'); return }
    if (type !== 'free_item' && !value.trim()) { setError('Value is required'); return }
    if (!user) return

    const parsed = type !== 'free_item' ? parseFloat(value) : 0
    if (type !== 'free_item' && (isNaN(parsed) || parsed <= 0)) { setError('Enter a valid positive value'); return }

    let expires: string | undefined
    if (expiryDate.trim()) {
      const d = new Date(expiryDate.trim())
      if (isNaN(d.getTime())) { setError('Invalid date — use YYYY-MM-DD format'); return }
      expires = d.toISOString()
    }

    addBenefit(
      {
        userId: user.id,
        benefit: {
          business_name: businessName.trim(),
          type,
          title: title.trim(),
          expires_at: expires,
          ...(type === 'credit'    && { amount_cents: Math.round(parsed * 100) }),
          ...(type === 'discount'  && { discount_percent: Math.round(parsed) }),
          ...(type === 'free_item' && { free_item_description: value.trim() || title.trim() }),
        },
      },
      {
        onSuccess: () => { router.navigate('/wallet') },
        onError: (err) => setError(String(err)),
      },
    )
  }

  const accent = TYPE_COLOR[type]

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8f9fa' }}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20 }}>

        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 28 }}>
          <TouchableOpacity onPress={() => router.back()} style={{ marginEnd: 12 }}>
            <Text style={{ color: '#94a3b8', fontSize: 22 }}>←</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 22, fontFamily: 'PlusJakartaSans_700Bold', color: '#2d3748' }}>
            Add coupon manually
          </Text>
        </View>

        <Field label="Store name">
          <TextInput
            style={inputStyle}
            placeholder="e.g. Java House"
            placeholderTextColor="#64748b"
            value={businessName}
            onChangeText={setBusinessName}
          />
        </Field>

        <Field label="Coupon title">
          <TextInput
            style={inputStyle}
            placeholder="e.g. Free coffee"
            placeholderTextColor="#64748b"
            value={title}
            onChangeText={setTitle}
          />
        </Field>

        {/* Type selector */}
        <Field label="Type">
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {TYPE_OPTIONS.map((opt) => {
              const active = type === opt.key
              const c = TYPE_COLOR[opt.key]
              return (
                <TouchableOpacity
                  key={opt.key}
                  onPress={() => setType(opt.key)}
                  style={{
                    flex: 1, borderRadius: 14, paddingVertical: 12, alignItems: 'center',
                    backgroundColor: active ? c : '#ffffff',
                    borderWidth: 1, borderColor: active ? c : '#e2e8f0',
                  }}
                >
                  <Text style={{ fontSize: 18, marginBottom: 4 }}>{opt.emoji}</Text>
                  <Text style={{ fontSize: 11, fontFamily: 'PlusJakartaSans_600SemiBold', color: active ? '#ffffff' : '#94a3b8' }}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>
        </Field>

        <Field label={type === 'credit' ? 'Amount (₪)' : type === 'discount' ? 'Discount (%)' : 'Description'}>
          <TextInput
            style={inputStyle}
            placeholder={type === 'credit' ? '50' : type === 'discount' ? '20' : 'What is the free item?'}
            placeholderTextColor="#64748b"
            value={value}
            onChangeText={setValue}
            keyboardType={type === 'free_item' ? 'default' : 'decimal-pad'}
          />
        </Field>

        <Field label="Expiry date (optional)">
          <TextInput
            style={inputStyle}
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#64748b"
            value={expiryDate}
            onChangeText={setExpiryDate}
            keyboardType="numbers-and-punctuation"
          />
        </Field>

        {error ? (
          <View style={{ backgroundColor: '#ef444422', borderRadius: 12, padding: 12, marginBottom: 12 }}>
            <Text style={{ color: '#ef4444', fontFamily: 'PlusJakartaSans_500Medium', fontSize: 13 }}>{error}</Text>
          </View>
        ) : null}

        <TouchableOpacity
          onPress={handleSubmit}
          disabled={isPending}
          style={{ marginTop: 8 }}
        >
          <LinearGradient
            colors={['#ec4899', '#a855f7']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={{
              borderRadius: 999, paddingVertical: 18, alignItems: 'center',
              shadowColor: '#a855f7', shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 5 },
              elevation: 6,
            }}
          >
            {isPending
              ? <ActivityIndicator color="white" />
              : <Text style={{ color: 'white', fontFamily: 'PlusJakartaSans_700Bold', fontSize: 16 }}>Save coupon</Text>}
          </LinearGradient>
        </TouchableOpacity>

        <Text style={{ textAlign: 'center', color: '#64748b', fontSize: 12, fontFamily: 'PlusJakartaSans_400Regular', marginTop: 16 }}>
          Manually added coupons show a "Manual" badge and are not verified by the store.
        </Text>
      </ScrollView>
    </SafeAreaView>
  )
}

const inputStyle = {
  backgroundColor: '#ffffff',
  borderWidth: 1,
  borderColor: '#e2e8f0',
  borderRadius: 14,
  paddingHorizontal: 16,
  paddingVertical: 14,
  color: '#2d3748',
  fontSize: 15,
  fontFamily: 'PlusJakartaSans_500Medium',
} as const

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={{ fontSize: 13, fontFamily: 'PlusJakartaSans_600SemiBold', color: '#94a3b8', marginBottom: 8 }}>
        {label.toUpperCase()}
      </Text>
      {children}
    </View>
  )
}
