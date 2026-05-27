import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator, Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAddBenefit } from '../../hooks/useBenefits'

type BenefitType = 'credit' | 'discount' | 'free_item'

const TYPE_OPTIONS: { key: BenefitType; label: string }[] = [
  { key: 'credit', label: 'Credit (₪)' },
  { key: 'discount', label: 'Discount (%)' },
  { key: 'free_item', label: 'Free item' },
]

export default function Manual() {
  const router = useRouter()
  const [businessName, setBusinessName] = useState('')
  const [title, setTitle] = useState('')
  const [type, setType] = useState<BenefitType>('credit')
  const [value, setValue] = useState('')
  const [expiryDate, setExpiryDate] = useState('')

  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      return user
    },
    staleTime: Infinity,
  })

  const { mutate: addBenefit, isPending } = useAddBenefit()

  function handleSubmit() {
    if (!businessName.trim()) { Alert.alert('Store name is required'); return }
    if (!title.trim()) { Alert.alert('Coupon title is required'); return }
    if (type !== 'free_item' && !value.trim()) { Alert.alert('Value is required'); return }
    if (!user) return

    const parsed = type !== 'free_item' ? parseFloat(value) : 0
    if (type !== 'free_item' && (isNaN(parsed) || parsed <= 0)) { Alert.alert('Enter a valid positive value'); return }

    let expires: string | undefined
    if (expiryDate.trim()) {
      const d = new Date(expiryDate.trim())
      if (isNaN(d.getTime())) { Alert.alert('Invalid date — use YYYY-MM-DD format'); return }
      expires = d.toISOString()
    }

    const benefit = {
      business_name: businessName.trim(),
      type,
      title: title.trim(),
      expires_at: expires,
      ...(type === 'credit' && { amount_cents: Math.round(parsed * 100) }),
      ...(type === 'discount' && { discount_percent: Math.round(parsed) }),
      ...(type === 'free_item' && { free_item_description: value.trim() || title.trim() }),
    }

    addBenefit(
      { userId: user.id, benefit },
      {
        onSuccess: () => {
          setBusinessName(''); setTitle(''); setValue(''); setExpiryDate('')
          router.navigate('/wallet')
        },
        onError: (err) => Alert.alert('Error', String(err)),
      },
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20 }}>
        {/* Header */}
        <View className="flex-row items-center mb-6">
          <Text className="text-xl font-bold text-gray-900">Add coupon manually</Text>
        </View>

        <Field label="Store name *">
          <TextInput
            className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-900"
            placeholder="e.g. Java House"
            placeholderTextColor="#9ca3af"
            value={businessName}
            onChangeText={setBusinessName}
          />
        </Field>

        <Field label="Coupon title *">
          <TextInput
            className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-900"
            placeholder="e.g. Free coffee"
            placeholderTextColor="#9ca3af"
            value={title}
            onChangeText={setTitle}
          />
        </Field>

        <Field label="Type">
          <View className="flex-row gap-x-2">
            {TYPE_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.key}
                onPress={() => setType(opt.key)}
                className={`flex-1 rounded-xl py-2.5 items-center border ${
                  type === opt.key
                    ? 'bg-brand border-brand'
                    : 'bg-white border-gray-200'
                }`}
              >
                <Text className={`text-xs font-semibold ${type === opt.key ? 'text-white' : 'text-gray-600'}`}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Field>

        <Field label={type === 'credit' ? 'Amount (₪) *' : type === 'discount' ? 'Discount (%) *' : 'Description *'}>
          <TextInput
            className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-900"
            placeholder={type === 'credit' ? '50' : type === 'discount' ? '20' : 'What is the free item?'}
            placeholderTextColor="#9ca3af"
            value={value}
            onChangeText={setValue}
            keyboardType={type === 'free_item' ? 'default' : 'decimal-pad'}
          />
        </Field>

        <Field label="Expiry date (optional)">
          <TextInput
            className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-900"
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#9ca3af"
            value={expiryDate}
            onChangeText={setExpiryDate}
            keyboardType="numbers-and-punctuation"
          />
        </Field>

        <TouchableOpacity
          className="bg-brand rounded-full py-4 items-center mt-4"
          onPress={handleSubmit}
          disabled={isPending}
        >
          {isPending ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white font-bold text-base">Save coupon</Text>
          )}
        </TouchableOpacity>

        <Text className="text-center text-gray-400 text-xs mt-4">
          Manually added coupons show a "Manual" badge and are not verified by the store.
        </Text>
      </ScrollView>
    </SafeAreaView>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View className="mb-4">
      <Text className="text-sm font-medium text-gray-700 mb-1.5">{label}</Text>
      {children}
    </View>
  )
}
