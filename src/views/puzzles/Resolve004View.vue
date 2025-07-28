<template>
  <div id="puzzleResolver">
    <h1>🧩 Puzzle BTC Resolver (Búsqueda por Rango de Clave Privada)</h1>
    
    <div class="info-box">
      <h3>🎯 Objetivo</h3>
      <p><strong>Dirección:</strong> {{ targetAddress }}</p>
      <p><strong>Premio:</strong> 0.2 BTC</p>
    </div>

    <div class="search-controls">
      <h3>🔍 Configuración de Búsqueda por Rango</h3>
      
      <div class="input-group">
        <label for="startRange">Inicio del Rango (hex):</label>
        <input 
          type="text" 
          id="startRange" 
          v-model="startRange" 
          placeholder="Ej: 01" 
          @input="formatHexInput('startRange')"
        >
      </div>
      
      <div class="input-group">
        <label for="endRange">Fin del Rango (hex):</label>
        <input 
          type="text" 
          id="endRange" 
          v-model="endRange" 
          placeholder="Ej: ff" 
          @input="formatHexInput('endRange')"
        >
      </div>
      
      <div class="input-group">
        <label for="targetAddress">Dirección Objetivo:</label>
        <input 
          type="text" 
          id="targetAddress" 
          v-model="targetAddress" 
          placeholder="Dirección Bitcoin objetivo"
        >
      </div>

      <div class="input-group">
        <label for="speedMode">Velocidad de Búsqueda:</label>
        <select id="speedMode" v-model="speedMode" :disabled="isSearching">
          <option value="slow">🐌 Lenta (100ms delay) - Menor uso de CPU</option>
          <option value="normal">⚡ Normal (10ms delay) - Balanceado</option>
          <option value="fast">🚀 Rápida (1ms delay) - Mayor rendimiento</option>
          <option value="turbo">💨 Turbo (sin delay) - Máximo rendimiento</option>
        </select>
      </div>

      <div class="input-group">
        <label for="batchSize">Claves por lote:</label>
        <select id="batchSize" v-model="batchSize" :disabled="isSearching">
          <option value="1">1 clave por ciclo (más estable)</option>
          <option value="10">10 claves por ciclo (balanceado)</option>
          <option value="50">50 claves por ciclo (más rápido)</option>
          <option value="100">100 claves por ciclo (máxima velocidad)</option>
        </select>
      </div>
      
      <button @click="startSearch" :disabled="isSearching || !isValidRange">
        {{ isSearching ? '⏹ Detener Búsqueda' : '▶ Iniciar Búsqueda' }}
      </button>
      
      <button @click="pauseSearch" :disabled="!isSearching">
        ⏸ Pausar
      </button>
      
      <button @click="resumeSearch" :disabled="isSearching || !isPaused">
        ▶ Reanudar
      </button>
    </div>

    <div class="status" v-if="isSearching || isPaused">
      <h3>📊 Estado de la Búsqueda</h3>
      <div class="stats">
        <div class="stat-item">
          <span class="stat-value">{{ attemptCount.toLocaleString() }}</span>
          <div>Claves Probadas</div>
        </div>
        <div class="stat-item">
          <span class="stat-value">{{ speed.toLocaleString() }}</span>
          <div>Claves/seg</div>
        </div>
        <div class="stat-item">
          <span class="stat-value">{{ formatTime(elapsedTime) }}</span>
          <div>Tiempo</div>
        </div>
        <div class="stat-item">
          <span class="stat-value">{{ formatPercentage(progress) }}</span>
          <div>Progreso</div>
        </div>
      </div>
      <div class="speed-info">
        <p><strong>Configuración:</strong> {{ getSpeedDescription() }}</p>
      </div>
    </div>

    <div class="current-info" v-if="currentKeyHex">
      <h3>🔍 Clave Actual</h3>
      <p><strong>Hex:</strong> {{ currentKeyHex }}</p>
      <p><strong>Dirección:</strong> {{ currentAddress || 'Generando...' }}</p>
      <p><strong>Resultado:</strong> 
        <span :style="{ color: isTargetAddress ? '#00ff00' : '#ff6b35' }">
          {{ isTargetAddress ? '🎯 ¡COINCIDE!' : '❌ No coincide' }}
        </span>
      </p>
    </div>

    <div class="log" id="log">
      <h3>📝 Registro de Actividad</h3>
      <div 
        v-for="(entry, index) in logEntries" 
        :key="index" 
        class="log-entry"
        :class="{ 'log-highlight': entry.includes('🎯') || entry.includes('🎉') || entry.includes('❌') }"
      >
        {{ entry }}
      </div>
    </div>

    <div v-if="solutionFound" class="solution-found" v-html="solutionHtml"></div>
  </div>
