import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  base: "/mips-interpreter-web/",
  plugins: [
    tailwindcss(),
    react()
  ],
  build: {
    outDir: "docs",    // docs is the build output folder
    emptyOutDir: true  // clears prior docs contents
  }
})
