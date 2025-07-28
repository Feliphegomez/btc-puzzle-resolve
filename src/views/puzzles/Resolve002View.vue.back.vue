<template>
  <div id="bitcoin-puzzle-solver">
    <div class="container">
      <h1>₿ Bitcoin Puzzle Solver v2.0</h1>
      <div class="info-box">
        <p>🔧 Método basado en generación original de Satoshi Nakamoto</p>
        <p>💡 Prueba con el Puzzle #1 (clave privada = 1) para verificar funcionamiento</p>
        <p>🧪 Usa "Probar Clave Manual" con valor "1" para test rápido</p>
      </div>
      
      <div class="section">
        <h3>🧩 Cargar Puzzle Predefinido</h3>
        <select @change="loadPuzzlePreset" v-model="selectedPuzzle">
          <option value="">-- Seleccionar Puzzle --</option>
          <option value="1">Puzzle #1 (Clave = 1)</option>
          <option value="2">Puzzle #2 (Rango 2-3)</option>
          <option value="3">Puzzle #3 (Rango 4-7)</option>
          <option value="4">Puzzle #4 (Rango 8-15)</option>
          <option value="5">Puzzle #5 (Rango 100-110)</option>
          <option value="6">Puzzle #6 (Rango 1000-1010)</option>
          <option value="7">Puzzle #7 (Rango 10000-10010)</option>
          <option value="8">Puzzle #8 (Rango 100000-100010)</option>
        </select>
      </div>

      <div class="form-group">
        <label>🎯 Dirección Bitcoin Objetivo:</label>
        <input type="text" v-model="targetAddress" placeholder="Dirección Bitcoin a encontrar">
      </div>

      <div class="form-group">
        <label>🔢 Rango de Claves Privadas (Hexadecimal):</label>
        <div class="range-inputs">
          <div>
            <label>Desde:</label>
            <input type="text" v-model="rangeStart" placeholder="1">
          </div>
          <div>
            <label>Hasta:</label>
            <input type="text" v-model="rangeEnd" placeholder="1">
          </div>
        </div>
      </div>

      <div class="form-group">
        <label>⚡ Velocidad (ms por clave, menor = más rápido):</label>
        <input type="number" v-model.number="speed" min="0" max="1000">
      </div>

      <div class="controls">
        <button @click="startSearch" :disabled="isSearching" id="startBtn">🚀 Iniciar Búsqueda</button>
        <button @click="stopSearch" :disabled="!isSearching" id="stopBtn" class="stop-btn">⏹️ Detener</button>
        <button @click="testSingleKey">🧪 Probar Clave Manual</button>
        <button @click="generateRandomWallet">🎲 Generar Wallet Random</button>
      </div>

      <div class="status" :class="{ running: isSearching, found: solutionFound }" id="status">
        <div><strong>Estado:</strong> <span id="statusText">{{ statusText }}</span></div>
        <div class="stats">
          <div class="stat-item">
            <span class="stat-value" id="totalKeys">{{ totalKeys.toLocaleString() }}</span>
            <div>Claves Probadas</div>
          </div>
          <div class="stat-item">
            <span class="stat-value" id="keysPerSecond">{{ keysPerSecond.toLocaleString() }}</span>
            <div>Claves/Segundo</div>
          </div>
          <div class="stat-item">
            <span class="stat-value" id="elapsed">{{ elapsedTime }}</span>
            <div>Tiempo</div>
          </div>
        </div>
      </div>

      <div class="log" id="log">
        <div v-for="(entry, index) in logEntries" :key="index" class="log-entry">{{ entry }}</div>
      </div>

      <div v-if="solutionFound" class="result success" id="result">
        <h2>🎉 ¡PUZZLE BITCOIN RESUELTO!</h2>
        <p><strong>📍 Dirección:</strong></p>
        <div class="address">{{ foundWallet.address }}</div>
        <p><strong>🔑 Clave Privada (Hex):</strong></p>
        <div class="private-key">{{ foundWallet.privateKeyHex }}</div>
        <p><strong>🔢 Clave Privada (Decimal):</strong></p>
        <div class="private-key">{{ foundWallet.privateKeyDecimal }}</div>
        <p><strong>💰 Clave Privada (WIF):</strong></p>
        <div class="private-key-wif">{{ foundWallet.privateKeyWIF }}</div>
        <p><strong>📋 Clave Pública:</strong></p>
        <div class="public-key">{{ foundWallet.publicKeyHex }}</div>
        <p><strong>📊 Estadísticas de la Búsqueda:</strong></p>
        <p>• Claves probadas: {{ totalKeys.toLocaleString() }}</p>
        <p>• Tiempo transcurrido: {{ elapsedTime }}</p>
        <div class="warning">
          ⚠️ <strong>IMPORTANTE:</strong><br>
          1. <strong>COPIA</strong> esta información inmediatamente.<br>
          2. <strong>GUARDA</strong> la clave privada en un lugar SEGURO.<br>
          3. <strong>IMPORTA</strong> la clave en una wallet para acceder a los fondos.<br>
          4. <strong>VERIFICA</strong> la dirección antes de transferir fondos.<br>
          5. <strong>NO COMPARTAS</strong> esta información con nadie.<br><br>
          <em>🔒 Esta información es extremadamente valiosa - manténla segura</em>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