</template>

<script>
// Importaciones directas (como en tu package.json)
import * as bitcoin from 'bitcoinjs-lib';
import * as ecc from 'tiny-secp256k1';
import { ECPairFactory } from 'ecpair';
import { Buffer } from 'buffer';

// Crear fábrica de ECPair con tiny-secp256k1
const ECPair = ECPairFactory(ecc);

// Inicializar bitcoinjs-lib con ecc
bitcoin.initEccLib(ecc);

export default {
  name: 'PuzzleResolver',
  data() {
    return {
      // Configuración de búsqueda
      startRange: localStorage.getItem('lastTargetAddress') ?? '0000000000000000000000000000000000000000000000000000000000000000',
      endRange:   'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
      targetAddress: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa', // SNK
      // targetAddress: '1ky1ThLyCbEJRDrEWnyip9x5GchMtw2ac',
    //   targetAddress: '1KfZGvwZxsvSmemoCmEV75uqcNzYBHjkHZ',
      
      // Configuración de velocidad
      speedMode: 'normal',
      batchSize: 50,
      
      // Estado de búsqueda
      isSearching: false,
      isPaused: false,
      solutionFound: false,
      
      // Contadores y estadísticas
      attemptCount: 0,
      speed: 0,
      startTime: null,
      elapsedTime: 0,
      lastSpeedUpdate: Date.now(),
      lastAttemptCount: 0,
      progress: 0,
      
      // Valores actuales
      currentKey: null,
      currentKeyHex: '',
      currentAddress: '',
      isTargetAddress: false,
      
      // Límites del rango
      startKey: null,
      endKey: null,
      
      // Intervalos
      searchInterval: null,
      speedInterval: null,
      
      // Registro
      logEntries: [],
      
      // Dirección objetivo
      TARGET_ADDRESS: '1LagHJk2FyCV2VzrNHVqg3gYG4TSYwDV4m',
      
      // Resultado de solución
      solutionHtml: ''
    };
  },

  watch: {
    startRange(a, b) {
        if (a !== b) {
            // console.log(a,b)
            localStorage.setItem('lastTargetAddress', a.padStart(64, '0'))
        }
    }
  },
  
  computed: {
    isValidRange() {
      if (!this.startRange || !this.endRange) return false;
      try {
        const start = this.hexToBigInt(this.startRange);
        const end = this.hexToBigInt(this.endRange);
        return start <= end;
      } catch (e) {
        return false;
      }
    },
    // startRange() {
    //     return localStorage.getItem('lastTargetAddress') ?? '0000000000000000000000000000000000000000000000000000000000000000';
    // },
  },
  
  mounted() {
    // Inicializar con la dirección objetivo por defecto
    // this.targetAddress = this.TARGET_ADDRESS;
    // [
    //   '1BgGZ9tcN4rm9KBzDn7KprQz87SZ26SAMH',
    //   '1cMh228HTCiwS8ZsaakH8A8wze1JR5ZsP',
    //   '1CUNEBjYrCn2y1SdiUMohaKUi4wpP326Lb',
    //   '1LagHJk2FyCV2VzrNHVqg3gYG4TSYwDV4m',
    // ]
    
    // Verificar que las bibliotecas estén disponibles
    this.addLog('✅ Bibliotecas cargadas correctamente');
  },
  
  beforeUnmount() {
    // Limpiar intervalos si el componente se destruye
    if (this.searchInterval) clearInterval(this.searchInterval);
    if (this.speedInterval) clearInterval(this.speedInterval);
  },
  
  methods: {
    getSearchDelay() {
      switch (this.speedMode) {
        case 'slow': return 100;
        case 'normal': return 10;
        case 'fast': return 1;
        case 'turbo': return 0;
        default: return 10;
      }
    },

    getSpeedDescription() {
      const delays = { slow: '100ms', normal: '10ms', fast: '1ms', turbo: '0ms' };
      return `${this.speedMode.toUpperCase()} - ${delays[this.speedMode]} delay, ${this.batchSize} claves por lote`;
    },

    formatHexInput(field) {
      // Asegurar que solo contenga caracteres hexadecimales
      if (field === 'startRange') {
        this.startRange = this.startRange.replace(/[^0-9a-fA-F]/g, '').toLowerCase();
      } else if (field === 'endRange') {
        this.endRange = this.endRange.replace(/[^0-9a-fA-F]/g, '').toLowerCase();
      }
    },
    
    hexToBigInt(hex) {
      if (!hex) return 0n;
      return BigInt('0x' + hex);
    },
    
    bigIntToHex(num) {
      return num.toString(16);
    },
    
    formatTime(seconds) {
      const hrs = Math.floor(seconds / 3600);
      const mins = Math.floor((seconds % 3600) / 60);
      const secs = seconds % 60;
      
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    },
    
    formatPercentage(progress) {
      return (progress * 100).toFixed(4) + '%';
    },
    
    addLog(message) {
      const timestamp = new Date().toLocaleTimeString();
      this.logEntries.push(`[${timestamp}] ${message}`);
      
      // Mantener solo las últimas 100 entradas
      if (this.logEntries.length > 100) {
        this.logEntries.shift();
      }
      
      // Hacer scroll al final
      this.$nextTick(() => {
        const logElement = document.getElementById('log');
        if (logElement) {
          logElement.scrollTop = logElement.scrollHeight;
        }
      });
    },
    
    generateAddressFromPrivateKey(privateKeyHex) {
      try {
        // Asegurar longitud de 64 caracteres (32 bytes) para la clave privada
        const paddedHex = privateKeyHex.padStart(64, '0');
        
        // Validar rango de clave privada
        const privateKeyBigInt = BigInt('0x' + paddedHex);
        const n = BigInt('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141');
        if (privateKeyBigInt <= 0n || privateKeyBigInt >= n) {
          throw new Error('Clave privada fuera de rango válido');
        }
        
        // Crear buffer de clave privada
        const privateKeyBuffer = Buffer.from(paddedHex, 'hex');
        
        // Crear par de claves usando ECPairFactory
        const keyPair = ECPair.fromPrivateKey(privateKeyBuffer);
        
        // SOLUCIÓN: Generar dirección usando bitcoin.crypto.hash160 y bitcoin.address.toBase58Check
        // En lugar de usar bitcoin.payments.p2pkh que espera un objeto point
        
        // Obtener clave pública comprimida
        const publicKey = keyPair.publicKey;
        
        // Generar hash160 de la clave pública
        const hash160 = bitcoin.crypto.hash160(publicKey);
        
        // Crear dirección P2PKH usando toBase58Check
        const address = bitcoin.address.toBase58Check(hash160, bitcoin.networks.bitcoin.pubKeyHash);
        
        // Obtener clave privada en formato WIF
        const wif = keyPair.toWIF();
        
        return {
          address: address,
          privateKey: wif,
          privateKeyHex: paddedHex
        };
      } catch (error) {
        console.error('Error generando dirección:', error);
        this.addLog(`❌ Error generando dirección para clave ${privateKeyHex}: ${error.message}`);
        return null;
      }
    },
    
    updateSearchSpeed() {
      if (!this.isSearching) return;
      
      const now = Date.now();
      const timeDiff = (now - this.lastSpeedUpdate) / 1000; // segundos
      const attemptDiff = this.attemptCount - this.lastAttemptCount;
      
      this.speed = Math.round(attemptDiff / timeDiff);
      this.lastSpeedUpdate = now;
      this.lastAttemptCount = this.attemptCount;
      
      // Actualizar tiempo transcurrido
      this.elapsedTime = Math.floor((now - this.startTime) / 1000);
    },
    
    startSearch() {
    if (this.isPaused) this.stopSearch();
      if (this.isSearching) {
        this.stopSearch();
        return;
      }
      
      // Validar rango
      if (!this.isValidRange) {
        this.addLog('❌ Rango inválido. Asegúrate de que el inicio sea menor o igual al fin.');
        return;
      }
      
      // Convertir rangos a BigInt
      this.startKey = this.hexToBigInt(this.startRange);
      this.endKey = this.hexToBigInt(this.endRange);
      
      // Validar que el rango no sea demasiado grande
      const rangeSize = this.endKey - this.startKey;
      if (rangeSize > 1000000n) { // Limitar a 1 millón de claves por seguridad
        if (!confirm('El rango es muy grande. ¿Continuar de todos modos?')) {
          return;
        }
      }
      
      // Inicializar búsqueda
      this.currentKey = this.startKey;
      this.attemptCount = 0;
      this.solutionFound = false;
      this.isSearching = true;
      this.isPaused = false;
      this.startTime = Date.now();
      this.lastSpeedUpdate = Date.now();
      this.lastAttemptCount = 0;
      this.speed = 0;
      this.elapsedTime = 0;
      
      this.addLog(`▶ Iniciando búsqueda en rango: ${this.startRange} - ${this.endRange}`);
      this.addLog(`⚙️ Configuración: ${this.getSpeedDescription()}`);
      
      // Iniciar intervalos con velocidad configurada
      const delay = this.getSearchDelay();
      this.searchInterval = setInterval(() => {
        if (this.isPaused) return;
        this.searchStep();
      }, delay);
      
      this.speedInterval = setInterval(() => {
        this.updateSearchSpeed();
      }, 1000); // Actualizar velocidad cada segundo
    },
    
    pauseSearch() {
      this.isPaused = true;
      this.isSearching = false;
      this.addLog('⏸ Búsqueda pausada');
    },
    
    resumeSearch() {
      this.isSearching = true;
      this.isPaused = false;
      this.addLog('▶ Búsqueda reanudada');
    },
    
    stopSearch() {
      this.isSearching = false;
      this.isPaused = false;
      
      if (this.searchInterval) {
        clearInterval(this.searchInterval);
        this.searchInterval = null;
      }
      
      if (this.speedInterval) {
        clearInterval(this.speedInterval);
        this.speedInterval = null;
      }
      
      this.updateSearchSpeed(); // Actualizar velocidad final
      this.addLog('⏹ Búsqueda detenida');
    },
    
    searchStep() {
      if (!this.isSearching || this.isPaused || this.solutionFound) return;
      
      // Procesar múltiples claves según el batchSize configurado
      const batchCount = parseInt(this.batchSize);
      
      for (let i = 0; i < batchCount; i++) {
        // Verificar si hemos llegado al final del rango
        if (this.currentKey > this.endKey) {
          this.addLog('🏁 Fin del rango alcanzado. Búsqueda completada.');
          this.stopSearch();
          return;
        }
        
        // Incrementar contador
        this.attemptCount++;
        
        // Convertir clave actual a hex
        this.currentKeyHex = this.bigIntToHex(this.currentKey);
        
        // Generar dirección desde la clave privada
        const walletInfo = this.generateAddressFromPrivateKey(this.currentKeyHex);
        
        if (walletInfo) {
          this.currentAddress = walletInfo.address;
          this.isTargetAddress = walletInfo.address === this.targetAddress;
          
          // Mostrar información en el registro periódicamente
          if (this.attemptCount % 1000 === 0 || this.attemptCount <= 10) {
            this.addLog(`🔍 Clave ${this.attemptCount}: ${this.currentKeyHex.padStart(64, '0').slice(-16)} → ${walletInfo.address.slice(0, 15)}...`);
            localStorage.setItem('lastTargetAddress', this.currentKeyHex.padStart(64, '0'))
          }
          
          // Verificar si encontramos la dirección objetivo
          if (this.isTargetAddress) {
            this.foundSolution(walletInfo);
            return;
          }
        } else {
          this.addLog(`❌ Error generando wallet para clave: ${this.currentKeyHex}`);
        }
        
        // Pasar a la siguiente clave
        this.currentKey++;
      }
      
      // Actualizar progreso después del lote
      const totalRange = Number(this.endKey - this.startKey);
      const currentProgress = Number(this.currentKey - this.startKey);
      this.progress = totalRange > 0 ? currentProgress / totalRange : 0;
    },
    
    foundSolution(walletInfo) {
      // DETENER BÚSQUEDA INMEDIATAMENTE
      this.solutionFound = true;
      this.stopSearch();
      
      this.addLog(`🎉 ¡SOLUCIÓN ENCONTRADA! 🎉`);
      
      // Preparar HTML de solución
      this.solutionHtml = `
        <div style="background: rgba(0, 255, 0, 0.3); border: 3px solid #00ff00; border-radius: 15px; padding: 25px; text-align: center; animation: victory 1s infinite;">
          <h1 style="color: #00ff00; font-size: 32px; margin: 0 0 20px 0;">🎉 ¡PUZZLE RESUELTO! 🎉</h1>
          <div style="background: rgba(0,0,0,0.8); border-radius: 10px; padding: 20px; margin: 15px 0; text-align: left;">
            <h3 style="color: #00ff88; margin-top: 0;">📝 Información de la Solución:</h3>
            <p><strong>Clave Privada (Hex):</strong></p>
            <div style="background: rgba(255,255,255,0.1); padding: 10px; border-radius: 5px; font-family: monospace; font-size: 16px; word-break: break-all; margin: 5px 0;">
              ${walletInfo.privateKeyHex}
            </div>
            <p><strong>Clave Privada (WIF):</strong></p>
            <div style="background: rgba(255,255,255,0.1); padding: 10px; border-radius: 5px; font-family: monospace; font-size: 16px; word-break: break-all; margin: 5px 0;">
              ${walletInfo.privateKey}
            </div>
            <p><strong>Dirección Bitcoin:</strong></p>
            <div style="background: rgba(255,255,255,0.1); padding: 10px; border-radius: 5px; font-family: monospace; font-size: 16px; word-break: break-all; margin: 5px 0;">
              ${walletInfo.address}
            </div>
            <div style="font-size: 18px; margin: 20px 0;">
              <p><strong>Estadísticas:</strong></p>
              <p>Claves Probadas: ${this.attemptCount.toLocaleString()}</p>
              <p>Tiempo Transcurrido: ${this.formatTime(this.elapsedTime)}</p>
            </div>
          </div>
        </div>
      `;
      
      // Intentar reproducir sonido de victoria (opcional)
      this.playVictorySound();
    },
    
    playVictorySound() {
      try {
        // Crear un sonido simple usando Web Audio API
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        oscillator.frequency.setValueAtTime(1000, audioContext.currentTime + 0.1);
        oscillator.frequency.setValueAtTime(1200, audioContext.currentTime + 0.2);
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
      } catch (e) {
        // Silenciar errores de audio
        console.log("No se pudo reproducir el sonido de victoria");
      }
    }
  }
};
</script>

