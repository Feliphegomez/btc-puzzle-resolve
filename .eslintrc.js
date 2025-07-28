// .eslintrc.js
module.exports = {
  root: true,
  env: {
    node: true,
    // Añade 'browser: true' para reconocer APIs del navegador como BigInt, crypto, etc.
    browser: true,
  },
  'extends': [
    'plugin:vue/vue3-essential',
    'eslint:recommended'
  ],
  parserOptions: {
    ecmaVersion: 2020 // Esto ya está bien, BigInt es de ES2020
  },
  rules: {
    'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'warn' : 'off'
  },
  // Añade esta sección para definir globales adicionales si es necesario
  globals: {
    // 'browser: true' debería cubrir BigInt, pero si aún tienes problemas, puedes añadirlo explícitamente:
    BigInt: "readonly"
  }
};