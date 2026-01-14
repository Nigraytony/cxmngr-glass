<script setup lang="ts">
import { computed } from 'vue'

type DocFolderNode = {
  id: string | null
  name: string
  path?: string
  parentId?: string | null
  children?: DocFolderNode[]
}

defineOptions({ name: 'FolderNodeRow' })

const props = defineProps<{
  node: DocFolderNode
  depth: number
  selectedId: string | null
  expanded: Record<string, boolean>
}>()

const emit = defineEmits<{
  (e: 'toggle', id: string): void
  (e: 'select', id: string): void
  (e: 'create', parentId: string): void
  (e: 'rename', node: DocFolderNode): void
  (e: 'move', node: DocFolderNode): void
  (e: 'delete', node: DocFolderNode): void
}>()

const isExpanded = computed(() => !!props.expanded[String(props.node.id)])
const hasChildren = computed(() => Array.isArray(props.node.children) && props.node.children.length > 0)
const pad = computed(() => `${props.depth * 14}px`)

function toggle() { emit('toggle', String(props.node.id)) }
function select() { emit('select', String(props.node.id)) }
function create() { emit('create', String(props.node.id)) }
function rename() { emit('rename', props.node) }
function move() { emit('move', props.node) }
function del() { emit('delete', props.node) }
</script>

<template>
  <li>
    <div
      class="flex items-center gap-1 rounded-md hover:bg-white/5 pr-1"
      :style="{ paddingLeft: pad }"
    >
      <button
        v-if="hasChildren"
        type="button"
        class="w-5 h-5 grid place-items-center text-white/70 hover:text-white"
        @click.stop="toggle"
      >
        <span v-if="isExpanded">▾</span><span v-else>▸</span>
      </button>
      <span
        v-else
        class="w-5 h-5 inline-block"
      />

      <button
        type="button"
        class="flex-1 min-w-0 text-left px-1 py-1 rounded text-white/90 hover:text-white"
        :class="selectedId === String(node.id) ? 'bg-white/10 border border-white/10' : ''"
        @click="select"
      >
        <span class="inline-flex items-center gap-1 min-w-0">
          <span class="text-white/70">📁</span>
          <span class="truncate">{{ node.name }}</span>
        </span>
      </button>

      <div class="flex items-center gap-1">
        <button
          type="button"
          class="w-8 h-8 grid place-items-center rounded hover:bg-white/10 text-white/70 hover:text-white"
          title="New subfolder"
          @click.stop="create"
        >
          +
        </button>
        <button
          type="button"
          class="w-8 h-8 grid place-items-center rounded hover:bg-white/10 text-white/70 hover:text-white"
          title="Rename"
          @click.stop="rename"
        >
          ✎
        </button>
        <button
          type="button"
          class="w-8 h-8 grid place-items-center rounded hover:bg-white/10 text-white/70 hover:text-white"
          title="Move"
          @click.stop="move"
        >
          ⇄
        </button>
        <button
          type="button"
          class="w-8 h-8 grid place-items-center rounded hover:bg-red-500/20 text-red-100/80 hover:text-red-100"
          title="Delete"
          @click.stop="del"
        >
          ✕
        </button>
      </div>
    </div>

    <ul
      v-if="hasChildren && isExpanded"
      class="space-y-1 mt-1"
    >
      <FolderNodeRow
        v-for="c in node.children"
        :key="String(c.id)"
        :node="c"
        :depth="depth + 1"
        :selected-id="selectedId"
        :expanded="expanded"
        @toggle="$emit('toggle', $event)"
        @select="$emit('select', $event)"
        @create="$emit('create', $event)"
        @rename="$emit('rename', $event)"
        @move="$emit('move', $event)"
        @delete="$emit('delete', $event)"
      />
    </ul>
  </li>
</template>
