import { defineStore } from 'pinia'

export const useUiStore = defineStore('ui', {
  state: () => ({
    sidebarOpen: true,
    // Persisted UI preferences
    showSignatures: (() => {
      try {
        const v = localStorage.getItem('ui.showSignatures')
        return v ? JSON.parse(v) : false
      } catch (e) { return false }
    })(),
    // show/hide cost column (admins only can toggle)
    showCostColumn: (() => {
      try {
        const v = localStorage.getItem('ui.showCostColumn')
        return v ? JSON.parse(v) : true
      } catch (e) { return true }
    })(),
    tasksBillRate: (() => {
      try {
        const v = localStorage.getItem('ui.tasksBillRate')
        return v ? JSON.parse(v) : 0
      } catch (e) { return 0 }
    })(),
    showTaskScheduleColumns: (() => {
      try {
        const v = localStorage.getItem('ui.showTaskScheduleColumns')
        return v ? JSON.parse(v) : true
      } catch (e) { return true }
    })(),
    showTaskDurationColumn: (() => {
      try {
        const v = localStorage.getItem('ui.showTaskDurationColumn')
        if (v != null) return JSON.parse(v)
      } catch (e) { /* ignore */ }
      try {
        const legacy = localStorage.getItem('ui.showTaskScheduleColumns')
        if (legacy != null) return JSON.parse(legacy)
      } catch (e) { /* ignore */ }
      return true
    })(),
    showTaskStartColumn: (() => {
      try {
        const v = localStorage.getItem('ui.showTaskStartColumn')
        if (v != null) return JSON.parse(v)
      } catch (e) { /* ignore */ }
      try {
        const legacy = localStorage.getItem('ui.showTaskScheduleColumns')
        if (legacy != null) return JSON.parse(legacy)
      } catch (e) { /* ignore */ }
      return true
    })(),
    showTaskFinishColumn: (() => {
      try {
        const v = localStorage.getItem('ui.showTaskFinishColumn')
        if (v != null) return JSON.parse(v)
      } catch (e) { /* ignore */ }
      try {
        const legacy = localStorage.getItem('ui.showTaskScheduleColumns')
        if (legacy != null) return JSON.parse(legacy)
      } catch (e) { /* ignore */ }
      return true
    })(),
    showTaskCreateLinkActivityButton: (() => {
      try {
        const v = localStorage.getItem('ui.showTaskCreateLinkActivityButton')
        return v ? JSON.parse(v) : true
      } catch (e) { return true }
    })(),
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
    setShowCostColumn(val) {
      this.showCostColumn = !!val
      try { localStorage.setItem('ui.showCostColumn', JSON.stringify(this.showCostColumn)) } catch (e) { /* ignore */ }
    },
    setTasksBillRate(val) {
      const num = typeof val === 'string' ? Number(val) : val
      this.tasksBillRate = Number.isFinite(num) ? num : 0
      try { localStorage.setItem('ui.tasksBillRate', JSON.stringify(this.tasksBillRate)) } catch (e) { /* ignore */ }
    },
    setShowTaskScheduleColumns(val) {
      this.showTaskScheduleColumns = !!val
      try { localStorage.setItem('ui.showTaskScheduleColumns', JSON.stringify(this.showTaskScheduleColumns)) } catch (e) { /* ignore */ }
    },
    setShowTaskDurationColumn(val) {
      this.showTaskDurationColumn = !!val
      try { localStorage.setItem('ui.showTaskDurationColumn', JSON.stringify(this.showTaskDurationColumn)) } catch (e) { /* ignore */ }
    },
    setShowTaskStartColumn(val) {
      this.showTaskStartColumn = !!val
      try { localStorage.setItem('ui.showTaskStartColumn', JSON.stringify(this.showTaskStartColumn)) } catch (e) { /* ignore */ }
    },
    setShowTaskFinishColumn(val) {
      this.showTaskFinishColumn = !!val
      try { localStorage.setItem('ui.showTaskFinishColumn', JSON.stringify(this.showTaskFinishColumn)) } catch (e) { /* ignore */ }
    },
    setShowTaskCreateLinkActivityButton(val) {
      this.showTaskCreateLinkActivityButton = !!val
      try { localStorage.setItem('ui.showTaskCreateLinkActivityButton', JSON.stringify(this.showTaskCreateLinkActivityButton)) } catch (e) { /* ignore */ }
    },
    showSuccess(message, opts = {}) {
      this.showToast({ message, variant: 'success', duration: opts.duration || 2500, top: opts.top || '4rem' })
    },
    showError(message, opts = {}) {
      this.showToast({ message, variant: 'error', duration: opts.duration || 3500, top: opts.top || '4rem' })
    },
    showInfo(message, opts = {}) {
      this.showToast({ message, variant: 'info', duration: opts.duration || 2500, top: opts.top || '4rem' })
    },
    showWarning(message, opts = {}) {
      this.showToast({ message, variant: 'warning', duration: opts.duration || 3000, top: opts.top || '4rem' })
    },
    hideToast() {
      this.toast.show = false
    }
    ,
    setShowSignatures(val) {
      this.showSignatures = !!val
      try { localStorage.setItem('ui.showSignatures', JSON.stringify(this.showSignatures)) } catch (e) { /* ignore */ }
    }
  }
})
