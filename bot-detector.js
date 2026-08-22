/**
 * AEGIS SECURITY - Multi-Factor Bot Detection & Human Verification Engine
 * Analyzes movement, timing, and click patterns to distinguish humans from automated scripts.
 */

export class BotDetector {
    /**
     * Evaluates telemetry and returns a human-vs-bot report in clear language.
     * @param {Object} telemetry - Telemetry summary from TelemetryRecorder
     * @param {Object} context - Optional challenge context
     * @returns {Object} Analysis report with confidence score, classification, and simple diagnostics.
     */
    static analyze(telemetry, context = {}) {
        const diagnostics = {
            timingScore: 0,
            trajectoryScore: 0,
            kinematicsScore: 0,
            spatialEntropyScore: 0,
            environmentScore: 0,
            penalties: [],
            flags: []
        };

        if (!telemetry) {
            return {
                humanScore: 0,
                isHuman: false,
                classification: 'BOT_DETECTED',
                reason: 'No movement detected',
                diagnostics
            };
        }

        // ==========================================
        // 1. TIMING & REACTION SPEED (25%)
        // ==========================================
        const duration = telemetry.totalDuration || 0;

        if (duration < 200) {
            diagnostics.timingScore = 0;
            diagnostics.penalties.push('Clicked too fast (under 200ms)');
            diagnostics.flags.push('INSTANT_SUBMISSION');
        } else if (duration < 450) {
            diagnostics.timingScore = 30;
            diagnostics.penalties.push('Unusually fast click (under 450ms)');
        } else if (duration <= 10000) {
            // Normal human time
            diagnostics.timingScore = 100;
        } else if (duration <= 30000) {
            diagnostics.timingScore = 85;
        } else {
            diagnostics.timingScore = 65;
        }

        // ==========================================
        // 2. MOUSE MOVEMENT & CURVE (25%)
        // ==========================================
        const pointsCount = telemetry.totalPoints || 0;
        const curvatureRatio = telemetry.curvatureRatio || 1.0;

        if (pointsCount < 3) {
            diagnostics.trajectoryScore = 5;
            diagnostics.penalties.push('No mouse movement before clicking');
            diagnostics.flags.push('TELEPORT_CURSOR');
        } else {
            const isStraightLine = Math.abs(curvatureRatio - 1.0) < 0.005;
            if (isStraightLine && pointsCount > 5) {
                diagnostics.trajectoryScore = 15;
                diagnostics.penalties.push('Unnatural straight-line mouse movement');
                diagnostics.flags.push('LINEAR_TRAJECTORY_BOT');
            } else if (curvatureRatio >= 1.03 && curvatureRatio <= 4.0) {
                diagnostics.trajectoryScore = 100; // Natural human curve
            } else if (curvatureRatio > 4.0 && curvatureRatio <= 10.0) {
                diagnostics.trajectoryScore = 80;
            } else {
                diagnostics.trajectoryScore = 50;
            }
        }

        // ==========================================
        // 3. SPEED VARIATION & SLOW DOWN (20%)
        // ==========================================
        const speedStdDev = telemetry.speedStdDev || 0;
        const avgSpeed = telemetry.avgSpeed || 0;
        const decelerationFactor = telemetry.decelerationFactor || 1.0;

        if (pointsCount >= 5) {
            let kinScore = 60;
            if (speedStdDev > 0.05 && avgSpeed > 0) {
                kinScore += 25;
            } else if (speedStdDev <= 0.005) {
                diagnostics.penalties.push('Robot-like constant speed');
                diagnostics.flags.push('CONSTANT_VELOCITY');
                kinScore -= 20;
            }

            if (decelerationFactor < 0.85) {
                kinScore += 15; // Slowed down naturally before clicking
            }

            diagnostics.kinematicsScore = Math.max(0, Math.min(100, kinScore));
        } else {
            diagnostics.kinematicsScore = 15;
        }

        // ==========================================
        // 4. CLICK POSITION SCATTER (15%)
        // ==========================================
        const click = telemetry.lastClick || { normalizedX: 0.5, normalizedY: 0.5, isTrusted: true };
        const normX = click.normalizedX;
        const normY = click.normalizedY;

        const isExactCenter = (Math.abs(normX - 0.5) < 0.001 && Math.abs(normY - 0.5) < 0.001);
        const isExactCorner = (normX === 0 && normY === 0);

        if (isExactCenter) {
            diagnostics.spatialEntropyScore = 20;
            diagnostics.penalties.push('Clicked exact center mathematically (0.5, 0.5)');
            diagnostics.flags.push('GEOMETRIC_CENTROID_CLICK');
        } else if (isExactCorner) {
            diagnostics.spatialEntropyScore = 0;
            diagnostics.penalties.push('Clicked exact top-left edge (0, 0)');
            diagnostics.flags.push('ORIGIN_CLICK');
        } else {
            diagnostics.spatialEntropyScore = 100;
        }

        // ==========================================
        // 5. AUTOMATION FLAGS (15%)
        // ==========================================
        let envScore = 100;
        const env = telemetry.envChecks || {};

        if (env.webdriver) {
            envScore = 0;
            diagnostics.penalties.push('Automated browser software detected');
            diagnostics.flags.push('AUTOMATION_WEBDRIVER');
        }
        if (env.untrustedEventsPresent || click.isTrusted === false) {
            envScore = 0;
            diagnostics.penalties.push('Synthetic automated click signal detected');
            diagnostics.flags.push('UNTRUSTED_EVENT');
        }
        diagnostics.environmentScore = envScore;

        // ==========================================
        // WEIGHTED SCORE CALCULATION
        // ==========================================
        const weightedScore = (
            diagnostics.timingScore * 0.25 +
            diagnostics.trajectoryScore * 0.25 +
            diagnostics.kinematicsScore * 0.20 +
            diagnostics.spatialEntropyScore * 0.15 +
            diagnostics.environmentScore * 0.15
        );

        let finalScore = Math.round(weightedScore);
        if (envScore === 0) finalScore = Math.min(finalScore, 15);
        if (diagnostics.flags.includes('INSTANT_SUBMISSION') && pointsCount < 3) finalScore = Math.min(finalScore, 10);

        let classification = 'BOT_DETECTED';
        let isHuman = false;

        if (finalScore >= 70) {
            classification = 'HUMAN_VERIFIED';
            isHuman = true;
        } else if (finalScore >= 45) {
            classification = 'SUSPICIOUS_BEHAVIOR';
            isHuman = false;
        } else {
            classification = 'BOT_DETECTED';
            isHuman = false;
        }

        return {
            humanScore: finalScore,
            isHuman,
            classification,
            diagnostics,
            metrics: {
                durationMs: duration,
                pointsSampled: pointsCount,
                curvatureRatio: Number(curvatureRatio.toFixed(2)),
                avgSpeed: Number(avgSpeed.toFixed(2)),
                speedStdDev: Number(speedStdDev.toFixed(2)),
                clickCoordinates: {
                    x: Number(normX.toFixed(2)),
                    y: Number(normY.toFixed(2))
                }
            }
        };
    }
}
