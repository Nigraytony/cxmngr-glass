import { createApp, h, ref } from 'vue'
import InlineConfirm from '../components/InlineConfirm.vue'

export type ConfirmOptions = {
  title?: string
  message?: string
  confirmText?: string
  cancelText?: string
  variant?: 'default' | 'danger' | 'error' | 'success'
  zIndex?: number
}

export function confirm(options: ConfirmOptions = {}): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    try { console.debug('[confirm util] open', options) } catch {}

    const container = document.createElement('div')
    document.body.appendChild(container)

    const visible = ref(true)

    const app = createApp({
      name: 'InlineConfirmHost',
      render() {
        return h(InlineConfirm, {
          modelValue: visible.value,
          'onUpdate:modelValue': (v: boolean) => {
            visible.value = v
            if (!v) {
              // Closed without choice => resolve false
              try { console.debug('[confirm util] closed via overlay/X') } catch {}
              cleanup(false)
            }
          },
          title: options.title || 'Confirm',
          message: options.message || '',
          confirmText: options.confirmText || 'Confirm',
          cancelText: options.cancelText || 'Cancel',
          variant: options.variant || 'default',
          zIndex: options.zIndex ?? 10000,
          onResolve: (val: boolean) => {
            try { console.debug('[confirm util] resolved', val) } catch {}
            cleanup(val)
          }
        })
      }
    })

    function cleanup(val: boolean) {
      resolve(val)
      app.unmount()
      if (container.parentNode) container.parentNode.removeChild(container)
    }

    app.mount(container)
  })
}