// Importar las bibliotecas necesarias
import * as bitcoin from 'bitcoinjs-lib';
import * as ecc from 'tiny-secp256k1';
// Importar ECPairFactory desde el paquete ecpair
import { ECPairFactory } from 'ecpair';

// --- INICIALIZACIÓN CRÍTICA ---
// Crear la fábrica de ECPair usando tiny-secp256k1
const ECPair = ECPairFactory(ecc);
// Inicializar bitcoinjs-lib con el módulo ECC (aunque ECPair ya lo usa internamente)
bitcoin.initEccLib(ecc); 
// -----------------------------

export default {
  name: 'BitcoinPuzzleSolver',
  data() {
    return {
      selectedPuzzle: '',
      targetAddress: '1BgGZ9tcN4rm9KBzDn7KprQz87SZ26SAMH',
      rangeStart: '1',
      rangeEnd: '1',
      speed: 10,
      
      isSearching: false,
      solutionFound: false,
      statusText: 'Listo para iniciar',
      
      currentKey: null,
      endKey: null,
      totalKeys: 0,
      lastKeyCount: 0,
      keysPerSecond: 0,
      startTime: null,
      elapsedTime: '00:00',
      
      searchInterval: null,
      elapsedInterval: null,
      speedInterval: null,
      
      logEntries: [],
      foundWallet: null,
      
      // Constante máxima para clave privada válida en Bitcoin
      BITCOIN_MAX_KEY: BigInt('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364140')
    };
  },
  mounted() {
    this.log('₿ Bitcoin Puzzle Solver v2.0 iniciado');
    this.log('🔧 Método basado en generación original de Satoshi Nakamoto');
    this.log('💡 Prueba con el Puzzle #1 (clave privada = 1) para verificar funcionamiento');
    this.log('🧪 Usa "Probar Clave Manual" con valor "1" para test rápido');
    
    // Mostrar ejemplo de la clave privada 1
    try {
      const testWallet = this.privateKeyToWallet(BigInt(1));
      if (testWallet) {
        this.log(`📋 Ejemplo - Clave 1: ${testWallet.address}`);
      }
    } catch (e) {
      console.error('Error generating test wallet:', e);
    }
  },
  beforeUnmount() {
    this.stopIntervals();
    if (this.searchInterval) clearInterval(this.searchInterval);
  },
  methods: {
    hexToBigInt(hexString) {
      const trimmed = hexString.trim();
      if (!/^[0-9a-fA-F]+$/.test(trimmed)) {
        throw new Error('Formato hexadecimal inválido');
      }
      // Asegurarse de que tenga longitud par
      let hex = trimmed;
      if (hex.length % 2 !== 0) {
        hex = '0' + hex;
      }
      return BigInt(`0x${hex}`);
    },
    
    bigIntToHex(bigint) {
      if (bigint === 0n) return '0';
      let hex = bigint.toString(16);
      // Asegurarse de que tenga longitud par
      if (hex.length % 2 !== 0) {
        hex = '0' + hex;
      }
      return hex;
    },
    
    privateKeyToWallet(privateKeyBigInt) {
      try {
        // Asegurar que esté en el rango válido
        if (privateKeyBigInt <= 0n || privateKeyBigInt >= this.BITCOIN_MAX_KEY) {
          return null;
        }
        
        // Convertir BigInt a Buffer (32 bytes)
        const hex = this.bigIntToHex(privateKeyBigInt);
        const paddedHex = hex.padStart(64, '0'); // 32 bytes = 64 hex chars
        const privateKeyBuffer = Buffer.from(paddedHex, 'hex');
        
        // --- AHORA USAMOS LA FÁBRICA ECPair ---
        // Crear par de claves usando la fábrica ECPair importada
        const keyPair = ECPair.fromPrivateKey(privateKeyBuffer); // network es opcional aquí
        // -----------------------------------

        // Generar dirección P2PKH (especificando la red)
        const { address } = bitcoin.payments.p2pkh({ 
          pubkey: keyPair.publicKey, 
          network: bitcoin.networks.bitcoin 
        });

        return {
          address: address,
          privateKeyHex: paddedHex,
          privateKeyDecimal: privateKeyBigInt.toString(),
          privateKeyWIF: keyPair.toWIF(),
          publicKeyHex: keyPair.publicKey.toString('hex')
          // publicKeyCompressed: keyPair.compressed // Opcional, por defecto true
        };
      } catch (error) {
        console.error('Error generando wallet:', error);
        return null;
      }
    },
    
    loadPuzzlePreset(event) {
      const value = event.target.value;
      switch(value) {
        case '1':
          this.targetAddress = '1BgGZ9tcN4rm9KBzDn7KprQz87SZ26SAMH';
          this.rangeStart = '1';
          this.rangeEnd = '1';
          this.log('🧩 Puzzle #1 configurado - Clave privada: 1');
          break;
        case '2':
          this.targetAddress = '1CUTxxqjWReNKgbVVA2QTamtTNJ6bAjKMN';
          this.rangeStart = '2';
          this.rangeEnd = '3';
          this.log('🧩 Puzzle #2 configurado - Rango: 2-3');
          break;
        case '3':
          this.targetAddress = '19ZewH8Kk1PDbSNdJ97FP4EiCjTRaZMZQA';
          this.rangeStart = '4';
          this.rangeEnd = '7';
          this.log('🧩 Puzzle #3 configurado - Rango: 4-7');
          break;
        case '4':
          this.targetAddress = '1J7mdg5rbQyUHENYdx39WVWK7fsLp2oF2G';
          this.rangeStart = '8';
          this.rangeEnd = 'f'; // 15 en decimal
          this.log('🧩 Puzzle #4 configurado - Rango: 8-15');
          break;
        case '5':
          this.targetAddress = '1NLcNpA6zzT5YAHy6Cxy73F6FRKm4LTM5J';
          this.rangeStart = '64'; // 100 en decimal
          this.rangeEnd = '6e'; // 110 en decimal
          this.log('🧩 Puzzle #5 configurado - Rango: 100-110');
          break;
        case '6':
          this.targetAddress = '1Me64418dnhrwiznQBRJ6Vf8dQvE4iJnHp';
          this.rangeStart = '3e8'; // 1000 en decimal
          this.rangeEnd = '3f2'; // 1010 en decimal
          this.log('🧩 Puzzle #6 configurado - Rango: 1000-1010');
          break;
        case '7':
          this.targetAddress = '1N7H2Su8XwQ9bGvDJ968zTjKYFMCV8y8iX';
          this.rangeStart = '2710'; // 10000 en decimal
          this.rangeEnd = '271a'; // 10010 en decimal
          this.log('🧩 Puzzle #7 configurado - Rango: 10000-10010');
          break;
        case '8':
          this.targetAddress = '15K1Y97D3dq8kgahDF8r6Q3GBjY2r9Ry3A';
          this.rangeStart = '186a0'; // 100000 en decimal
          this.rangeEnd = '186aa'; // 100010 en decimal
          this.log('🧩 Puzzle #8 configurado - Rango: 100000-100010');
          break;
      }
    },
    
    startSearch() {
      if (!this.targetAddress) {
        alert('Por favor ingresa una dirección objetivo');
        return;
      }
      
      try {
        this.currentKey = this.hexToBigInt(this.rangeStart);
        this.endKey = this.hexToBigInt(this.rangeEnd);
      } catch (error) {
        alert('Error en el formato de rango: ' + error.message);
        return;
      }
      
      if (this.currentKey > this.endKey) {
        alert('El rango inicial debe ser menor o igual que el final');
        return;
      }
      
      // Resetear contadores
      this.totalKeys = 0;
      this.lastKeyCount = 0;
      this.startTime = Date.now();
      
      // Actualizar UI
      this.isSearching = true;
      this.solutionFound = false;
      this.statusText = 'Búsqueda en progreso...';
      
      const rangeSize = this.endKey - this.currentKey + 1n;
      this.log(`🚀 Iniciando búsqueda...`);
      this.log(`🎯 Objetivo: ${this.targetAddress}`);
      this.log(`🔢 Rango: ${this.rangeStart} - ${this.rangeEnd}`);
      this.log(`📈 Total de claves a probar: ${rangeSize.toString()}`);
      this.log(`⚡ Velocidad: ${this.speed}ms por clave`);
      
      // Iniciar intervalos para estadísticas
      this.startIntervals();
      
      // Iniciar búsqueda
      this.searchInterval = setInterval(() => {
        if (!this.isSearching) return;
        
        const wallet = this.privateKeyToWallet(this.currentKey);
        this.totalKeys++;
        
        if (wallet && wallet.address === this.targetAddress) {
          this.foundSolution(wallet);
          return;
        }
        
        // Mover a la siguiente clave
        this.currentKey++;
        if (this.currentKey > this.endKey) {
          this.log('🔚 Rango completado. No se encontró la clave.');
          this.stopSearch();
        }
      }, this.speed);
    },
    
    stopSearch() {
      if (!this.isSearching) return;
      this.isSearching = false;
      
      if (this.searchInterval) {
        clearInterval(this.searchInterval);
        this.searchInterval = null;
      }
      
      // Actualizar UI
      this.statusText = 'Búsqueda detenida';
      this.stopIntervals();
      this.log(`🛑 Búsqueda detenida. Claves procesadas: ${this.totalKeys.toLocaleString()}`);
    },
    
    foundSolution(wallet) {
      // DETENER BÚSQUEDA INMEDIATAMENTE
      this.solutionFound = true;
      this.isSearching = false;
      this.statusText = '¡SOLUCIÓN ENCONTRADA!';
      
      if (this.searchInterval) {
        clearInterval(this.searchInterval);
        this.searchInterval = null;
      }
      
      // Guardar wallet encontrada
      this.foundWallet = wallet;
      
      // Detener intervalos
      this.stopIntervals();
      
      // Log en consola
      console.log('🎯 WALLET COMPLETA:', wallet);
      
      // Mostrar en log
      this.log(`🏆 ¡SOLUCIÓN ENCONTRADA!`);
      this.log(`📍 Dirección: ${wallet.address}`);
      this.log(`🔑 Clave Hex: ${wallet.privateKeyHex}`);
      this.log(`🔢 Clave Decimal: ${wallet.privateKeyDecimal}`);
      this.log(`💰 Clave WIF: ${wallet.privateKeyWIF}`);
      this.log(`📋 Clave Pública: ${wallet.publicKeyHex}`);
      
      // Alerta del navegador
      setTimeout(() => {
        alert(`🎉 ¡PUZZLE BITCOIN RESUELTO!\nDirección: ${wallet.address}\nClave WIF: ${wallet.privateKeyWIF}\n¡COPIA Y GUARDA ESTA INFORMACIÓN INMEDIATAMENTE!`);
      }, 500);
    },
    
    testSingleKey() {
      const keyInput = prompt('Ingresa una clave privada:\n• Hexadecimal (ej: 1, A, FF, 123ABC)\n• Decimal (ej: 1, 10, 255)\n• Deja vacío para usar "1"');
      let keyBigInt;
      
      if (!keyInput || keyInput.trim() === '') {
        keyBigInt = BigInt(1);
      } else {
        try {
          const trimmed = keyInput.trim();
          // Intentar como hex primero
          if (/^[0-9a-fA-F]+$/.test(trimmed)) {
            keyBigInt = this.hexToBigInt(trimmed);
          } else {
            // Intentar como decimal
            keyBigInt = BigInt(trimmed);
          }
        } catch (error) {
          alert('Formato inválido. Usa hexadecimal o decimal.');
          return;
        }
      }
      
      const wallet = this.privateKeyToWallet(keyBigInt);
      if (wallet) {
        this.log(`🧪 Wallet generada:`);
        this.log(`📍 Dirección: ${wallet.address}`);
        this.log(`🔑 Clave Hex: ${wallet.privateKeyHex}`);
        this.log(`💰 Clave WIF: ${wallet.privateKeyWIF}`);
        
        const message = `🧪 WALLET BITCOIN GENERADA:\nDirección: ${wallet.address}\nClave Privada (Hex): ${wallet.privateKeyHex}\nClave Privada (WIF): ${wallet.privateKeyWIF}\nClave Pública: ${wallet.publicKeyHex}\n⚠️ GUARDA ESTA INFORMACIÓN SI PLANEAS USARLA`;
        alert(message);
      } else {
        this.log(`❌ Error generando wallet`);
        alert('Error generando wallet - clave inválida');
      }
    },
    
    generateRandomWallet() {
      // Generar un número aleatorio grande
      const array = new Uint8Array(32);
      window.crypto.getRandomValues(array);
      let randomBigInt = BigInt('0x' + Array.from(array).map(b => b.toString(16).padStart(2, '0')).join(''));
      
      // Asegurar que esté en el rango válido de Bitcoin
      if (randomBigInt > this.BITCOIN_MAX_KEY) {
        randomBigInt = randomBigInt % this.BITCOIN_MAX_KEY;
      }
      
      const wallet = this.privateKeyToWallet(randomBigInt);
      if (wallet) {
        this.log(`🎲 Wallet aleatoria generada:`);
        this.log(`📍 Dirección: ${wallet.address}`);
        this.log(`🔑 Clave Hex: ${wallet.privateKeyHex}`);
        this.log(`💰 Clave WIF: ${wallet.privateKeyWIF}`);
        
        const message = `🎲 WALLET BITCOIN ALEATORIA GENERADA:\nDirección: ${wallet.address}\nClave Privada (Hex): ${wallet.privateKeyHex}\nClave Privada (WIF): ${wallet.privateKeyWIF}\nClave Pública: ${wallet.publicKeyHex}\n⚠️ GUARDA ESTA INFORMACIÓN SI PLANEAS USARLA`;
        alert(message);
      } else {
        this.log(`❌ Error generando wallet aleatoria`);
        alert('Error generando wallet aleatoria');
      }
    },
    
    updateStats() {
      // Esta función se actualiza a través de los intervalos
    },
    
    startIntervals() {
      // Actualizar tiempo transcurrido
      this.elapsedInterval = setInterval(() => {
        if (!this.isSearching) return;
        const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;
        this.elapsedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      }, 1000);
      
      // Actualizar velocidad
      this.speedInterval = setInterval(() => {
        if (!this.isSearching) return;
        const currentKeys = this.totalKeys;
        const speed = currentKeys - this.lastKeyCount;
        this.lastKeyCount = currentKeys;
        this.keysPerSecond = speed;
      }, 1000);
    },
    
    stopIntervals() {
      if (this.elapsedInterval) {
        clearInterval(this.elapsedInterval);
        this.elapsedInterval = null;
      }
      if (this.speedInterval) {
        clearInterval(this.speedInterval);
        this.speedInterval = null;
      }
    },
    
    log(message) {
      const timestamp = new Date().toLocaleTimeString();
      this.logEntries.push(`[${timestamp}] ${message}`);
      // Mantener solo las últimas 100 entradas
      if (this.logEntries.length > 100) {
        this.logEntries.shift();
      }
    }
  }
};
</script>

