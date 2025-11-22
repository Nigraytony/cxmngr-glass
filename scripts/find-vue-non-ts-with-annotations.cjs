const fs = require('fs')
const path = require('path')
function walk(dir){ let res=[]; for(const f of fs.readdirSync(dir)){ const p=path.join(dir,f); if(fs.statSync(p).isDirectory()) res=res.concat(walk(p)); else res.push(p)} return res}
const root=path.join(__dirname,'..','src')
const files=walk(root).filter(f=>f.endsWith('.vue'))
const pattern=/:\s*any\b|:\s*string\b|:\s*number\b|:\s*boolean\b/
for(const f of files){ const txt=fs.readFileSync(f,'utf8'); let m; const scriptRe=/<script([^>]*)>([\s\S]*?)<\/script>/gi; let i=0; while((m=scriptRe.exec(txt))){ i++; const attrs=m[1]; const body=m[2]; if(!/lang\s*=\s*['\"]ts['\"]/.test(attrs) && pattern.test(body)){ console.log('MATCH:', f, 'scriptIndex', i, 'attrs:', attrs.trim()) }
 }
}
