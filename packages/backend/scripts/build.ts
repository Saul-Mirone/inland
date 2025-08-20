import { build } from 'esbuild'
import { readFileSync } from 'node:fs'

interface PackageJson {
  dependencies?: Record<string, string>
  peerDependencies?: Record<string, string>
}

const packageJsonPath = new URL('../package.json', import.meta.url).pathname

// Read package.json to get dependencies
const pkg: PackageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'))
const external = [
  ...Object.keys(pkg.dependencies || {}),
  ...Object.keys(pkg.peerDependencies || {}),
]

await build({
  entryPoints: ['src/main.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: 'dist/main.js',
  external,
  target: 'node18',
  minify: false,
  sourcemap: true,
})

console.warn('✅ Build completed!')
