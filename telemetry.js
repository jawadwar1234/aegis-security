/**
 * AEGIS SECURITY - Behavioral Telemetry & Biometrics Engine
 * Captures high-frequency kinematic, spatial, and timing data during user interaction.
 */

export class TelemetryRecorder {
    constructor(targetElement = null) {
        this.targetElement = targetElement || document;
        this.reset();
        this._bindEvents();
    }

    reset() {
        this.startTime = Date.now();
        this.firstMoveTime = null;
        this.clickTime = null;
        this.points = []; // [{x, y, t, vx, vy, speed, dt}]
        this.clicks = [];
        this.hoverHistory = [];
        this.isRecording = false;
        this.trustedEventsCount = 0;
        this.untrustedEventsCount = 0;
        this.keysPressed = 0;
        this.onPointCallback = null;
    }

    startRecording() {
        this.reset();
        this.isRecording = true;
        this.startTime = Date.now();
    }

    stopRecording() {
        this.isRecording = false;
        if (!this.clickTime) {
            this.clickTime = Date.now();
        }
    }

    onPoint(callback) {
        this.onPointCallback = callback;
    }

    _bindEvents() {
        const handleMove = (e) => {
            if (!this.isRecording) return;
            const now = Date.now();
            if (!this.firstMoveTime) this.firstMoveTime = now;

            if (e.isTrusted === false) {
                this.untrustedEventsCount++;
            } else {
                this.trustedEventsCount++;
            }

            const x = e.clientX || (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
            const y = e.clientY || (e.touches && e.touches[0] ? e.touches[0].clientY : 0);

            const lastPoint = this.points[this.points.length - 1];
            let speed = 0;
            let dt = 0;

            if (lastPoint) {
                dt = Math.max(1, now - lastPoint.t);
                const dx = x - lastPoint.x;
                const dy = y - lastPoint.y;
                const dist = Math.hypot(dx, dy);
                speed = dist / dt; // pixels per ms
            }

            const point = { x, y, t: now, dt, speed };
            this.points.push(point);

            if (this.onPointCallback) {
                this.onPointCallback(point, this.points);
            }
        };

        const handleClick = (e) => {
            if (!this.isRecording) return;
            this.clickTime = Date.now();
            if (e.isTrusted === false) {
                this.untrustedEventsCount++;
            } else {
                this.trustedEventsCount++;
            }

            const targetRect = e.target.getBoundingClientRect ? e.target.getBoundingClientRect() : null;
            let normalizedX = 0.5;
            let normalizedY = 0.5;

            if (targetRect && targetRect.width > 0 && targetRect.height > 0) {
                normalizedX = (e.clientX - targetRect.left) / targetRect.width;
                normalizedY = (e.clientY - targetRect.top) / targetRect.height;
            }

            this.clicks.push({
                x: e.clientX,
                y: e.clientY,
                t: this.clickTime,
                isTrusted: e.isTrusted !== false,
                normalizedX: Math.max(0, Math.min(1, normalizedX)),
                normalizedY: Math.max(0, Math.min(1, normalizedY)),
                targetTagName: e.target.tagName
            });
        };

        window.addEventListener('mousemove', handleMove, { passive: true });
        window.addEventListener('touchmove', handleMove, { passive: true });
        window.addEventListener('mousedown', handleClick, { passive: true });
        window.addEventListener('touchstart', handleClick, { passive: true });
    }

    /**
     * Synthesizes and exports the full telemetry package for analysis.
     */
    getTelemetrySummary() {
        const totalDuration = (this.clickTime || Date.now()) - this.startTime;
        const latencyToFirstMove = this.firstMoveTime ? (this.firstMoveTime - this.startTime) : totalDuration;
        const totalPoints = this.points.length;

        // Calculate trajectory metrics
        let totalPathLength = 0;
        let speeds = [];
        let angleChanges = [];

        for (let i = 1; i < this.points.length; i++) {
            const p1 = this.points[i - 1];
            const p2 = this.points[i];
            const segDist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
            totalPathLength += segDist;
            speeds.push(p2.speed);

            if (i > 1) {
                const p0 = this.points[i - 2];
                const angle1 = Math.atan2(p1.y - p0.y, p1.x - p0.x);
                const angle2 = Math.atan2(p2.y - p1.y, p2.x - p1.x);
                let diff = Math.abs(angle2 - angle1);
                if (diff > Math.PI) diff = 2 * Math.PI - diff;
                angleChanges.push(diff);
            }
        }

        const startPoint = this.points[0];
        const endPoint = this.points[this.points.length - 1];
        const euclideanDistance = (startPoint && endPoint) ? Math.hypot(endPoint.x - startPoint.x, endPoint.y - startPoint.y) : 0;

        // Curvature ratio (Straight line = 1.0, Human curves > 1.05)
        const curvatureRatio = euclideanDistance > 0 ? (totalPathLength / euclideanDistance) : 1.0;

        // Speed statistics
        const avgSpeed = speeds.length ? (speeds.reduce((a, b) => a + b, 0) / speeds.length) : 0;
        const speedVariance = speeds.length ? (speeds.reduce((acc, s) => acc + Math.pow(s - avgSpeed, 2), 0) / speeds.length) : 0;
        const speedStdDev = Math.sqrt(speedVariance);

        // Angular jitter (sum of direction changes)
        const avgAngleChange = angleChanges.length ? (angleChanges.reduce((a, b) => a + b, 0) / angleChanges.length) : 0;

        // Approach Deceleration Profile
        // Humans decelerate in the last 25% of trajectory before clicking; bots do not.
        let decelerationFactor = 1.0;
        if (speeds.length >= 8) {
            const quarterIndex = Math.floor(speeds.length * 0.75);
            const midSpeeds = speeds.slice(Math.floor(speeds.length * 0.25), quarterIndex);
            const endSpeeds = speeds.slice(quarterIndex);
            const avgMidSpeed = midSpeeds.length ? (midSpeeds.reduce((a, b) => a + b, 0) / midSpeeds.length) : 1;
            const avgEndSpeed = endSpeeds.length ? (endSpeeds.reduce((a, b) => a + b, 0) / endSpeeds.length) : 1;
            decelerationFactor = avgMidSpeed > 0 ? (avgEndSpeed / avgMidSpeed) : 1;
        }

        // Environment inspection
        const envChecks = {
            webdriver: !!(navigator.webdriver),
            hasAutomationFlags: !!(
                window.__nightmare ||
                window.callPhantom ||
                window._phantom ||
                window.__selenium_unwrapped ||
                document.$cdc_asdjflasutopfhvcZLmcfl_
            ),
            outerDimensionsZero: (window.outerWidth === 0 && window.outerHeight === 0),
            untrustedEventsPresent: this.untrustedEventsCount > 0,
            hasTouchCapabilities: ('ontouchstart' in window) || (navigator.maxTouchPoints > 0)
        };

        const lastClick = this.clicks[this.clicks.length - 1] || {
            normalizedX: 0.5,
            normalizedY: 0.5,
            isTrusted: true
        };

        return {
            totalDuration,
            latencyToFirstMove,
            totalPoints,
            totalPathLength,
            euclideanDistance,
            curvatureRatio,
            avgSpeed,
            speedStdDev,
            avgAngleChange,
            decelerationFactor,
            lastClick,
            envChecks,
            points: this.points
        };
    }
}
