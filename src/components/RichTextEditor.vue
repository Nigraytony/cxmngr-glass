<template>
  <div class="rte-root" :class="{ 'rte-doc-mode': docMode, 'rte-readonly': !editable }">
    <div
      v-if="editor && editable"
      class="rte-toolbar"
    >
      <button
        type="button"
        class="rte-btn"
        :class="{ active: editor.isActive('bold') }"
        :title="'Bold (Ctrl/Cmd+B)'"
        @click="editor.chain().focus().toggleBold().run()"
      >B</button>
      <button
        type="button"
        class="rte-btn italic"
        :class="{ active: editor.isActive('italic') }"
        :title="'Italic (Ctrl/Cmd+I)'"
        @click="editor.chain().focus().toggleItalic().run()"
      >I</button>
      <button
        type="button"
        class="rte-btn underline"
        :class="{ active: editor.isActive('strike') }"
        :title="'Strikethrough'"
        @click="editor.chain().focus().toggleStrike().run()"
      >S</button>
      <span class="rte-sep" />
      <button
        type="button"
        class="rte-btn"
        :class="{ active: editor.isActive('heading', { level: 1 }) }"
        :title="'Heading 1'"
        @click="editor.chain().focus().toggleHeading({ level: 1 }).run()"
      >H1</button>
      <button
        type="button"
        class="rte-btn"
        :class="{ active: editor.isActive('heading', { level: 2 }) }"
        :title="'Heading 2'"
        @click="editor.chain().focus().toggleHeading({ level: 2 }).run()"
      >H2</button>
      <button
        type="button"
        class="rte-btn"
        :class="{ active: editor.isActive('heading', { level: 3 }) }"
        :title="'Heading 3'"
        @click="editor.chain().focus().toggleHeading({ level: 3 }).run()"
      >H3</button>
      <span class="rte-sep" />
      <button
        type="button"
        class="rte-btn"
        :class="{ active: editor.isActive('bulletList') }"
        :title="'Bulleted list'"
        @click="editor.chain().focus().toggleBulletList().run()"
      >• List</button>
      <button
        type="button"
        class="rte-btn"
        :class="{ active: editor.isActive('orderedList') }"
        :title="'Numbered list'"
        @click="editor.chain().focus().toggleOrderedList().run()"
      >1. List</button>
      <button
        type="button"
        class="rte-btn"
        :class="{ active: editor.isActive('blockquote') }"
        :title="'Quote'"
        @click="editor.chain().focus().toggleBlockquote().run()"
      >&ldquo;&rdquo;</button>
      <span class="rte-sep" />
      <button
        type="button"
        class="rte-btn"
        :title="'Insert table (3×3)'"
        @click="insertTable"
      >Table</button>
      <button
        type="button"
        class="rte-btn"
        :title="'Add row above'"
        :disabled="!editor.can().addRowBefore()"
        @click="editor.chain().focus().addRowBefore().run()"
      >+row↑</button>
      <button
        type="button"
        class="rte-btn"
        :title="'Add row below'"
        :disabled="!editor.can().addRowAfter()"
        @click="editor.chain().focus().addRowAfter().run()"
      >+row↓</button>
      <button
        type="button"
        class="rte-btn"
        :title="'Delete row'"
        :disabled="!editor.can().deleteRow()"
        @click="editor.chain().focus().deleteRow().run()"
      >−row</button>
      <button
        type="button"
        class="rte-btn"
        :title="'Add column left'"
        :disabled="!editor.can().addColumnBefore()"
        @click="editor.chain().focus().addColumnBefore().run()"
      >+col←</button>
      <button
        type="button"
        class="rte-btn"
        :title="'Add column right'"
        :disabled="!editor.can().addColumnAfter()"
        @click="editor.chain().focus().addColumnAfter().run()"
      >+col→</button>
      <button
        type="button"
        class="rte-btn"
        :title="'Delete column'"
        :disabled="!editor.can().deleteColumn()"
        @click="editor.chain().focus().deleteColumn().run()"
      >−col</button>
      <button
        type="button"
        class="rte-btn"
        :title="'Delete table'"
        :disabled="!editor.can().deleteTable()"
        @click="editor.chain().focus().deleteTable().run()"
      >×table</button>
      <span class="rte-sep" />
      <button
        type="button"
        class="rte-btn"
        :title="'Undo'"
        :disabled="!editor.can().undo()"
        @click="editor.chain().focus().undo().run()"
      >↶</button>
      <button
        type="button"
        class="rte-btn"
        :title="'Redo'"
        :disabled="!editor.can().redo()"
        @click="editor.chain().focus().redo().run()"
      >↷</button>
    </div>
    <editor-content
      :editor="editor"
      class="rte-content"
    />
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, shallowRef, watch } from 'vue'
import { Editor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'
import { Link } from '@tiptap/extension-link'
import { Node, mergeAttributes } from '@tiptap/core'

const props = withDefaults(defineProps<{
  modelValue?: string
  docMode?: boolean
  editable?: boolean
}>(), {
  modelValue: '',
  docMode: false,
  editable: true,
})
const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

// ---------------------------------------------------------------------------
// CxPlanMarker: a transparent block node that preserves section sentinels
// shaped like <div data-cx-plan-marker="team-start"></div>. ProseMirror's
// default schema strips arbitrary divs, so without this extension every
// edit silently loses the markers — and the "Refresh data tables" workflow
// stops working as soon as the user clicks into the editor.
//
// We also accept legacy <!-- cx-plan:* --> HTML comment markers from any
// Cx Plan generated by an older version of the app, transforming them into
// the modern div form on paste/load. See normaliseInput() below.
// ---------------------------------------------------------------------------
const CxPlanMarker = Node.create({
  name: 'cxPlanMarker',
  group: 'block',
  atom: true,
  selectable: false,
  addAttributes() {
    return {
      marker: {
        default: null,
        parseHTML: (el: HTMLElement) => el.getAttribute('data-cx-plan-marker'),
        renderHTML: (attrs: any) => attrs.marker ? { 'data-cx-plan-marker': attrs.marker } : {},
      },
    }
  },
  parseHTML() {
    return [{ tag: 'div[data-cx-plan-marker]' }]
  },
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes), '']
  },
})

