/**
 * AEGIS SECURITY - Odd-One-Out Visual CAPTCHA Engine
 * Clean, simple user-facing language with semantic anomaly generation and kinematics tracking.
 */

import { TelemetryRecorder } from './telemetry.js';
import { BotDetector } from './bot-detector.js';

// Semantic sibling pairings for challenging visual anomalies
export const SEMANTIC_PAIRS = [
    { dominant: 'fruit', intruder: 'flower' },
    { dominant: 'flower', intruder: 'fruit' },
    { dominant: 'cat', intruder: 'dog' },
    { dominant: 'dog', intruder: 'cat' },
    { dominant: 'car', intruder: 'motorbike' },
    { dominant: 'motorbike', intruder: 'car' },
    { dominant: 'airplane', intruder: 'car' },
    { dominant: 'person', intruder: 'dog' }
];

export class CaptchaEngine {
    constructor(options = {}) {
        this.manifestUrl = options.manifestUrl || 'dataset-manifest.json';
        this.gridSize = options.gridSize || 9; // 9 for 3x3, 4 for 2x2
        this.difficulty = options.difficulty || 'hard'; // 'standard', 'hard', 'expert'
        this.camouflage = options.camouflage !== undefined ? options.camouflage : true;
        this.manifest = null;
        this.currentChallenge = null;
        this.telemetryRecorder = new TelemetryRecorder();
        this.onVerifiedCallback = null;
        this.onFailedCallback = null;
        this.onChallengeLoadedCallback = null;
        this.containerElement = null;
    }

    /**
     * Initializes dataset manifest.
     */
    async init() {
        if (!this.manifest) {
            try {
                const response = await fetch(this.manifestUrl);
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                this.manifest = await response.json();
            } catch (err) {
                console.warn('Using fallback manifest structure:', err);
                this.manifest = this._getFallbackManifest();
            }
        }
        return this.manifest;
    }

    _getFallbackManifest() {
        const categories = ['airplane', 'car', 'cat', 'dog', 'flower', 'fruit', 'motorbike', 'person'];
        const manifest = { totalCategories: categories.length, totalImages: 6899, categories: {} };
        categories.forEach(cat => {
            manifest.categories[cat] = [];
            for (let i = 0; i < 60; i++) {
                const num = String(i).padStart(4, '0');
                manifest.categories[cat].push(`data/natural_images/${cat}/${cat}_${num}.jpg`);
            }
        });
        return manifest;
    }

    /**
     * Synthesizes a new challenge.
     */
    generateChallenge(options = {}) {
        if (!this.manifest) {
            throw new Error('CaptchaEngine not initialized. Call init() first.');
        }

        const gridSize = options.gridSize || this.gridSize;
        const difficulty = options.difficulty || this.difficulty;
        const camouflage = options.camouflage !== undefined ? options.camouflage : this.camouflage;
        const catKeys = Object.keys(this.manifest.categories);

        let dominantCat;
        let intruderCat;

        if (options.customPair) {
            dominantCat = options.customPair.dominant;
            intruderCat = options.customPair.intruder;
        } else if (difficulty === 'hard' || difficulty === 'expert') {
            const randomPair = SEMANTIC_PAIRS[Math.floor(Math.random() * SEMANTIC_PAIRS.length)];
            dominantCat = randomPair.dominant;
            intruderCat = randomPair.intruder;
        } else {
            const domIdx = Math.floor(Math.random() * catKeys.length);
            let intIdx;
            do {
                intIdx = Math.floor(Math.random() * catKeys.length);
            } while (intIdx === domIdx);

            dominantCat = catKeys[domIdx];
            intruderCat = catKeys[intIdx];
        }

        const dominantPool = [...(this.manifest.categories[dominantCat] || [])];
        const intruderPool = [...(this.manifest.categories[intruderCat] || [])];

        this._shuffleArray(dominantPool);
        this._shuffleArray(intruderPool);

        let chosenDominant;
        let chosenIntruder;

        if (difficulty === 'expert') {
            const offset = Math.floor(Math.random() * Math.max(1, dominantPool.length - gridSize - 5));
            chosenDominant = dominantPool.slice(offset, offset + gridSize - 1);
            chosenIntruder = intruderPool[Math.floor(Math.random() * Math.min(20, intruderPool.length))];
        } else {
            chosenDominant = dominantPool.slice(0, gridSize - 1);
            chosenIntruder = intruderPool[0];
        }

        const dominantItems = chosenDominant.map((src, idx) => ({
            id: `tile_${idx}_${Math.random().toString(36).substr(2, 5)}`,
            src,
            isAnomaly: false
        }));

        const intruderItem = {
            id: `tile_anom_${Math.random().toString(36).substr(2, 5)}`,
            src: chosenIntruder,
            isAnomaly: true
        };

        const gridItems = [...dominantItems, intruderItem];
        this._shuffleArray(gridItems);

        const targetIndex = gridItems.findIndex(item => item.isAnomaly);
        const challengeId = 'ch_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();

        this.currentChallenge = {
            challengeId,
            createdAt: Date.now(),
            gridSize,
            difficulty,
            camouflage,
            dominantCat,
            intruderCat,
            targetIndex,
            items: gridItems
        };

        this.telemetryRecorder.startRecording();

        if (this.onChallengeLoadedCallback) {
            this.onChallengeLoadedCallback(this.currentChallenge);
        }

        return this.currentChallenge;
    }

