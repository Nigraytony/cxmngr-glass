<template>
  <div
    role="alert"
    class="flex items-start gap-3 rounded-md border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-100"
  >
    <svg
      class="mt-0.5 h-5 w-5 shrink-0 text-amber-300"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
      <line
        x1="12"
        y1="9"
        x2="12"
        y2="13"
      />
      <line
        x1="12"
        y1="17"
        x2="12.01"
        y2="17"
      />
    </svg>

    <div class="min-w-0 flex-1">
      <p class="font-medium">
        This {{ entityLabel }} was changed by someone else
      </p>
      <p class="text-amber-200/80">
        Your last save was not applied. Reload to get the latest version — your unsaved changes here will be discarded.
      </p>
    </div>

    <div class="flex shrink-0 items-center gap-2">
      <button
        type="button"
        class="rounded-md border border-amber-400/50 bg-amber-500/20 px-3 py-1.5 font-medium text-amber-100 hover:bg-amber-500/30"
        @click="emit('reload')"
      >
        Reload
      </button>
      <button
        type="button"
        class="grid h-7 w-7 place-items-center rounded-md text-amber-200/70 hover:bg-amber-500/20 hover:text-amber-100"
        aria-label="Dismiss"
        @click="emit('dismiss')"
      >
        <svg
          class="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <line
            x1="18"
            y1="6"
            x2="6"
            y2="18"
          />
          <line
            x1="6"
            y1="6"
            x2="18"
            y2="18"
          />
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
// Shown when an edit was rejected by optimistic-locking (a 409 STALE_VERSION
// conflict — the record changed server-side since it was loaded). See the
// `conflict` state on the activities/issues/equipment stores.
withDefaults(defineProps<{ entityLabel?: string }>(), { entityLabel: 'record' })

const emit = defineEmits<{ (e: 'reload'): void; (e: 'dismiss'): void }>()
</script>
