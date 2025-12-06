import { compile } from 'sass'
import { minify as minifyHTML } from 'html-minifier-terser'
import * as fs from 'fs'
import * as path from 'path'
import { WebSocketServer } from 'ws'
import * as os from 'os'
import sharp from 'sharp'
import { execSync } from 'child_process'
import glob from 'fast-glob'

const isProd = process.argv.includes('--prod')
const src = 'src'
const dist = 'dist'

// --------------------------------------
// Auto-generate clean-unused-assets.ts
// --------------------------------------
const cleanerTsPath = path.join(process.cwd(), 'clean-unused-assets.ts')

if (!fs.existsSync(cleanerTsPath)) {
	fs.writeFileSync(
		cleanerTsPath,
		`import { readdir, readFile, stat, unlink } from "fs/promises";
      import fs from "fs";
      import path from "path";

      async function getAllFiles(dir: string): Promise<string[]> {
        const entries = await readdir(dir, { withFileTypes: true });
        const files: string[] = [];
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            files.push(...(await getAllFiles(fullPath)));
          } else {
            files.push(fullPath);
          }
        }
        return files;
      }

      export async function smartClean(options?: { distDir?: string; assetsSubdir?: string }) {
        const distDir = options?.distDir ?? "dist";
        const assetsSubdir = options?.assetsSubdir ?? "assets";
        const assetsDir = path.join(distDir, assetsSubdir);

        let allDistFiles: string[] = [];
        try {
          allDistFiles = await getAllFiles(distDir);
        } catch {
          console.warn(\`⚠ Cannot read dist directory: \${distDir}. Skipping SmartClean.\`);
          return;
        }

        const contentFiles = allDistFiles.filter((file) =>
          /\\.(html|css|js|mjs|cjs|ts|map)$/i.test(file)
        );

        let combinedContent = "";
        for (const file of contentFiles) {
          try {
            combinedContent += await readFile(file, "utf-8");
          } catch {}
        }

        let assetFiles: string[] = [];
        try {
          assetFiles = await getAllFiles(assetsDir);
        } catch {
          console.warn(\`⚠ No assets folder found in \${assetsDir}, skipping SmartClean.\`);
          return;
        }

        let removed = 0;
        for (const file of assetFiles) {
          const info = await stat(file);
          if (!info.isFile()) continue;
          const fileName = path.basename(file);
          if (!combinedContent.includes(fileName)) {
            await unlink(file);
            console.log("🧹 Removed unused asset:", fileName);
            removed++;
          }
        }

        if (removed === 0) {
          console.log("✨ SmartClean: no unused assets found.");
        } else {
          console.log(\`✅ SmartClean: removed \${removed} unused asset(s).\`);
        }
      }
      `
	)
	console.log('✔ clean-unused-assets.ts generated')
}

// ------------------
// Kolory i ikonki
// ------------------
const colors = {
	reset: '\x1b[0m',
	red: '\x1b[31m',
	green: '\x1b[32m',
	yellow: '\x1b[33m',
}

