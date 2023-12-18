import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path';
import { Plugin } from 'vite';

function customIconPathPlugin(): Plugin {
  return {
    name: 'custom-icon-path-plugin', // required, will show up in warnings and errors
    resolveId(source) {
      if (source.startsWith('@iconscout/vue-unicons')) {
        // Modify the source path to include the `.vue` extension
        return { id: source + '.vue', external: false };
      }
      return null; // Other imports should not be affected
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue(), customIconPathPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
      },
  }
})
