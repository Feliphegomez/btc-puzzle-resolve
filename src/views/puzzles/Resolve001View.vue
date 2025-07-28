<template>
  <div id="puzzles-resolve-001">
    <div class="container">
      <h1>🔐 Analizador Puzzle BTC 0.2 🔐</h1>
      <div class="section">
        <h3>📍 Información del Puzzle</h3>
        <p><strong>Dirección:</strong> 1KfZGvwZxsvSmemoCmEV75uqcNzYBHjkHZ</p>
        <p><strong>Premio:</strong> 0.2 BTC (~$6,000 USD)</p>
        <p><strong>Estado:</strong> <span style="color: #ff6b35;">NO RESUELTO</span></p>
        <p><strong>Tipo:</strong> <span style="color: #00ff88;">Puzzle Público Legítimo</span></p>
        <div class="hint">✅ Este es un desafío público donde el creador depositó fondos para que alguien los encuentre</div>
      </div>
      <div class="section">
        <h3>🔤 Palabras Candidatas Identificadas</h3>
        <div class="hint">Haz click en las palabras para agregarlas a tu frase semilla:</div>
        <div class="word-list" id="wordList">
          <div v-for="(word, w_i) in candidateWords" :key="w_i" class="word-item" @click="addWordToPhrase(word)">
            {{ word }}
          </div>
        </div>
      </div>
      <div class="phrase-builder">
        <h3>🔨 Constructor de Frase Semilla</h3>
        <div id="currentPhrase">
          <span v-for="(word, wi) in currentPhrase" :key="'word-' + wi" style="margin: 2px 5px; padding: 2px 8px; background: rgba(0,255,136,0.2); border-radius: 3px;">
            {{ wi + 1 }}. {{ word }}
          </span>
        </div>
        <button @click="clearPhrase()">Limpiar</button>
        <button @click="removeLastWord()">Quitar Última</button>
        <button @click="validatePhrase()">Validar Frase</button>
        <button @click="generateVariations()">Generar Variaciones</button>
        <button @click="toggleRandomSearch()" id="randomSearchBtn">🎲 {{ randomSearchActive ? '⏹️ Detener Búsqueda' : 'Iniciar Búsqueda Aleatoria' }}</button>
      </div>
      <div class="search-controls" v-if="!randomSearchActive">
        <h3>⚙️ Configuración de Búsqueda</h3>
        <div class="control-group">
          <label for="performanceSelect">Rendimiento:</label>
          <select id="performanceSelect" v-model="selectedPerformance">
            <option value="low">Bajo (10 intentos/seg)</option>
            <option value="medium">Medio (50 intentos/seg)</option>
            <option value="high">Alto (100 intentos/seg)</option>
            <option value="max">Máximo (Sin límite)</option>
          </select>
        </div>
        <div class="control-group">
          <label for="threadCount">Hilos (Workers):</label>
          <input type="number" id="threadCount" v-model.number="threadCount" min="1" max="16" :disabled="selectedPerformance === 'max'">
        </div>
      </div>
      <div class="search-status" id="searchStatus" :style="{ display: randomSearchActive ? 'block' : 'none' }" :class="{ 'search-active': randomSearchActive, 'solution-found': solutionFound }">
        <h3>🔍 Búsqueda Aleatoria en Progreso</h3>
        <div class="attempt-counter" id="attemptCounter">Intentos: {{ attemptCount.toLocaleString() }}</div>
        <div>Velocidad: <span id="searchSpeed">{{ speed }}</span> intentos/segundo</div>
        <div>Válidas BIP39: <span id="validPhrases">{{ validPhraseCount.toLocaleString() }}</span></div>
        <div>Estado: <span id="searchState" :style="{ color: solutionFound ? '#00ff00' : '#00ff88' }">{{ solutionFound ? '🎯 ¡SOLUCIÓN ENCONTRADA!' : '🔄 Buscando...' }}</span></div>
        <div class="current-attempt" id="currentAttempt" v-html="currentAttemptDisplay"></div>
        <button @click="toggleRandomSearch()" style="background: #dc3545; margin-top: 10px;">⏹️ Detener Búsqueda</button>
      </div>
      <div class="analysis">
        <h3>🔍 Análisis de Pistas</h3>
        <div id="clueAnalysis">
          <h4>Análisis Detallado de Pistas:</h4>
          <div class="coordinates">
            <strong>Coordenadas detectadas:</strong> Texto en el borde derecho sugiere ubicaciones geográficas
          </div>
          <p><strong>Reloj/Tiempo:</strong> 'Moon' y 'Tower' en las manecillas → posible referencia temporal</p>
          <p><strong>Space Needle:</strong> 'Food' → Seattle, posible referencia geográfica</p>
          <p><strong>George Floyd:</strong> 'Breathe' → evento del 25 de mayo de 2020</p>
          <p><strong>Runas Rusas:</strong> Contienen números y referencias a Bitcoin</p>
          <p><strong>Bill's Cipher:</strong> 'Tuesday' → día específico, posible clave temporal</p>
          <p><strong>Texto Latino:</strong> Referencia a "negro" → palabra 'black'</p>
          <p><strong>Patrones Visuales:</strong> Elementos dispuestos geográfica y temporalmente</p>
        </div>
      </div>
      <div class="section">
        <h3>📊 Resultados y Pruebas</h3>
        <div id="results" v-html="resultsHtml"></div>
      </div>
      <div class="section">
        <h3>💡 Pistas Adicionales por Explorar</h3>
        <div class="hint">• Revisar las coordenadas en el borde derecho de la imagen</div>
        <div class="hint">• Analizar los números en la imagen (1865-20?, 05.25.20, 11.03.20)</div>
        <div class="hint">• Buscar patrones en las posiciones de las palabras</div>
        <div class="hint">• Considerar el orden temporal de los eventos mostrados</div>
      </div>
    </div>
  </div>
