import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import BillingCardForm from '../src/components/BillingCardForm.vue'
import { nextTick } from 'vue'

const flushPromises = () => new Promise((resolve) => setTimeout(resolve))

// Mock @stripe/stripe-js to provide a minimal stripe client and elements/card.
const mockCard = {
  on: vi.fn(),
  mount: vi.fn(),
  unmount: vi.fn()
}
const mockElements = {
  create: vi.fn(() => mockCard)
}
const mockConfirm = vi.fn(async () => ({ setupIntent: { payment_method: 'pm_test_123' } }))

vi.mock('@stripe/stripe-js', () => {
  return {
    loadStripe: vi.fn(async () => ({
      confirmCardSetup: mockConfirm,
      elements: () => mockElements
    }))
  }
})

describe('BillingCardForm', () => {
  beforeEach(() => {
    mockCard.on.mockClear()
    mockCard.mount.mockClear()
    mockCard.unmount.mockClear()
    mockElements.create.mockClear()
    mockConfirm.mockClear()
  })

  it('emits success with payment method id after confirming card setup', async () => {
    const wrapper = mount(BillingCardForm, {
      props: {
        publishableKey: 'pk_test_123',
        clientSecret: 'seti_123'
      }
    })

    await nextTick()
    // Trigger save card button
    const saveBtn = wrapper.get('button')
    await saveBtn.trigger('click')
    await flushPromises()

    // Ensure stripe confirm was called and success emitted
    expect(mockConfirm).toHaveBeenCalled()
    const emitted = wrapper.emitted('success')
    expect(emitted).toBeTruthy()
    expect(emitted?.[0]).toEqual(['pm_test_123'])
  })

  it('emits cancel when cancel button is clicked', async () => {
    const wrapper = mount(BillingCardForm, {
      props: {
        publishableKey: 'pk_test_123',
        clientSecret: 'seti_123'
      }
    })

    const buttons = wrapper.findAll('button')
    const cancelBtn = buttons[1]
    await cancelBtn.trigger('click')
    expect(wrapper.emitted('cancel')).toBeTruthy()
  })
})
