<template>
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
    @click.self="$emit('cancel')"
  >
    <div class="w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl bg-slate-900/95 border border-white/15 shadow-2xl">
      <div class="px-5 py-4 border-b border-white/10 flex items-center justify-between">
        <div>
          <div class="text-white font-medium">
            Pre-issue QA · {{ warnings.length }} data conflict{{ warnings.length === 1 ? '' : 's' }} found
          </div>
          <div class="text-white/50 text-xs mt-0.5">
            Shown to you only — never printed in the issued report. Generating is not blocked.
          </div>
        </div>
        <button
          class="text-white/50 hover:text-white text-lg px-1"
          title="Close"
          @click="$emit('cancel')"
        >
          ✕
        </button>
      </div>

      <div class="flex-1 overflow-y-auto px-5 py-3 space-y-2">
        <div
          v-for="w in warnings"
          :key="w.id"
          class="flex items-start gap-3 rounded-lg bg-amber-500/10 border border-amber-400/30 px-3 py-2"
        >
          <span class="text-amber-300 text-sm pt-0.5">⚠</span>
          <div class="flex-1 text-white/85 text-sm">
            {{ w.message }}
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <button
              v-if="w.link"
              class="text-sky-300/90 hover:text-sky-200 text-xs underline underline-offset-2"
              @click="$emit('open', w)"
            >
              Open
            </button>
            <button
              class="text-white/40 hover:text-white/70 text-xs"
              title="Dismiss — remembered for this activity"
              @click="$emit('dismiss', w)"
            >
              Dismiss
            </button>
          </div>
        </div>
        <div
          v-if="!warnings.length"
          class="text-white/50 text-sm py-6 text-center"
        >
          All remaining conflicts were dismissed.
        </div>
      </div>

      <div class="px-5 py-4 border-t border-white/10 flex items-center justify-between gap-3">
        <span class="text-white/40 text-xs">Dismissed warnings stay hidden for this activity.</span>
        <div class="flex items-center gap-2">
          <button
            class="px-3 py-2 rounded-md bg-white/10 border border-white/20 hover:bg-white/15 text-white/80 text-sm"
            @click="$emit('cancel')"
          >
            Cancel
          </button>
          <button
            class="px-3 py-2 rounded-md bg-emerald-500/20 border border-emerald-400/60 text-emerald-100 hover:bg-emerald-500/30 text-sm"
            @click="$emit('proceed')"
          >
            Generate anyway
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// Stage 4 of the Activity report redesign: the pre-issue QA panel. Pure
// presentation — checks run in reports/definitions/activity/qa.ts and the
// page owns dismissal persistence and navigation.
import type { QaWarning } from '../../reports/definitions/activity/qa'

defineProps<{ warnings: QaWarning[] }>()
defineEmits<{
  (e: 'proceed'): void
  (e: 'cancel'): void
  (e: 'dismiss', w: QaWarning): void
  (e: 'open', w: QaWarning): void
}>()
</script>
