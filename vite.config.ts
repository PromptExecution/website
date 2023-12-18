import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path';
import { Plugin } from 'vite';

function customIconPathPlugin(): Plugin {
  /*
  this will fix the issue with vite rollup not finding the iconscout icons
  */
  return {
   name: 'custom-icon-path-plugin',
   resolveId(source) {
     if (source.startsWith('./icons/')) {
       const filePath = path.resolve(__dirname, 'node_modules/@iconscout/vue-unicons', source)+".vue";
      //  console.log("modified "+filePath)
       return filePath;
     }
    //  else {
    //   console.log(`skipped `+source)
    //  }
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
