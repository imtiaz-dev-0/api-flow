import { defineConfig } from 'vite'
import { resolve } from 'path'
import dts from 'vite-plugin-dts'

export default defineConfig({
  plugins: [
    dts({
      include: ['src'],
      exclude: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
      rollupTypes: false,
      insertTypesEntry: true,
    }),
  ],
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, 'src/index.ts'),
        'hooks/index': resolve(__dirname, 'src/hooks/index.ts'),
        'adapters/fetch': resolve(__dirname, 'src/adapters/fetch.ts'),
        'adapters/axios': resolve(__dirname, 'src/adapters/axios.ts'),
      },
      formats: ['es', 'cjs'],
      fileName: (format, entryName) => {
        const ext = format === 'es' ? 'js' : 'cjs'
        return `${entryName}.${ext}`
      },
    },
    rollupOptions: {
      external: ['react', 'react-dom', 'axios', 'react/jsx-runtime'],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
          axios: 'axios',
        },
        // Ensure proper chunk splitting for tree-shaking
        preserveModules: false,
        exports: 'named',
      },
    },
    target: 'es2020',
    sourcemap: true,
    minify: false, // Let users' bundlers minify for better debugging
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
})
