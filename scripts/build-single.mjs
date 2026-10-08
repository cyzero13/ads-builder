import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const distDir = path.resolve('dist')
const indexPath = path.join(distDir, 'index.html')
const singlePath = path.join(distDir, 'single.html')

let html = await readFile(indexPath, 'utf8')

html = html.replace(/\s*<link rel="icon"[^>]*>\s*/g, '\n')

const stylesheetPattern = /<link rel="stylesheet" crossorigin href="([^"]+)"\s*\/?>/g
for (const match of [...html.matchAll(stylesheetPattern)]) {
  const [tag, href] = match
  const filePath = path.join(distDir, href.replace(/^\//, ''))
  const css = (await readFile(filePath, 'utf8')).replaceAll('</style', '<\\/style')
  html = html.replace(tag, `<style>${css}</style>`)
}

const scriptPattern = /<script type="module" crossorigin src="([^"]+)"><\/script>/g
for (const match of [...html.matchAll(scriptPattern)]) {
  const [tag, src] = match
  const filePath = path.join(distDir, src.replace(/^\//, ''))
  const js = (await readFile(filePath, 'utf8')).replaceAll('</script', '<\\/script')
  html = html.replace(tag, `<script>${js}</script>`)
}

await writeFile(singlePath, html)

console.log(`Created ${path.relative(process.cwd(), singlePath)}`)
