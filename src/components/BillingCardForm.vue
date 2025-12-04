<template>
  <div class="space-y-2">
    <div
      v-if="!clientSecret"
      class="text-sm text-white/70"
    >
      Start card setup to enable the form.
    </div>
    <div
      v-show="Boolean(clientSecret)"
      class="p-3 rounded bg-white/5 border border-white/10"
    >
      <div
        ref="cardMountRef"
        class="p-3 rounded bg-white/5 border border-white/10"
      />
      <div
        v-if="errorMsg"
        class="text-sm text-red-300 mt-2"
      >
        {{ errorMsg }}
      </div>
      <div class="mt-3 flex gap-2">
        <button
          class="px-4 py-2 rounded bg-blue-600 text-white"
          :disabled="processing"
          @click="handleConfirm"
        >
          {{ processing ? 'Saving…' : 'Save card' }}
        </button>
        <button
          class="px-4 py-2 rounded bg-white/10 border border-white/20"
          :disabled="processing"
          @click="resetForm"
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { loadStripe, Stripe, StripeElements, StripeCardElement } from '@stripe/stripe-js'
import { onBeforeUnmount, ref, watch } from 'vue'

const props = defineProps<{
  publishableKey: string
  clientSecret: string | null
}>()

const emit = defineEmits<{
  (e: 'success', paymentMethodId: string): void
  (e: 'error', message: string): void
  (e: 'cancel'): void
}>()

const stripeRef = ref<Stripe | null>(null)
const elementsRef = ref<StripeElements | null>(null)
const cardRef = ref<StripeCardElement | null>(null)
const cardMountRef = ref<HTMLElement | null>(null)
const errorMsg = ref<string | null>(null)
const processing = ref(false)

async function ensureElements() {
  if (!props.publishableKey) throw new Error('Stripe publishable key missing')
  if (!stripeRef.value) {
    stripeRef.value = await loadStripe(props.publishableKey)
  }
  if (!elementsRef.value && stripeRef.value) {
    elementsRef.value = stripeRef.value.elements()
  }
  if (!cardRef.value && elementsRef.value && cardMountRef.value) {
    cardRef.value = elementsRef.value.create('card')
    cardRef.value.on('change', (evt: any) => {
      errorMsg.value = evt?.error?.message || null
    })
    cardRef.value.mount(cardMountRef.value)
  }
}

function destroyCard() {
  try {
    if (cardRef.value) {
      cardRef.value.unmount()
      // destroy is available for legacy Elements; guard call
      if (typeof (cardRef.value as any).destroy === 'function') {
        (cardRef.value as any).destroy()
      }
    }
  } catch (e) {
    // ignore
  }
  cardRef.value = null
}

watch(() => props.clientSecret, async (secret) => {
  if (!secret) {
    destroyCard()
    errorMsg.value = null
    processing.value = false
    return
  }
  try {
    await ensureElements()
  } catch (e: any) {
    errorMsg.value = e?.message || 'Failed to init Stripe'
    emit('error', errorMsg.value)
  }
})

async function handleConfirm() {
  try {
    if (!props.clientSecret) {
      errorMsg.value = 'Start card setup first'
      emit('error', errorMsg.value)
      return
    }
    await ensureElements()
    if (!stripeRef.value || !cardRef.value) {
      errorMsg.value = 'Stripe not ready'
      emit('error', errorMsg.value)
      return
    }
    processing.value = true
    const result = await stripeRef.value.confirmCardSetup(props.clientSecret, {
      payment_method: { card: cardRef.value }
    })
    if (result.error) {
      errorMsg.value = result.error.message || 'Card setup failed'
      emit('error', errorMsg.value)
      return
    }
    const pmId = result?.setupIntent?.payment_method
    if (!pmId || typeof pmId !== 'string') {
      errorMsg.value = 'No payment method returned'
      emit('error', errorMsg.value)
      return
    }
    emit('success', pmId)
    resetForm()
  } catch (e: any) {
    errorMsg.value = e?.message || 'Card setup failed'
    emit('error', errorMsg.value)
  } finally {
    processing.value = false
  }
}

function resetForm() {
  destroyCard()
  errorMsg.value = null
  processing.value = false
  emit('cancel')
}

onBeforeUnmount(() => {
  destroyCard()
})
</script>