// Convert any legacy HTML-comment markers (<!-- cx-plan:foo-start -->) into
// div markers TipTap can preserve. Idempotent.
function normaliseInput(html: string): string {
  return String(html || '').replace(
    /<!--\s*cx-plan:([a-z][a-z0-9-]*)\s*-->/gi,
    (_m, name) => `<div data-cx-plan-marker="${name}"></div>`,
  )
}

// shallowRef because Editor mutates its own internal state — Vue's deep
// reactivity would just re-trigger renders without gain.
const editor = shallowRef<Editor | null>(null)

function insertTable() {
  if (!editor.value) return
  editor.value.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
}

onMounted(() => {
  editor.value = new Editor({
    content: normaliseInput(props.modelValue || ''),
    editable: props.editable,
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false }),
      Table.configure({ resizable: true, HTMLAttributes: { class: 'rte-table' } }),
      TableRow,
      TableHeader,
      TableCell,
      CxPlanMarker,
    ],
    onUpdate: () => {
      if (!editor.value) return
      const html = editor.value.getHTML()
      if (html !== props.modelValue) emit('update:modelValue', html)
    },
  })
})

// Toggle edit/read-only at runtime (e.g. Issue gets closed while editor mounted).
watch(() => props.editable, (next) => {
  if (editor.value) editor.value.setEditable(!!next)
})

// Sync external model updates back into the editor (e.g. when the parent
// programmatically replaces the description via Insert / Refresh / Regenerate).
watch(() => props.modelValue, (next) => {
  if (!editor.value) return
  const current = editor.value.getHTML()
  const wanted = normaliseInput(next || '')
  if (current === wanted) return
  // emitUpdate: false — programmatic content swap; don't echo back to parent
  editor.value.commands.setContent(wanted, { emitUpdate: false })
})

