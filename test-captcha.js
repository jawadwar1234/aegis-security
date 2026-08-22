import fs from 'fs';
import { BotDetector } from './bot-detector.js';

console.log("=== RUNNING AEGIS VISUAL CAPTCHA & BOT DETECTOR TEST SUITE ===");

// Test 1: Verify Manifest
const manifest = JSON.parse(fs.readFileSync('./dataset-manifest.json', 'utf-8'));
console.log(`[PASS] Dataset manifest valid: ${manifest.totalImages} images across ${manifest.totalCategories} categories.`);

// Test 2: Instant Teleport Bot (<20ms, 1 point)
const bot1Telemetry = {
    totalDuration: 19,
    latencyToFirstMove: 19,
    totalPoints: 1,
    totalPathLength: 0,
    euclideanDistance: 0,
    curvatureRatio: 1.0,
    avgSpeed: 0,
    speedStdDev: 0,
    avgAngleChange: 0,
    decelerationFactor: 1.0,
    lastClick: { normalizedX: 0.5, normalizedY: 0.5, isTrusted: false },
    envChecks: { webdriver: false, untrustedEventsPresent: true, outerDimensionsZero: false }
};
const res1 = BotDetector.analyze(bot1Telemetry);
console.log(`\nTest 1 - Instant Teleport Bot:`);
console.log(`- Score: ${res1.humanScore}% | Classification: ${res1.classification}`);
console.log(`- Flags: ${res1.diagnostics.flags.join(', ')}`);
if (res1.classification === 'BOT_DETECTED' && res1.humanScore <= 20) {
    console.log(`[PASS] Correctly flagged instant teleport bot.`);
} else {
    console.error(`[FAIL] Instant bot was not flagged!`);
}

// Test 2: Linear Interpolation Bot (Curvature = 1.000, 0 stdDev)
const bot2Telemetry = {
    totalDuration: 300,
    latencyToFirstMove: 15,
    totalPoints: 21,
    totalPathLength: 200,
    euclideanDistance: 200,
    curvatureRatio: 1.000,
    avgSpeed: 0.8,
    speedStdDev: 0.001,
    avgAngleChange: 0,
    decelerationFactor: 1.0,
    lastClick: { normalizedX: 0.5, normalizedY: 0.5, isTrusted: false },
    envChecks: { webdriver: false, untrustedEventsPresent: true, outerDimensionsZero: false }
};
const res2 = BotDetector.analyze(bot2Telemetry);
console.log(`\nTest 2 - Linear Interpolation Bot:`);
console.log(`- Score: ${res2.humanScore}% | Classification: ${res2.classification}`);
console.log(`- Flags: ${res2.diagnostics.flags.join(', ')}`);
if (res2.classification === 'BOT_DETECTED') {
    console.log(`[PASS] Correctly flagged linear bot.`);
} else {
    console.error(`[FAIL] Linear bot was not flagged!`);
}

// Test 3: Natural Human Interaction
const humanTelemetry = {
    totalDuration: 2100,
    latencyToFirstMove: 380,
    totalPoints: 45,
    totalPathLength: 380,
    euclideanDistance: 310,
    curvatureRatio: 1.225,
    avgSpeed: 0.38,
    speedStdDev: 0.14,
    avgAngleChange: 0.12,
    decelerationFactor: 0.65, // Decelerated approaching target
    lastClick: { normalizedX: 0.42, normalizedY: 0.58, isTrusted: true },
    envChecks: { webdriver: false, untrustedEventsPresent: false, outerDimensionsZero: false }
};
const res3 = BotDetector.analyze(humanTelemetry);
console.log(`\nTest 3 - Natural Human Interaction:`);
console.log(`- Score: ${res3.humanScore}% | Classification: ${res3.classification}`);
console.log(`- Penalties: ${res3.diagnostics.penalties.length}`);
if (res3.isHuman && res3.humanScore >= 75) {
    console.log(`[PASS] Correctly verified human operator.`);
} else {
    console.error(`[FAIL] Human interaction was rejected!`);
}

console.log("\n=== ALL TEST SUITE CHECKS COMPLETED ===");
