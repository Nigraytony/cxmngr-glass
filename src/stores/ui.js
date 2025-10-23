import { defineStore } from 'pinia'

export const useUiStore = defineStore('ui', {
  state: () => ({
    sidebarOpen: true,
    // toast state
    toast: {
      show: false,
      message: '',
      variant: 'white',
      duration: 2500,
      top: '4rem'
    }
  }),
  actions: {
    toggleSidebar() { this.sidebarOpen = !this.sidebarOpen }
    ,
    closeSidebar() { this.sidebarOpen = false }
    ,
    // Toast helpers
    showToast({ message, variant = 'white', duration = 2500, top = '4rem' }) {
      this.toast.message = message
      this.toast.variant = variant
      this.toast.duration = duration
      this.toast.top = top
      this.toast.show = true
    },
    showSuccess(message, opts = {}) {
      this.showToast({ message, variant: 'success', duration: opts.duration || 2500, top: opts.top || '4rem' })
    },
    showError(message, opts = {}) {
      this.showToast({ message, variant: 'error', duration: opts.duration || 3500, top: opts.top || '4rem' })
    },
    hideToast() {
      this.toast.show = false
    }
  }
})