<style scoped>
#bitcoin-puzzle-solver {
  font-family: 'Courier New', monospace;
  background: linear-gradient(135deg, #0d1117, #161b22);
  color: #c9d1d9;
  margin: 0;
  padding: 20px;
  min-height: 100vh;
}
.container {
  max-width: 800px;
  margin: 0 auto;
  background: rgba(13, 17, 23, 0.8);
  border: 1px solid #30363d;
  border-radius: 15px;
  padding: 25px;
  box-shadow: 0 0 30px rgba(88, 166, 255, 0.1);
}
h1 {
  text-align: center;
  color: #58a6ff;
  text-shadow: 0 0 10px rgba(88, 166, 255, 0.3);
  margin-bottom: 20px;
}
.info-box {
  background: rgba(22, 27, 34, 0.8);
  border: 1px solid #6e7681;
  border-radius: 8px;
  padding: 15px;
  margin-bottom: 25px;
  font-size: 14px;
}
.info-box p {
  margin: 8px 0;
}
.section {
  background: rgba(22, 27, 34, 0.8);
  border: 1px solid #30363d;
  border-radius: 10px;
  padding: 15px;
  margin: 15px 0;
}
.section h3 {
  color: #58a6ff;
  margin-top: 0;
}
.form-group {
  margin: 20px 0;
}
.form-group label {
  display: block;
  margin-bottom: 8px;
  color: #8b949e;
}
input, select {
  width: 100%;
  padding: 12px;
  background: #0d1117;
  border: 1px solid #21262d;
  border-radius: 6px;
  color: #c9d1d9;
  font-family: monospace;
  box-sizing: border-box;
}
input:focus, select:focus {
  border-color: #58a6ff;
  outline: none;
  box-shadow: 0 0 5px rgba(88, 166, 255, 0.3);
}
.range-inputs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
}
.controls {
  display: flex;
  gap: 15px;
  margin: 25px 0;
  flex-wrap: wrap;
}
button {
  padding: 12px 24px;
  background: linear-gradient(135deg, #238636, #2ea043);
  border: none;
  border-radius: 8px;
  color: #fff;
  font-weight: bold;
  cursor: pointer;
  font-family: monospace;
  transition: all 0.3s ease;
}
button:hover {
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(46, 160, 67, 0.4);
}
button:disabled {
  background: #6e7681;
  color: #8b949e;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}
.stop-btn {
  background: linear-gradient(135deg, #da3633, #f85149) !important;
}
.status {
  background: #0d1117;
  border: 1px solid #30363d;
  border-radius: 8px;
  padding: 20px;
  margin: 20px 0;
}
.status.running {
  border-color: #238636;
  animation: pulse 2s infinite;
}
.status.found {
  border-color: #f0883e;
  background: #1c1017;
  animation: victory 1s infinite;
}
@keyframes pulse {
  0% { box-shadow: 0 0 5px rgba(35, 134, 54, 0.3); }
  50% { box-shadow: 0 0 20px rgba(35, 134, 54, 0.6); }
  100% { box-shadow: 0 0 5px rgba(35, 134, 54, 0.3); }
}
@keyframes victory {
  0% { box-shadow: 0 0 20px rgba(240, 136, 62, 0.8); }
  50% { box-shadow: 0 0 40px rgba(240, 136, 62, 1); }
  100% { box-shadow: 0 0 20px rgba(240, 136, 62, 0.8); }
}
.stats {
  display: flex;
  justify-content: space-around;
  margin-top: 15px;
}
.stat-item {
  text-align: center;
}
.stat-value {
  display: block;
  font-size: 24px;
  font-weight: bold;
  color: #58a6ff;
}
.log {
  background: #0d1117;
  border: 1px solid #21262d;
  border-radius: 6px;
  padding: 15px;
  margin: 15px 0;
  max-height: 250px;
  overflow-y: auto;
  font-size: 12px;
}
.log-entry {
  margin: 3px 0;
  padding: 3px 0;
  border-bottom: 1px solid #21262d;
}
.result {
  background: #0d1117;
  border: 2px solid #f0883e;
  border-radius: 10px;
  padding: 25px;
  margin: 25px 0;
  word-break: break-all;
}
.result.success {
  background: #1c1017;
  border-color: #f0883e;
  color: #f0883e;
  text-align: center;
  padding: 40px;
  font-size: 16px;
}
.address {
  background: #21262d;
  padding: 15px;
  border-radius: 6px;
  margin: 10px 0;
  font-family: monospace;
  word-break: break-all;
}
.private-key, .public-key {
  background: #21262d;
  padding: 15px;
  border-radius: 6px;
  margin: 10px 0;
  font-family: monospace;
  font-size: 12px;
  word-break: break-all;
}
.private-key-wif {
  background: #1c1017;
  border: 2px solid #f0883e;
  padding: 15px;
  border-radius: 6px;
  margin: 10px 0;
  font-family: monospace;
  word-break: break-all;
}
.warning {
  background: #1c1017;
  border: 2px solid #f0883e;
  padding: 20px;
  border-radius: 8px;
  margin: 20px 0;
  text-align: left;
  font-size: 14px;
}
</style>