    /**
     * Renders the CAPTCHA inside a target container.
     */
    render(containerElement, options = {}) {
        this.containerElement = containerElement;
        if (!this.containerElement) return;

        const challenge = this.generateChallenge(options);
        const isGrid3x3 = challenge.gridSize === 9;

        this.containerElement.innerHTML = `
            <div class="aegis-captcha-box ${challenge.camouflage ? 'camouflage-mode' : ''}" id="aegisCaptchaBox">
                <div class="captcha-header">
                    <div class="captcha-badge">
                        <span class="shield-icon">🛡️</span>
                        <span>Security Check</span>
                    </div>
                    <button type="button" class="captcha-reload-btn" id="captchaReloadBtn" title="Try another set">
                        ↻
                    </button>
                </div>
                
                <div class="captcha-prompt">
                    <h3>Select the image that <span class="highlight-text">does not</span> belong</h3>
                    <p class="captcha-hint">Click the single image that is different from the rest.</p>
                </div>

                <div class="captcha-grid ${isGrid3x3 ? 'grid-3x3' : 'grid-2x2'} ${challenge.camouflage ? 'grid-camouflaged' : ''}" id="captchaImageGrid">
                    ${challenge.items.map((item, idx) => `
                        <div class="captcha-tile ${challenge.camouflage ? 'tile-camouflaged' : ''}" data-index="${idx}" id="tile_${idx}">
                            <img src="${item.src}" alt="Tile ${idx + 1}" loading="eager" draggable="false" />
                            <div class="tile-overlay">
                                <span class="tile-num">${idx + 1}</span>
                            </div>
                            ${challenge.camouflage ? '<div class="anti-ai-mesh"></div>' : ''}
                        </div>
                    `).join('')}
                </div>

                <div class="captcha-footer">
                    <div class="captcha-security-note">
                        <span class="dot-pulse"></span>
                        <span>Verification Active</span>
                    </div>
                    <span class="aegis-brand">AEGIS Verification</span>
                </div>
            </div>
        `;

        const reloadBtn = this.containerElement.querySelector('#captchaReloadBtn');
        if (reloadBtn) {
            reloadBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.render(this.containerElement, options);
            });
        }

        const tiles = this.containerElement.querySelectorAll('.captcha-tile');
        tiles.forEach(tile => {
            tile.addEventListener('click', (e) => {
                const selectedIdx = parseInt(tile.getAttribute('data-index'), 10);
                this._handleSelection(selectedIdx, tile);
            });
        });
    }

    /**
     * Evaluates selection and behavioral telemetry.
     */
    _handleSelection(selectedIndex, tileElement) {
        // Guard: only allow one selection per active challenge
        if (!this.currentChallenge) return;
        if (this.currentChallenge._selectionHandled) return;
        this.currentChallenge._selectionHandled = true;

        this.telemetryRecorder.stopRecording();
        const telemetrySummary = this.telemetryRecorder.getTelemetrySummary();

        // Snapshot challenge data BEFORE anything else can change it
        const challengeSnapshot = {
            challengeId: this.currentChallenge.challengeId,
            difficulty: this.currentChallenge.difficulty,
            dominantCat: this.currentChallenge.dominantCat,
            intruderCat: this.currentChallenge.intruderCat,
            targetIndex: this.currentChallenge.targetIndex,
            selectedIndex
        };

        const isCorrectSelection = (selectedIndex === challengeSnapshot.targetIndex);
        const botAnalysis = BotDetector.analyze(telemetrySummary, {
            gridSize: this.currentChallenge.gridSize,
            difficulty: this.currentChallenge.difficulty,
            targetIndex: challengeSnapshot.targetIndex,
            selectedIndex
        });

        const passed = isCorrectSelection && botAnalysis.isHuman;

        const result = {
            success: passed,
            isCorrectSelection,
            botAnalysis,
            challenge: challengeSnapshot,
            telemetry: telemetrySummary
        };

        if (tileElement) {
            if (passed) {
                tileElement.classList.add('tile-success');
            } else {
                tileElement.classList.add('tile-failure');
            }
        }

        // Always fire callback regardless of which path
        if (passed) {
            if (this.onVerifiedCallback) this.onVerifiedCallback(result);
        } else {
            if (this.onFailedCallback) this.onFailedCallback(result);
        }

        return result;
    }


    _shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }
}
