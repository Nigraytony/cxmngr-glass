import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useUiStore } from '../../src/stores/ui'

describe('ui store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('toggles sidebar', () => {
    const store = useUiStore()
    const initial = store.sidebarOpen
    store.toggleSidebar()
    expect(store.sidebarOpen).toBe(!initial)
    store.toggleSidebar()
    expect(store.sidebarOpen).toBe(initial)
  })

  it('shows and hides toasts with variants', () => {
    const store = useUiStore()
    store.showSuccess('ok', { duration: 100 })
    expect(store.toast.show).toBe(true)
    expect(store.toast.message).toBe('ok')
    expect(store.toast.variant).toBe('success')
    store.hideToast()
    expect(store.toast.show).toBe(false)
  })
})
