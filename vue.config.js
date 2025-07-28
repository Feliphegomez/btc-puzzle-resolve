// vue.config.js
const { defineConfig } = require('@vue/cli-service');
const webpack = require('webpack');

module.exports = defineConfig({
  // transpileDependencies: true, // Opcional, ya incluido por defineConfig si es necesario
  configureWebpack: {
    // --- Configuración para WebAssembly ---
    experiments: {
      // Habilita WebAssembly asíncrono. Es el método recomendado.
      asyncWebAssembly: true,
      // syncWebAssembly: true, // Opción alternativa (estilo webpack 4), pero menos recomendada.
    },
    // -------------------------------

    plugins: [
      // Plugin para ProvidePlugin (Buffer)
      new webpack.ProvidePlugin({
        Buffer: ['buffer', 'Buffer'],
        // process: 'process/browser', // Descomenta si necesitas 'process' en el navegador
      }),
      // Plugin para DefinePlugin (feature flags de Vue)
      new webpack.DefinePlugin({
        __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: JSON.stringify(false),
        // Puedes añadir otras flags si aparecen más advertencias
        // __VUE_OPTIONS_API__: JSON.stringify(true),
        // __VUE_PROD_DEVTOOLS__: JSON.stringify(false),
      }),
    ],
    resolve: {
      fallback: {
        // Fallbacks para módulos de Node.js que no existen en el navegador
        "buffer": require.resolve('buffer'),
        // "stream": require.resolve("stream-browserify"),
        // "crypto": require.resolve("crypto-browserify"), // Aunque crypto-js está instalado, algunas libs usan 'crypto'
        // "path": require.resolve("path-browserify"),
        // "fs": false, // 'fs' no está disponible en el navegador
        // "process": require.resolve('process/browser'), // Si se necesita 'process'
      }
    }
  }
});
