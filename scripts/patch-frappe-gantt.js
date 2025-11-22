#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

// Path to the frappe-gantt SCSS file that often uses deprecated color functions
const target = path.join(__dirname, '..', 'node_modules', 'frappe-gantt', 'src', 'gantt.scss');

function patchFile(file) {
  if (!fs.existsSync(file)) {
    console.log('[patch-frappe-gantt] no frappe-gantt scss file found; skipping');
    return;
  }
  let content = fs.readFileSync(file, 'utf8');
  const original = content;

  // Replace darken($color, N) -> color.adjust($color, $lightness: -N%)
  content = content.replace(/darken\(\s*([^,\)]+)\s*,\s*([0-9.]+)%?\s*\)/g, (m, col, amt) => {
    return `color.adjust(${col.trim()}, $lightness: -${amt}%)`;
  });

  // Replace lighten($color, N) -> color.adjust($color, $lightness: N%)
  content = content.replace(/lighten\(\s*([^,\)]+)\s*,\s*([0-9.]+)%?\s*\)/g, (m, col, amt) => {
    return `color.adjust(${col.trim()}, $lightness: ${amt}%)`;
  });

  if (content !== original) {
    try {
      fs.writeFileSync(file, content, 'utf8');
      console.log('[patch-frappe-gantt] patched', file);
    } catch (e) {
      console.error('[patch-frappe-gantt] failed to write file', e && e.message ? e.message : e);
    }
  } else {
    console.log('[patch-frappe-gantt] no changes required');
  }
}

try {
  patchFile(target);
} catch (e) {
  console.error('[patch-frappe-gantt] unexpected error', e && e.message ? e.message : e);
}