onBeforeUnmount(() => {
  if (editor.value) editor.value.destroy()
  editor.value = null
})
</script>

<style scoped>
.rte-root {
  display: flex;
  flex-direction: column;
  border-radius: 0.375rem;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.1);
  overflow: hidden;
  min-height: 14rem;
}
.rte-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  padding: 6px 8px;
  background: rgba(15, 23, 42, 0.7);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  position: sticky;
  top: 0;
  z-index: 5;
  backdrop-filter: blur(8px);
}
.rte-btn {
  padding: 4px 8px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: rgba(255, 255, 255, 0.85);
  font-size: 12px;
  line-height: 1.2;
  cursor: pointer;
  white-space: nowrap;
}
.rte-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.14);
}
.rte-btn.active {
  background: rgba(99, 102, 241, 0.35);
  border-color: rgba(99, 102, 241, 0.6);
}
.rte-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.rte-btn.italic { font-style: italic; }
.rte-btn.underline { text-decoration: line-through; }
.rte-sep {
  width: 1px;
  height: 18px;
  background: rgba(255, 255, 255, 0.15);
  margin: 0 4px;
}
.rte-content {
  padding: 12px 14px;
  color: rgba(255, 255, 255, 0.95);
  min-height: 12rem;
  max-height: 60vh;
  overflow-y: auto;
  /* Grow to fill the flex column root so the editor stretches when its parent
     gives it more space (e.g. IssueEdit's md:row-span-4 description cell). */
  flex: 1 1 auto;
}
.rte-content :deep(.ProseMirror) {
  outline: none;
  min-height: 12rem;
}
.rte-content :deep(.ProseMirror h1) {
  font-size: 1.6rem;
  font-weight: 700;
  margin: 0.75rem 0 0.5rem;
}
.rte-content :deep(.ProseMirror h2) {
  font-size: 1.3rem;
  font-weight: 600;
  margin: 1rem 0 0.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  padding-bottom: 0.25rem;
}
.rte-content :deep(.ProseMirror h3) {
  font-size: 1.05rem;
  font-weight: 600;
  margin: 0.75rem 0 0.35rem;
}
.rte-content :deep(.ProseMirror p) { margin: 0.4rem 0; }
.rte-content :deep(.ProseMirror ul),
.rte-content :deep(.ProseMirror ol) { margin: 0.4rem 0 0.4rem 1.25rem; }
.rte-content :deep(.ProseMirror li) { margin: 0.2rem 0; }
.rte-content :deep(.ProseMirror table),
.rte-content :deep(.ProseMirror .rte-table) {
  width: 100%;
  border-collapse: collapse;
  margin: 0.5rem 0 1rem;
}
.rte-content :deep(.ProseMirror th),
.rte-content :deep(.ProseMirror td) {
  border: 1px solid rgba(255, 255, 255, 0.18);
  padding: 0.4rem 0.6rem;
  text-align: left;
  vertical-align: top;
  position: relative;
}
.rte-content :deep(.ProseMirror th) {
  background: rgba(255, 255, 255, 0.06);
  font-weight: 600;
}
.rte-content :deep(.ProseMirror blockquote) {
  border-left: 3px solid rgba(255, 255, 255, 0.2);
  padding-left: 0.75rem;
  color: rgba(255, 255, 255, 0.75);
  margin: 0.5rem 0;
}
.rte-content :deep(.ProseMirror a) {
  color: rgb(129, 140, 248);
  text-decoration: underline;
}
/* CxPlanMarker render — invisible spacer, zero footprint */
.rte-content :deep(.ProseMirror div[data-cx-plan-marker]) {
  display: block;
  height: 0;
  margin: 0;
  padding: 0;
  border: 0;
  pointer-events: none;
  user-select: none;
}

/* Document mode — grow tall like a word processor */
.rte-doc-mode {
  min-height: 70vh;
}
.rte-doc-mode .rte-content {
  min-height: 70vh;
  max-height: 80vh;
}
.rte-doc-mode .rte-content :deep(.ProseMirror) {
  min-height: 70vh;
}
</style>