</template>

<script>
import { BIP32Factory } from 'bip32';
import * as ecc from 'tiny-secp256k1';
import * as bitcoin from 'bitcoinjs-lib';
import * as bip39 from 'bip39';

// Inicializar bitcoinjs-lib con el módulo ECC
const bip32 = BIP32Factory(ecc);

export default {
  name: 'PuzzleResolver',
  data() {
    return {
      // Palabras candidatas basadas en las pistas
      candidateWords: [
        // Palabras confirmadas por pistas
        'moon', 'tower', 'food', 'breathe', 'this', 'subject', 'real', 'black',
        // Palabras del contexto político/social
        'stop', 'brave', 'new', 'world', 'peace', 'justice', 'lives', 'matter',
        // Palabras de las runas y cifrados
        'tuesday', 'sum', 'hope', 'bitcoin', 'rainy', 'day',
        // Palabras adicionales del análisis visual
        'liberty', 'freedom', 'statue', 'needle', 'space', 'seattle',
        'george', 'floyd', 'trump', 'biden', 'election', 'vote',
        // Palabras temporales
        'march', 'may', 'november', 'twenty', 'twenty', 'pandemic',
        // Palabras de surveillance/tech
        'camera', 'watch', 'surveillance', 'privacy',
        // Palabras económicas
        'dollar', 'money', 'crypto', 'digital', 'finance'
      ],
      currentPhrase: [],
      randomSearchActive: false,
      solutionFound: false,
      searchInterval: null,
      speedInterval: null,
      attemptCount: 0,
      validPhraseCount: 0,
      startTime: null,
      lastSpeedUpdate: Date.now(),
      lastAttemptCount: 0,
      speed: 0,
      // Dirección objetivo del puzzle
      TARGET_ADDRESS: '1KfZGvwZxsvSmemoCmEV75uqcNzYBHjkHZ',
      currentAttemptDisplay: 'Preparando búsqueda...',
      resultsHtml: '',
      foundSolutionData: null,
      
      // Nuevas propiedades para configuración de rendimiento
      selectedPerformance: 'medium', // Valor por defecto
      threadCount: 1, // Valor por defecto
    };
  },
  mounted() {
    // this.initializeWordList(); // No es necesario, usamos v-for
    // this.initializeClueAnalysis(); // No es necesario, contenido estático en template
  },
  beforeUnmount() {
    // Limpiar intervalos si el componente se destruye
    if (this.searchInterval) clearInterval(this.searchInterval);
    if (this.speedInterval) clearInterval(this.speedInterval);
  },
  methods: {
    addWordToPhrase(word) {
      if (this.currentPhrase.length < 24) {
        this.currentPhrase.push(word);
        // this.updatePhraseDisplay(); // No es necesario, Vue reactividad
      }
    },
    clearPhrase() {
      this.currentPhrase = [];
      // this.updatePhraseDisplay(); // No es necesario, Vue reactividad
    },
    removeLastWord() {
      this.currentPhrase.pop();
      // this.updatePhraseDisplay(); // No es necesario, Vue reactividad
    },
    checkAllDerivationPaths(mnemonic) {
      try {
        if (!bip39.validateMnemonic(mnemonic)) {
          return { valid: false };
        }
        const seed = bip39.mnemonicToSeedSync(mnemonic);
        const network = bitcoin.networks.bitcoin;
        const root = bip32.fromSeed(seed, network);
        // Paths comunes a probar
        const paths = [
          "m/44'/0'/0'/0/0",   // BIP44 estándar
          "m/0/0",            // Path simple
          "m/0'/0'/0'",       // Variante hardened
          "m/44'/0'/0'",      // BIP44 account level
          "m/1/0",            // Variante
          "m/0",              // Más simple
        ];
        const results = [];
        for (const path of paths) {
          try {
            const child = root.derivePath(path);
            const { address } = bitcoin.payments.p2pkh({ 
              pubkey: child.publicKey, 
              network: network 
            });
            results.push({
              path: path,
              address: address,
              privateKey: child.toWIF(),
              isTarget: address === this.TARGET_ADDRESS
            });
            if (address === this.TARGET_ADDRESS) {
              return { valid: true, found: true, result: results[results.length - 1], allResults: results };
            }
          } catch (pathError) {
            // Continuar con el siguiente path si hay error
            console.error(`Error deriving path ${path}:`, pathError.message);
          }
        }
        return { valid: true, found: false, allResults: results };
      } catch (error) {
        console.error('Error in checkAllDerivationPaths:', error);
        return { valid: false, error: error.message };
      }
    },
    validatePhrase() {
      if (this.currentPhrase.length === 0) {
        this.resultsHtml = '<p style="color: #ff6b35;">No hay palabras en la frase.</p>';
        return;
      }
      const mnemonicString = this.currentPhrase.join(' ');
      let validation = `<h4>Validación de Frase (${this.currentPhrase.length} palabras):</h4>`;
      validation += `<p><strong>Frase actual:</strong> ${mnemonicString}</p>`;
      // Validar con BIP39 real
      const isValidBIP39 = bip39.validateMnemonic(mnemonicString);
      validation += `<p><strong>BIP39 Válida:</strong> ${isValidBIP39 ? '✅ Sí' : '❌ No'}</p>`;
      if (this.currentPhrase.length === 12 || this.currentPhrase.length === 24) {
        validation += '<p style="color: #00ff88;">✓ Longitud válida para frase semilla BIP39</p>';
        if (isValidBIP39) {
          // Generar direcciones reales
          const result = this.checkAllDerivationPaths(mnemonicString);
          if (result.valid) {
            validation += '<h4>Direcciones Generadas:</h4>';
            result.allResults.forEach(addr => {
              const isTarget = addr.address === this.TARGET_ADDRESS;
              validation += `<p style="color: ${isTarget ? '#00ff00' : '#00ff88'};">
                <strong>${addr.path}:</strong> ${addr.address} ${isTarget ? '🎯 ¡OBJETIVO!' : ''}
              </p>`;
              if (isTarget) {
                validation += `<div style="background: rgba(255, 255, 0, 0.2); border: 1px solid #ffff00; border-radius: 5px; padding: 10px; margin: 10px 0;">
                  <strong>🎉 ¡PUZZLE RESUELTO!</strong><br>
                  <strong>Clave Privada:</strong> ${addr.privateKey}
                </div>`;
              }
            });
          }
        } else {
          validation += '<p style="color: #ff6b35;">⚠️ Frase no válida según BIP39. Verifica las palabras.</p>';
        }
      } else {
        validation += '<p style="color: #ff6b35;">✗ Longitud inválida (debe ser 12 o 24 palabras)</p>';
      }
      // Análisis de patrones
      validation += '<h4>Análisis de Patrones:</h4>';
      const wordFrequency = {};
      this.currentPhrase.forEach(word => {
        wordFrequency[word] = (wordFrequency[word] || 0) + 1;
      });
      // eslint-disable-next-line
      const duplicates = Object.entries(wordFrequency).filter(([word, count]) => count > 1);
      if (duplicates.length > 0) {
        validation += `<p style="color: #ff6b35;">⚠️ Palabras duplicadas: ${duplicates.map(([word, count]) => `${word}(${count})`).join(', ')}</p>`;
      }
      this.resultsHtml = validation;
    },
    generateVariations() {
      if (this.currentPhrase.length === 0) {
        this.resultsHtml = '<p style="color: #ff6b35;">No hay palabras para generar variaciones.</p>';
        return;
      }
      let variations = '<h4>Variaciones Sugeridas:</h4>';
      variations += '<p><strong>Orden Temporal Sugerido:</strong></p>';
      variations += '<p>Considera organizar las palabras cronológicamente según los eventos de 2020</p>';
      variations += '<p><strong>Orden Espacial Sugerido:</strong></p>';
      variations += '<p>Considera la disposición geográfica: Costa Este → Costa Oeste</p>';
      variations += '<p><strong>Pruebas Recomendadas:</strong></p>';
      variations += '<ul>';
      variations += '<li>Comenzar con "this" (palabra más repetida)</li>';
      variations += '<li>Incluir "real bitcoin" como secuencia</li>';
      variations += '<li>Terminar con "black" (referencia al dicho latino)</li>';
      variations += '<li>Usar "tuesday" como palabra pivote (día específico)</li>';
      variations += '</ul>';
      this.resultsHtml = variations;
    },
    shuffleArray(array) {
      const newArray = [...array];
      for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
      }
      return newArray;
    },
    generateRandomPhrase() {
      // Crear pools de palabras con diferentes prioridades
      const highPriorityWords = ['moon', 'tower', 'food', 'breathe', 'this', 'subject', 'real', 'black', 'tuesday'];
      const mediumPriorityWords = ['stop', 'brave', 'new', 'world', 'liberty', 'freedom', 'peace', 'justice'];
      const lowPriorityWords = ['bitcoin', 'hope', 'sum', 'rainy', 'day', 'march', 'may', 'november'];
      let selectedWords = [];
      // Siempre incluir algunas palabras de alta prioridad
      const highPriorityCount = Math.floor(Math.random() * 4) + 4; // 4-7 palabras
      const shuffledHigh = this.shuffleArray(highPriorityWords);
      selectedWords = [...shuffledHigh.slice(0, highPriorityCount)];
      // Completar con palabras de prioridad media y baja
      const remainingSlots = 12 - selectedWords.length;
      const allOtherWords = this.shuffleArray([...mediumPriorityWords, ...lowPriorityWords]);
      selectedWords = [...selectedWords, ...allOtherWords.slice(0, remainingSlots)];
      // Mezclar el orden final
      return this.shuffleArray(selectedWords);
    },
    toggleRandomSearch() {
      if (!this.randomSearchActive) {
        this.startRandomSearch();
      } else {
        this.stopRandomSearch();
      }
    },
    startRandomSearch() {
      this.randomSearchActive = true;
      this.solutionFound = false;
      this.attemptCount = 0;
      this.validPhraseCount = 0;
      this.startTime = Date.now();
      this.lastSpeedUpdate = Date.now();
      this.lastAttemptCount = 0;
      this.currentAttemptDisplay = 'Preparando búsqueda...';
      this.resultsHtml = '<p style="color: #888;">Iniciando búsqueda...</p>';
      
      console.log('🚀 Búsqueda iniciada:', new Date().toLocaleTimeString());
      
      // Determinar el intervalo basado en la configuración de rendimiento
      let intervalMs;
      switch(this.selectedPerformance) {
        case 'low':
          intervalMs = 100; // 10 intentos/seg
          break;
        case 'medium':
          intervalMs = 20; // 50 intentos/seg
          break;
        case 'high':
          intervalMs = 10; // 100 intentos/seg
          break;
        case 'max':
        default:
          intervalMs = 1; // Máxima velocidad
          break;
      }
      
      this.searchInterval = setInterval(this.performRandomAttempt, intervalMs);
      
      // Actualizar velocidad cada segundo
      this.speedInterval = setInterval(() => {
        if (!this.randomSearchActive) {
          return;
        }
        this.updateSearchSpeed();
      }, 1000);
    },
    stopRandomSearch() {
      console.log('🛑 Deteniendo búsqueda...');
      this.randomSearchActive = false;
      if (this.searchInterval) {
        clearInterval(this.searchInterval);
        this.searchInterval = null;
      }
      if (this.speedInterval) {
        clearInterval(this.speedInterval);
        this.speedInterval = null;
      }
      console.log(`📊 Búsqueda detenida. Total intentos: ${this.attemptCount}, Válidas BIP39: ${this.validPhraseCount}`);
    },
    performRandomAttempt() {
      if (!this.randomSearchActive || this.solutionFound) return;
      
      this.attemptCount++;
      const randomPhrase = this.generateRandomPhrase();
      const mnemonicString = randomPhrase.join(' ');
      
      // Log en consola cada 1000 intentos para debug
      if (this.attemptCount % 1000 === 0) {
        console.log(`💫 Intento ${this.attemptCount}: ${mnemonicString.substring(0, 30)}...`);
      }
      
      // Generar direcciones reales usando múltiples paths de derivación
      const result = this.checkAllDerivationPaths(mnemonicString);
      
      if (result.valid) {
        this.validPhraseCount++;
        // Log frases válidas en consola
        if (this.validPhraseCount % 10 === 0) {
          console.log(`✅ Frase BIP39 válida #${this.validPhraseCount}: ${mnemonicString}`);
        }
      }
      
      // Actualizar interfaz
      let displayInfo = `<strong>Frase:</strong> ${mnemonicString}<br>`;
      displayInfo += `<strong>BIP39 Válida:</strong> ${result.valid ? '✅' : '❌'}<br>`;
      if (result.valid && result.allResults && result.allResults.length > 0) {
        displayInfo += `<strong>Direcciones generadas:</strong><br>`;
        result.allResults.slice(0, 2).forEach(res => {
          const isMatch = res.address === this.TARGET_ADDRESS;
          displayInfo += `&nbsp;&nbsp;${res.path}: ${res.address} ${isMatch ? '🎯' : ''}<br>`;
        });
        if (result.allResults.length > 2) {
          displayInfo += `&nbsp;&nbsp;... y ${result.allResults.length - 2} más<br>`;
        }
      }
      displayInfo += `<strong>Objetivo:</strong> ${this.TARGET_ADDRESS}`;
      this.currentAttemptDisplay = displayInfo;
      
      // CRÍTICO: Verificar si encontramos la solución
      if (result.found) {
        console.log('🎉 ¡SOLUCIÓN ENCONTRADA!', result.result);
        this.foundSolution(randomPhrase, result.result);
        return;
      }
    },
    updateSearchSpeed() {
      if (!this.randomSearchActive) return;
      const now = Date.now();
      const timeDiff = (now - this.lastSpeedUpdate) / 1000;
      const attemptDiff = this.attemptCount - this.lastAttemptCount;
      this.speed = Math.round(attemptDiff / timeDiff);
      this.lastSpeedUpdate = now;
      this.lastAttemptCount = this.attemptCount;
    },
    foundSolution(phrase, result) {
      // DETENER BÚSQUEDA INMEDIATAMENTE
      this.solutionFound = true;
      this.randomSearchActive = false;
      if (this.searchInterval) {
        clearInterval(this.searchInterval);
        this.searchInterval = null;
      }
      if (this.speedInterval) {
        clearInterval(this.speedInterval);
        this.speedInterval = null;
      }
      
      // Guardar datos de la solución
      this.foundSolutionData = { phrase, result };
      
      // Mostrar resultados completos
      this.resultsHtml = `
        <div style="background: rgba(0, 255, 0, 0.3); border: 3px solid #00ff00; border-radius: 15px; padding: 25px; text-align: center; animation: victory 1s infinite;">
          <h1 style="color: #00ff00; font-size: 32px; margin: 0 0 20px 0;">🎉 ¡PUZZLE RESUELTO! 🎉</h1>
          <div style="background: rgba(0,0,0,0.8); border-radius: 10px; padding: 20px; margin: 15px 0; text-align: left;">
            <h3 style="color: #00ff88; margin-top: 0;">📝 Información de la Solución:</h3>
            <p><strong>Frase Semilla:</strong></p>
            <div style="background: rgba(255,255,255,0.1); padding: 10px; border-radius: 5px; font-family: monospace; font-size: 16px; word-break: break-all; margin: 5px 0;">
              ${phrase.join(' ')}
            </div>
            <p><strong>Dirección Bitcoin:</strong></p>
            <div style="background: rgba(255,255,255,0.1); padding: 10px; border-radius: 5px; font-family: monospace; font-size: 14px; word-break: break-all; margin: 5px 0;">
              ${result.address}
            </div>
            <p><strong>Path de Derivación:</strong> ${result.path}</p>
            <p><strong>Clave Privada (WIF):</strong></p>
            <div style="background: rgba(255,255,0,0.2); border: 2px solid #ffff00; padding: 10px; border-radius: 5px; font-family: monospace; font-size: 14px; word-break: break-all; margin: 5px 0;">
              ${result.privateKey}
            </div>
          </div>
          <div style="background: rgba(255, 165, 0, 0.2); border: 2px solid #ffa500; border-radius: 10px; padding: 15px; margin: 15px 0;">
            <h3 style="color: #ffa500; margin-top: 0;">⚠️ INSTRUCCIONES IMPORTANTES:</h3>
            <ol style="text-align: left; color: #ffffff;">
              <li><strong>GUARDA ESTA INFORMACIÓN INMEDIATAMENTE</strong> en un lugar seguro</li>
              <li>Abre una wallet Bitcoin (Electrum, Bitcoin Core, etc.)</li>
              <li>Importa la clave privada WIF</li>
              <li>Transfiere los 0.2 BTC a tu dirección personal</li>
              <li>¡FELICIDADES por resolver el puzzle!</li>
            </ol>
          </div>
          <div style="font-size: 18px; margin: 20px 0;">
            <p><strong>Estadísticas:</strong></p>
            <p>Intentos Totales: ${this.attemptCount.toLocaleString()}</p>
            <p>Frases BIP39 Válidas: ${this.validPhraseCount.toLocaleString()}</p>
            <p>Tiempo Transcurrido: ${Math.round((Date.now() - this.startTime) / 1000)} segundos</p>
          </div>
        </div>
      `;
      
      // Actualizar frase actual en el builder
      this.currentPhrase = [...phrase];
      
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
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
      } catch (e) {
        console.log('No se pudo reproducir sonido:', e);
      }
    }
  }
};
</script>

