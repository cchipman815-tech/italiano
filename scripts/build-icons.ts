/**
 * build-icons.ts
 * Renders the app icon (docs/design/app-icon.svg) into every file the app ships:
 *   app/favicon.ico, app/icon.svg       browser tab (rounded corners)
 *   app/apple-icon.png                  iPhone home screen (180px, full bleed, opaque)
 *   public/icon-{192,512}.png           manifest "any" (rounded corners)
 *   public/icon-maskable-{192,512}.png  manifest "maskable" for Android (full bleed)
 *
 * Run after changing the source: npx tsx scripts/build-icons.ts
 * Uses sharp, which Next installs for image optimization.
 */
import { readFileSync, writeFileSync } from 'fs'
import sharp from 'sharp'

const SOURCE = 'docs/design/app-icon.svg'
const GROUND = '#12100E'
const CORNER = 22 // % of the side, close to the iOS squircle

const fullBleed = readFileSync(SOURCE, 'utf8').replace(/\s*<!--[\s\S]*?-->/g, '')
const rounded = fullBleed
  .replace(/(<svg[^>]*>)/, `$1<defs><clipPath id="corner"><rect width="100" height="100" rx="${CORNER}"/></clipPath></defs><g clip-path="url(#corner)">`)
  .replace(/<\/svg>\s*$/, '</g></svg>\n')

// The source has a 100-unit viewBox and no width, so 72dpi renders it at 100px.
function png(svg: string, size: number) {
  return sharp(Buffer.from(svg), { density: (72 * size) / 100 }).resize(size, size).png()
}

async function opaquePng(svg: string, size: number) {
  return png(svg, size).flatten({ background: GROUND }).removeAlpha().toBuffer()
}

// An .ico is a small directory of embedded PNGs.
function ico(images: { size: number; data: Buffer }[]) {
  const header = Buffer.alloc(6 + 16 * images.length)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(images.length, 4)
  let offset = header.length
  images.forEach(({ size, data }, i) => {
    const entry = 6 + 16 * i
    header.writeUInt8(size >= 256 ? 0 : size, entry)
    header.writeUInt8(size >= 256 ? 0 : size, entry + 1)
    header.writeUInt16LE(1, entry + 4)
    header.writeUInt16LE(32, entry + 6)
    header.writeUInt32LE(data.length, entry + 8)
    header.writeUInt32LE(offset, entry + 12)
    offset += data.length
  })
  return Buffer.concat([header, ...images.map(image => image.data)])
}

async function main() {
  const outputs: [string, Buffer | string][] = [
    ['app/icon.svg', rounded],
    ['app/apple-icon.png', await opaquePng(fullBleed, 180)],
    ['public/icon-192.png', await png(rounded, 192).toBuffer()],
    ['public/icon-512.png', await png(rounded, 512).toBuffer()],
    ['public/icon-maskable-192.png', await opaquePng(fullBleed, 192)],
    ['public/icon-maskable-512.png', await opaquePng(fullBleed, 512)],
  ]
  const favicons = await Promise.all([16, 32, 48].map(async size => ({ size, data: await png(rounded, size).toBuffer() })))
  outputs.push(['app/favicon.ico', ico(favicons)])

  for (const [file, data] of outputs) {
    writeFileSync(file, data)
    console.log(`wrote ${file}`)
  }
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
