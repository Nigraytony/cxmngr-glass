<template>
  <RouterView />
  <Toast :message="ui.toast.message" :show="ui.toast.show" :variant="ui.toast.variant" :duration="ui.toast.duration" :top="ui.toast.top" @update:show="(v) => ui.toast.show = v" @close="ui.hideToast" />
</template>

<script setup>
import Toast from './components/Toast.vue'
import { useUiStore } from './stores/ui'

const ui = useUiStore()
</script>