<style scoped>
#puzzleResolver {
  max-width: 900px;
  margin: 0 auto;
  padding: 20px;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background: #1a1a1a;
  color: #e0e0e0;
  border-radius: 15px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
}

h1 {
  text-align: center;
  color: #00ff88;
  margin-bottom: 30px;
  text-shadow: 0 0 10px rgba(0, 255, 136, 0.3);
}

h3 {
  color: #00ff88;
  margin-top: 0;
}

.info-box {
  background: rgba(0, 0, 0, 0.5);
  border: 1px solid #00ff88;
  border-radius: 10px;
  padding: 15px;
  margin: 20px 0;
}

.search-controls {
  background: rgba(30, 30, 30, 0.8);
  border-radius: 10px;
  padding: 20px;
  margin: 20px 0;
}

.input-group {
  margin-bottom: 15px;
}

.input-group label {
  display: block;
  margin-bottom: 5px;
  color: #aaa;
}

.input-group input, .input-group select {
  width: 100%;
  padding: 10px;
  border-radius: 5px;
  border: 1px solid #444;
  background: #222;
  color: #fff;
  font-family: inherit;
}

.input-group input {
  font-family: monospace;
}

button {
  background: linear-gradient(45deg, #ff6b35, #f7931e);
  border: none;
  border-radius: 8px;
  padding: 12px 20px;
  color: white;
  font-weight: bold;
  cursor: pointer;
  margin: 5px;
  transition: all 0.3s ease;
}

button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(255, 107, 53, 0.4);
}

