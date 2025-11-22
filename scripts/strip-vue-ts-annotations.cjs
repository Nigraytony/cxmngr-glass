const fs = require('fs')
const path = require('path')

function walk(dir) {
  let results = []
  const list = fs.readdirSync(dir)
  list.forEach(function(file) {
    file = path.join(dir, file)
    const stat = fs.statSync(file)
    if (stat && stat.isDirectory()) results = results.concat(walk(file))
    else results.push(file)
  })
  return results
}

const root = path.join(__dirname, '..', 'src')
const files = walk(root).filter(f => f.endsWith('.vue'))
console.log('[strip-ts] found', files.length, '.vue files')

const replacements = [
  { r: /\b: any\b/g, s: '' },
  { r: /\b: string\b/g, s: '' },
  { r: /\b: number\b/g, s: '' },
  { r: /\b: boolean\b/g, s: '' },
  { r: /\b: unknown\b/g, s: '' },
  { r: /\b: any\[\]/g, s: '' },
  { r: /\b: Array<\s*any\s*>/g, s: '' },
  // param with optional and type: `d?: any` -> `d?`
  { r: /(\w+)\?\s*:\s*any/g, s: '$1?' },
  // remove simple return types like `): string {` -> `) {`
  { r: /\)\s*:\s*[A-Za-z0-9_\[\]\|\s\?<>,']+\s*\{/g, s: ') {' },
  // remove inline variable type annotations: `const x: any =` -> `const x =`
  { r: /(const|let|var)\s+(\w+)\s*:\s*[A-Za-z0-9_\[\]\|\s\?<>,']+\s*=/g, s: '$1 $2 =' },
]

let changed = 0
for (const f of files) {
  let txt = fs.readFileSync(f, 'utf8')
  let out = txt
    // Only operate inside <script ...> blocks
  out = out.replace(/<script([\s\S]*?)>([\s\S]*?)<\/script>/gi, (m, attrs, body) => {
    // if script already lang="ts" skip
    if (/lang\s*=\s*"ts"|lang\s*=\s*'ts'/.test(attrs)) return m
    let b = body
    for (const rep of replacements) b = b.replace(rep.r, rep.s)
    return `<script${attrs}>${b}</script>`
  })

  if (out !== txt) {
    fs.writeFileSync(f, out, 'utf8')
    changed++
  }
}
console.log('[strip-ts] changed files:', changed)