// ------------------
// HELPERS
// ------------------
function ensureDir(dir: string) {
	if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

// ------------------
// SCSS → CSS
// ------------------
async function buildSass() {
	try {
		ensureDir(`${dist}/css`)
		const result = compile(`${src}/scss/style.scss`, {
			style: 'expanded',
		})
		const inputPath = `${dist}/css/style.input.css`
		const outputPath = `${dist}/css/style.css`

		fs.writeFileSync(inputPath, result.css)
		console.log(`${colors.green}✔ SASS compiled -> style.input.css${colors.reset}`)

		// Jeśli nie używamy Tailwinda – kopiujemy style.input.css → style.css
		if (!fs.existsSync(path.join(process.cwd(), 'tailwind.config.js'))) {
			fs.copyFileSync(inputPath, outputPath)
			console.log(`${colors.green}✔ Copied SCSS → style.css (Tailwind OFF)${colors.reset}`)
		}
	} catch (err: any) {
		console.warn(`${colors.red}⚠ SCSS build failed:${colors.reset} ${err.message || err}`)
	}
}


async function buildTailwind() {
	try {
		ensureDir(`${dist}/css`)
		const args = ['tailwindcss', '-i', './dist/css/style.input.css', '-o', './dist/css/style.css']
		if (isProd) args.push('--minify')

		const proc = Bun.spawn({
			cmd: ['bunx', ...args],
			stdout: 'inherit',
			stderr: 'inherit',
		})

		await proc.exited
		console.log(`${colors.green}✔ Tailwind built -> style.css${colors.reset}`)
	} catch (err: any) {
		console.warn(`${colors.red}⚠ Tailwind build failed:${colors.reset} ${err.message || err}`)
	}
}

// ------------------
// Sprawdzenie TS
// ------------------
function checkTS(): boolean {
	try {
		execSync('tsc --noEmit', { stdio: 'pipe' })
		return true
	} catch (err: any) {
		const output = err.stdout?.toString() || ''
		const lines = output.split('\n').filter(Boolean)
		console.warn(`${colors.red}⚠ TS type check failed:${colors.reset}`)
		lines.forEach((line) => console.warn(`${colors.red}   ${line}${colors.reset}`))
		return false
	}
}

// ------------------
// JS/TS Bundling
// ------------------
async function buildJS() {
  const tsOk = checkTS()
  if (!tsOk) return

  try {
    ensureDir(`${dist}/js`)
    const files = await glob('**/*.{js,ts}', { cwd: path.join(src, 'js') })

    for (const file of files) {
      const entryFile = path.join(src, 'js', file)
      const tempOutDir = path.join(dist, 'js')

      const result = await Bun.build({
        entrypoints: [entryFile],
        outdir: tempOutDir,
        minify: isProd,
        bundle: true,
      })

      if (!result.success) {
        console.warn(`${colors.red}⚠ JS/TS build failed for ${file}:${colors.reset}`)
        for (const log of result.logs) {
          if (log.location) {
            console.warn(
              `${colors.red}   ${log.location.file}:${log.location.line}:${log.location.column} ${log.text}${colors.reset}`
            )
          } else {
            console.warn(`${colors.red}   ${log.text}${colors.reset}`)
          }
        }
      } else {
        const jsFileName = path.basename(file, path.extname(file)) + '.js'
        const minFileName = path.basename(file, path.extname(file)) + '.min.js'
        const jsFilePath = path.join(dist, 'js', jsFileName)
        const minFilePath = path.join(dist, 'js', minFileName)

        if (fs.existsSync(jsFilePath)) {
          fs.renameSync(jsFilePath, minFilePath)
          console.log(`${colors.green}✔ JS built: ${minFileName}${colors.reset}`)
        }
      }
    }
  } catch (err: any) {
    console.warn(`${colors.red}⚠ JS/TS build crashed:${colors.reset} ${err.message || err}`)
  }
}


// ------------------
// HTML Includes
// ------------------
function processHTMLIncludes(content: string, baseDir: string): string {
	const includeRegex = /@@include\("(.+?)"\)/g
	let result = content
	let match: RegExpExecArray | null

	while ((match = includeRegex.exec(result)) !== null) {
		const filePath = path.join(baseDir, match[1])
		let fileContent = ''
		if (fs.existsSync(filePath)) {
			fileContent = fs.readFileSync(filePath, 'utf-8')
		} else {
			console.warn(`${colors.yellow}⚠ Include not found: ${filePath}${colors.reset}`)
		}
		const processedContent = processHTMLIncludes(fileContent, path.dirname(filePath))
		result = result.replace(match[0], processedContent)
		includeRegex.lastIndex = 0
	}
	return result
}

async function buildHTML() {
	ensureDir(dist)
	const htmlDir = path.join(src, 'html')
	const files = fs.readdirSync(htmlDir).filter((f) => f.endsWith('.html'))
	for (const file of files) {
		const input = fs.readFileSync(path.join(htmlDir, file), 'utf-8')
		let processed = processHTMLIncludes(input, path.join(htmlDir, 'partials'))
		if (isProd) {
			processed = await minifyHTML(processed, {
				collapseWhitespace: true,
				removeComments: true,
				minifyCSS: true,
				minifyJS: true,
			})
		}
		fs.writeFileSync(path.join(dist, file), processed)
	}
	console.log(`${colors.green}✔ HTML built with includes${colors.reset}`)
}

// ------------------
// ASSETS
// ------------------
async function copyAssets() {
	const srcAssets = path.join(src, 'assets')
	const distAssets = path.join(dist, 'assets')
	if (!fs.existsSync(srcAssets)) return

	async function processFile(srcPath: string, destPath: string) {
		const ext = path.extname(srcPath).toLowerCase()
		if (['.png'].includes(ext)) {
			await sharp(srcPath).png({ compressionLevel: 9, adaptiveFiltering: true }).toFile(destPath)
		} else if (['.jpg', '.jpeg'].includes(ext)) {
			await sharp(srcPath).jpeg({ quality: 80, mozjpeg: true }).toFile(destPath)
		} else {
			fs.copyFileSync(srcPath, destPath)
		}
		console.log(`${colors.green}✔ Asset copied: ${path.basename(destPath)}${colors.reset}`)
	}

	async function copyDirRecursive(srcDir: string, destDir: string) {
		ensureDir(destDir)
		const files = fs.readdirSync(srcDir)
		for (const file of files) {
			const srcPath = path.join(srcDir, file)
			const destPath = path.join(destDir, file)
			if (fs.statSync(srcPath).isDirectory()) {
				await copyDirRecursive(srcPath, destPath)
			} else {
				await processFile(srcPath, destPath)
			}
		}
	}

	await copyDirRecursive(srcAssets, distAssets)
}

// ------------------
// BUILD ALL
// ------------------
async function buildAll() {
	await buildSass()
	await buildTailwind()
	await buildJS()
	await buildHTML()
	await copyAssets()

	if (isProd) {
		try {
			const { smartClean } = await import('./clean-unused-assets.ts')
			console.log(`${colors.yellow}🧹 SmartClean: Cleaning unused files...${colors.reset}`)
			await smartClean({
				distDir: dist,
				assetsSubdir: 'assets',
			})
		} catch (err: any) {
			console.warn(`${colors.red}⚠ SmartClean failed:${colors.reset} ${err.message || err}`)
		}
	}
}

// ------------------
// OPEN BROWSER
// ------------------
function openBrowser(url: string) {
	const platform = os.platform()
	if (platform === 'win32') Bun.spawn(['cmd', '/c', 'start', '', url])
	else if (platform === 'darwin') Bun.spawn(['open', url])
	else Bun.spawn(['xdg-open', url])
}

// ------------------
// DEV SERVER
// ------------------
async function devServer() {
  await buildSass()
  await buildTailwind()
  await buildJS()
  await copyAssets()

  const clients = new Set<import('ws').WebSocket>()
  const hmrClients = new Set<import('ws').WebSocket>()
  const wss = new WebSocketServer({ port: 35729 })

  wss.on('connection', (ws) => {
    clients.add(ws)
    ws.on('message', (data) => {
      try {
        const msg = typeof data === 'string' ? JSON.parse(data) : JSON.parse(data.toString())
        if (msg?.type === 'hmr') hmrClients.add(ws)
      } catch {}
    })
    ws.on('close', () => {
      clients.delete(ws)
      hmrClients.delete(ws)
    })
  })

  const broadcastReloadToAll = () => {
    for (const ws of clients) ws.send('reload')
  }

  const injectCSS = async () => {
    const cssPath = path.join(dist, 'css', 'style.css')
    if (!fs.existsSync(cssPath)) return
    const css = fs.readFileSync(cssPath, 'utf-8')
    for (const ws of hmrClients) {
      ws.send(JSON.stringify({ type: 'css', content: css }))
    }
  }

  const server = Bun.serve({
    port: 3000,
    fetch(req) {
      const url = new URL(req.url)

      // LIVE RELOAD SCRIPT
      if (url.pathname === '/live-reload.js') {
        const js = `
          const ws = new WebSocket('ws://localhost:35729');
          ws.addEventListener('open', () => { try { ws.send(JSON.stringify({ type: 'hmr' })) } catch {} });
          ws.onmessage = (event) => {
            try {
              const msg = JSON.parse(event.data);
              if (msg.type==='css') {
                let style=document.getElementById('live-css');
                if(!style){
                  style=document.createElement('style');
                  style.id='live-css';
                  document.head.appendChild(style);
                }
                style.innerHTML=msg.content;
                return;
              }
            } catch{}
            location.reload();
          };
        `
        return new Response(js, { headers: { 'Content-Type': 'application/javascript' } })
      }

      // Serve HTML from src/html
      if (url.pathname === '/' || url.pathname.endsWith('.html')) {
        const pageName = url.pathname === '/' ? 'index.html' : path.basename(url.pathname)
        const rawPath = path.join(src, 'html', pageName)

        if (!fs.existsSync(rawPath)) {
          return new Response('Not Found', { status: 404 })
        }

        const rawHTML = fs.readFileSync(rawPath, 'utf-8')
        const processed = processHTMLIncludes(rawHTML, path.join(src, 'html', 'partials'))

        const withLiveReload = processed.replace(
          '</body>',
          `<script src="/live-reload.js"></script></body>`
        )

        return new Response(withLiveReload, {
          headers: { 'Content-Type': 'text/html' }
        })
      }

      // Serve other static files from dist
      let filePath = path.join(dist, url.pathname)
      if (!fs.existsSync(filePath)) return new Response('Not Found', { status: 404 })

      const ext = path.extname(filePath).toLowerCase()
      const mimeTypes: Record<string, string> = {
        '.js': 'application/javascript',
        '.ts': 'application/javascript',
        '.css': 'text/css',
        '.html': 'text/html',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.svg': 'image/svg+xml',
        '.gif': 'image/gif',
      }

      const data = fs.readFileSync(filePath)
      return new Response(data, {
        headers: { 'Content-Type': mimeTypes[ext] || 'text/plain' }
      })
    },
  })

  console.log(`${colors.green}🔥 Dev server running → http://localhost:3000${colors.reset}`)
  openBrowser('http://localhost:3000')

  let timeout: NodeJS.Timeout

  fs.watch(src, { recursive: true }, (eventType, filename) => {
    if (!filename) return
    clearTimeout(timeout)

    timeout = setTimeout(async () => {
      const ext = path.extname(filename).toLowerCase()

      if (ext === '.scss') {
        console.log(`${colors.green}↻ SCSS changed: ${filename}${colors.reset}`)
        await buildSass()
        await buildTailwind()
        await injectCSS()
        broadcastReloadToAll()
      } else if (ext === '.ts' || ext === '.js') {
        console.log(`${colors.green}↻ JS changed: ${filename}${colors.reset}`)
        await buildJS()
        broadcastReloadToAll()
      } else if (ext === '.html') {
        console.log(`${colors.green}↻ HTML changed: ${filename}${colors.reset}`)
        await buildHTML() // 💥 tutaj dodajemy buildHTML
        broadcastReloadToAll()
      } else if (filename.includes('assets')) {
        console.log(`${colors.green}↻ Asset changed: ${filename}${colors.reset}`)
        await copyAssets()
        broadcastReloadToAll()
      }
    }, 200)
  })

  process.on('SIGINT', () => {
    server.stop()
    wss.close()
    console.log('\nServer stopped')
    process.exit(0)
  })
}


// ------------------
// RUN
// ------------------
async function run() {
	if (process.argv.includes('--dev')) await devServer()
	else {
		await buildAll()
		process.exit(0)
	}
}

run()
