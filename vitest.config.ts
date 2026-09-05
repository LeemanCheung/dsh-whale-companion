import { defineConfig } from 'vitest/config'
import ts from 'typescript'

export default defineConfig({
  plugins: [{
    name: 'test-standard-remote-decorators',
    enforce: 'pre',
    transform(source, id) {
      if (!id.replaceAll('\\', '/').endsWith('/packages/dsh-whale-companion/src/index.ts')) return
      // Vite's source runner leaves standard decorators for Node, which does
      // not execute them yet. Use the same TypeScript semantics as the Host.
      const result = ts.transpileModule(source, {
        fileName: id,
        compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, sourceMap: true },
      })
      return { code: result.outputText, map: result.sourceMapText }
    },
  }],
  test: {
    include: ['packages/dsh-whale-companion/{test,tests}/**/*.{test,spec}.ts'],
    exclude: ['**/lib/**', '**/node_modules/**'],
    testTimeout: 30_000,
  },
})
