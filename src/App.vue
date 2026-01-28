<template>
  <RouterView />
  <Toast
    :message="ui.toast.message"
    :show="ui.toast.show"
    :variant="ui.toast.variant"
    :duration="ui.toast.duration"
    :top="ui.toast.top"
    :action-label="ui.toast.actionLabel"
    :action-to="ui.toast.actionTo"
    @update:show="(v) => ui.toast.show = v"
    @close="(payload) => ui.hideToast(payload)"
  />
</template>

<script setup>
import Toast from './components/Toast.vue'
import { useUiStore } from './stores/ui'

const ui = useUiStore()
</script>