<style scoped>
#puzzles-resolve-001 {
  font-family: 'Courier New', monospace;
  background: linear-gradient(135deg, #1a1a2e, #16213e);
  color: #00ff88;
  margin: 0;
  padding: 20px;
  min-height: 100vh;
}
.container {
  max-width: 1200px;
  margin: 0 auto;
  background: rgba(0, 0, 0, 0.8);
  border: 2px solid #00ff88;
  border-radius: 15px;
  padding: 20px;
  box-shadow: 0 0 30px rgba(0, 255, 136, 0.3);
}
h1 {
  text-align: center;
  color: #ff6b35;
  text-shadow: 0 0 10px rgba(255, 107, 53, 0.5);
  margin-bottom: 30px;
}
.section {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid #333;
  border-radius: 10px;
  padding: 15px;
  margin: 15px 0;
}
.section h3 {
  color: #ff6b35;
  margin-top: 0;
}
.search-status {
  background: rgba(0, 100, 255, 0.1);
  border: 2px solid #0066ff;
  border-radius: 10px;
  padding: 15px;
  margin: 10px 0;
  text-align: center;
}
.search-active {
  animation: pulse 2s infinite;
}
.solution-found {
  background: rgba(0, 255, 0, 0.3) !important;
  border: 3px solid #00ff00 !important;
  animation: victory 1s infinite;
}
@keyframes pulse {
  0% { box-shadow: 0 0 10px rgba(0, 102, 255, 0.3); }
  50% { box-shadow: 0 0 20px rgba(0, 102, 255, 0.8); }
  100% { box-shadow: 0 0 10px rgba(0, 102, 255, 0.3); }
}
@keyframes victory {
  0% { box-shadow: 0 0 20px rgba(0, 255, 0, 0.8); }
  50% { box-shadow: 0 0 40px rgba(0, 255, 0, 1); }
  100% { box-shadow: 0 0 20px rgba(0, 255, 0, 0.8); }
}
.attempt-counter {
  font-size: 24px;
  font-weight: bold;
  color: #00ff88;
  margin: 10px 0;
}
.current-attempt {
  background: rgba(0, 0, 0, 0.5);
  border: 1px solid #666;
  border-radius: 5px;
  padding: 10px;
  margin: 10px 0;
  font-family: monospace;
  word-break: break-all;
}
.word-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 10px;
  margin: 10px 0;
}
.word-item {
  background: rgba(0, 255, 136, 0.1);
  border: 1px solid #00ff88;
  border-radius: 5px;
  padding: 8px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
}
.word-item:hover {
  background: rgba(0, 255, 136, 0.2);
  transform: scale(1.05);
}
.word-item.selected {
  background: rgba(255, 107, 53, 0.3);
  border-color: #ff6b35;
}
.phrase-builder {
  background: rgba(255, 107, 53, 0.1);
  border: 2px solid #ff6b35;
  border-radius: 10px;
  padding: 15px;
  margin: 20px 0;
}
#currentPhrase {
  background: rgba(0, 0, 0, 0.5);
  border: 1px solid #666;
  border-radius: 5px;
  padding: 10px;
  margin: 10px 0;
  min-height: 50px;
  font-size: 16px;
  color: #00ff88;
}
button {
  background: linear-gradient(45deg, #ff6b35, #f7931e);
  border: none;
  border-radius: 8px;
  padding: 10px 20px;
  color: white;
  font-weight: bold;
  cursor: pointer;
  margin: 5px;
  transition: all 0.3s ease;
}
button:hover {
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(255, 107, 53, 0.4);
}
button:disabled {
  background: #666;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}
.analysis {
  background: rgba(0, 100, 255, 0.1);
  border: 1px solid #0066ff;
  border-radius: 10px;
  padding: 15px;
  margin: 15px 0;
}
.hint {
  background: rgba(255, 255, 0, 0.1);
  border-left: 4px solid #ffff00;
  padding: 10px;
  margin: 10px 0;
  font-style: italic;
}
#results {
  background: rgba(0, 0, 0, 0.7);
  border: 1px solid #666;
  border-radius: 5px;
  padding: 10px;
  margin: 10px 0;
  max-height: 400px;
  overflow-y: auto;
  font-size: 14px;
}
.coordinates {
  font-size: 12px;
  color: #888;
  margin: 5px 0;
}

/* Nuevos estilos para los controles de búsqueda */
.search-controls {
  background: rgba(100, 0, 255, 0.1);
  border: 2px solid #6600ff;
  border-radius: 10px;
  padding: 15px;
  margin: 20px 0;
}
.search-controls h3 {
  color: #6600ff;
  margin-top: 0;
}
.control-group {
  margin: 10px 0;
}
.control-group label {
  display: inline-block;
  width: 150px;
  color: #00ff88;
}
.control-group select,
.control-group input {
  background: rgba(0, 0, 0, 0.5);
  border: 1px solid #666;
  border-radius: 5px;
  padding: 5px;
  color: #00ff88;
  font-family: 'Courier New', monospace;
}
</style>