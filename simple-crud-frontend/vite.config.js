import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'exclude-template-files',
      apply: 'build',
      generateBundle(options, bundle) {
        // Delete template files from the bundle if they were copied
        if (bundle['runtime-config.js.template']) {
          delete bundle['runtime-config.js.template']
        }
      }
    }
  ],
})
