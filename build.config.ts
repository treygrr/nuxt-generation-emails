import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  entries: [
    './src/module',
    { input: './src/cli/index.ts', name: 'cli/index' },
  ],
  declaration: true,
  externals: ['citty', 'consola', 'pathe', 'vue/compiler-sfc'],
  failOnWarn: false,
  rollup: {
    emitCJS: false,
  },
})