button:disabled {
  background: #666;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.status {
  background: rgba(0, 0, 0, 0.5);
  border-radius: 10px;
  padding: 15px;
  margin: 20px 0;
}

.stats {
  display: flex;
  justify-content: space-around;
  flex-wrap: wrap;
}

.stat-item {
  text-align: center;
  margin: 10px;
}

.stat-value {
  display: block;
  font-size: 24px;
  font-weight: bold;
  color: #00ff88;
}

.speed-info {
  text-align: center;
  margin-top: 15px;
  padding: 10px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 5px;
  font-size: 14px;
}

.current-info {
  background: rgba(0, 0, 0, 0.5);
  border: 1px solid #666;
  border-radius: 5px;
  padding: 15px;
  margin: 15px 0;
  font-family: monospace;
}

.log {
  background: rgba(0, 0, 0, 0.7);
  border: 1px solid #444;
  border-radius: 8px;
  padding: 15px;
  height: 300px;
  overflow-y: auto;
  font-family: monospace;
  font-size: 14px;
}

.log-entry {
  padding: 5px 0;
  border-bottom: 1px solid #333;
}

.log-highlight {
  color: #00ff00;
  font-weight: bold;
}

.solution-found {
  margin: 20px 0;
}

@keyframes victory {
  0% { box-shadow: 0 0 5px #00ff00; }
  50% { box-shadow: 0 0 20px #00ff00; }
  100% { box-shadow: 0 0 5px #00ff00; }
}
</style>