# AEGIS Security — Visual CAPTCHA & Biometric Behavioral Bot Detection System

## 1. Executive Summary & Overview
**AEGIS Security** is an AI-resistant, visual odd-one-out CAPTCHA and behavioral bot defense system. Unlike conventional text-based or Google reCAPTCHA systems that rely solely on static puzzle solutions, AEGIS combines:
1. **Semantic Visual Anomaly Recognition**: Dynamically generates visual challenges using subtle domain siblings (e.g. fruit vs. flora, felines vs. canines, ground vehicles vs. motorbikes) from a dataset of 6,899 natural images.
2. **High-Frequency Behavioral Telemetry**: Continuously measures user mouse kinematics, trajectory curvature ratios, velocity standard deviations, approach deceleration profiles, and spatial click coordinate dispersion.
3. **Multi-Factor Heuristic Bot Classifier**: Computes a weighted Human Confidence Score (0–100%) to instantly distinguish humans from automated scripts, headless browsers, or linear interpolation bots.
4. **Zero-Friction Dual-Portal Architecture**: A clean, light-mode public gateway for regular visitors and a persistent, real-time admin monitoring dashboard with zero emojis and full CSV audit export.

---

## 2. Technology Stack

| Layer | Technology / Tool | Purpose |
|---|---|---|
| **Frontend Core** | HTML5, JavaScript (ES6+ Modules) | Client-side application structure, challenge rendering, event capture |
| **Styling & Design System** | Vanilla CSS3 (Custom Design Tokens) | Responsive light-mode layout, clean card elements, micro-interactions |
| **Typography** | Google Fonts (*Inter*, *JetBrains Mono*) | High-legibility UI typography and monospace telemetry data tables |
| **Dataset Engine** | Node.js File System (`fs`, `path`) | Indexes 6,899 natural images into a structured dataset catalog |
| **Telemetry & Signal Processing** | Native DOM Event Listeners & Math API | High-resolution movement tracking, vector geometry, Euclidean calculus |
| **Local Web Server** | Node.js Built-in `http` Module | Zero-dependency static file & image asset delivery server |
| **Persistence & Inter-Tab Sync** | Web Storage API (`localStorage` & `StorageEvent`) | Real-time session synchronization between Public and Admin portals |
| **Deployment & Hosting** | Vercel (`vercel.json`), Netlify (`netlify.toml`), Render | Zero-config continuous cloud deployment from GitHub |

---

## 3. System Architecture & Working Flow

```
+-----------------------------------------------------------------------------------+
|                                 USER INTERACTION                                  |
|            (Mouse Movement, Hover Paths, Reaction Timing, Final Tile Click)       |
+------------------------------------------+----------------------------------------+
                                           |
                                           v
                   +------------------------------------------------+
                   |           telemetry.js (Recorder)              |
                   | - Captures (x, y, t) movement vectors          |
                   | - Computes Path Length vs Euclidean Distance   |
                   | - Analyzes Speed StdDev & Approach Deceleration|
                   | - Inspects DOM Event Authenticity (isTrusted)  |
                   +-----------------------+------------------------+
                                           |
                                           v
                   +------------------------------------------------+
                   |          bot-detector.js (Classifier)          |
                   | 1. Timing & Reaction Speed       (25% Weight)  |
                   | 2. Mouse Curvature & Linearity   (25% Weight)  |
                   | 3. Kinematic Velocity Variance   (20% Weight)  |
                   | 4. Click Spatial Centroid Scatter(15% Weight)  |
                   | 5. Automation / WebDriver Signals(15% Weight)  |
                   +-----------------------+------------------------+
                                           |
                                           v
                   +------------------------------------------------+
                   |         captcha-engine.js (Decision)           |
                   | - Evaluates: (isCorrectSelection && isHuman)   |
                   | - Correct Image + Human Trajectory -> Score >70|
                   | - Wrong Image Selected -> Overridden to Score 0|
                   +-----------------------+------------------------+
                                           |
                    +----------------------+----------------------+
                    |                                             |
                    v                                             v
+---------------------------------------+     +---------------------------------------+
|        PUBLIC PORTAL (index.html)     |     |     ADMIN DASHBOARD (dashboard.html)  |
| - Verified Overlay (Green)            |     | - KPI Metric Cards (Human/Bot/Wrong)  |
| - Bot Flagged Overlay (Red)           |     | - Real-time Inter-Tab Sync via Storage|
| - Diagnostic reasons summary          |     | - Monospace Telemetry Table & CSV Exp.|
+---------------------------------------+     +---------------------------------------+
```

---

## 4. Detailed File-by-File Guide

### `index.html` — Public Verification Gateway
* **Purpose**: The main user-facing security checkpoint where visitors verify they are human.
* **Key Features**:
  * Clean, distraction-free light-mode layout.
  * Direct rendering of the 3x3 image challenge grid on page load.
  * No class names or semantic domain hints shown to users.
  * Adaptive outcome screens:
    * **Verification Failed**: Displays clear reasons (e.g. *Clicked too fast*, *Unnatural straight mouse movement*, *Wrong image selected*).
    * **You're Verified**: Displays reaction latency and movement smoothness metrics.
  * Automatically writes telemetry summaries to `localStorage` for the admin dashboard.

---

### `dashboard.html` — Security Admin Console
* **Purpose**: The owner's monitoring control center for audit logging and threat inspection.
* **Key Features**:
  * **6 Summary KPI Cards**: Total Dataset Images (6,899), Humans Verified, Bots Blocked, Wrong Selections, Avg Latency (ms), Total Sessions.
  * **Telemetry Log Table**: Lists row number, timestamp, category pairing, correctness (`Yes`/`No`), latency, curvature, speed variance, (X, Y) click coordinates, confidence score %, verdict, and penalty flags.
  * **Real-time Live Sync**: Automatically updates via window `storage` events whenever a user interacts on `index.html`.
  * **Export CSV**: Generates formatted `.csv` log exports with a single click.
  * **Clear Logs**: Purges stored local audit logs.

---

### `captcha-engine.js` — Dynamic Challenge Synthesis
* **Purpose**: Orchestrates challenge generation, semantic pairing, and selection handling.
* **Key Logic**:
  * **Semantic Sibling Pairing**: Randomly picks subtle category sibling pairs (`fruit` vs `flower`, `cat` vs `dog`, `car` vs `motorbike`, `airplane` vs `car`, `person` vs `dog`).
  * **Anti-AI Texture Camouflage**: Applies subtle edge harmonization and contrast filtering to disrupt naive color-histogram web scrapers.
  * **Single-Click Execution Guard**: `_selectionHandled` flag prevents race conditions and duplicate double-click log entries.
  * **Unified Score Synthesis**: Integrates answer correctness with behavioral telemetry—wrong selections are strictly capped at 0% score with a `WRONG_ANSWER` classification.

---

### `telemetry.js` — High-Resolution Biometric Kinematics Engine
* **Purpose**: Captures spatial, velocity, and timing vectors during interaction.
* **Tracked Events**: `mousemove`, `touchmove`, `mousedown`, `touchstart`.
* **Exported Metrics**:
  * Continuous point trajectory array `[{x, y, t, speed, dt}]`.
  * Euclidean distance between origin and click point.
  * Total cumulative path length.
  * Angular deviation & micro-jitter calculation.
  * Approach deceleration factor ($v_{\text{end}} / v_{\text{mid}}$).
  * DOM event authenticity (`e.isTrusted`).

---

### `bot-detector.js` — Multi-Factor Heuristic Classifier
* **Purpose**: Analyzes behavioral kinematics and outputs a Human Confidence Score (0–100%), classification, and diagnostic penalty flags.
* **Weights**:
  * **Timing (25%)**: Rejects solves under $200\text{ms}$; awards full points for human cognitive search windows ($450\text{ms} - 10\text{s}$).
  * **Trajectory & Curvature (25%)**: Penalizes zero-movement teleports and mathematical straight lines ($R = 1.000$); awards natural human curves ($R \in [1.03, 4.0]$).
  * **Kinematics & Speed Variance (20%)**: Flags constant velocity bots ($v_{\text{stddev}} \le 0.005$); rewards natural deceleration before clicking.
  * **Click Coordinate Scatter (15%)**: Flags exact mathematical tile centers $(0.500, 0.500)$ and top-left corners $(0.000, 0.000)$.
  * **Environment Integrity (15%)**: Inspects `navigator.webdriver`, automation hooks (`__selenium`, `__nightmare`), and synthetic untrusted events.

---

### `dataset-manifest.json` & `generate-manifest.js`
* **Purpose**: Pre-indexes all 6,899 natural images across 8 categories into an optimized JSON index:
  * `airplane`: 727 images
  * `car`: 968 images
  * `cat`: 885 images
  * `dog`: 702 images
  * `flower`: 843 images
  * `fruit`: 1,000 images
  * `motorbike`: 788 images
  * `person`: 986 images

---

### `server.js`
* **Purpose**: Built-in zero-dependency Node.js HTTP server configured with proper MIME types (`.html`, `.css`, `.js`, `.json`, `.jpg`, `.png`, `.svg`) running on port `3000`.

---

### `test-captcha.js`
* **Purpose**: Automated test harness for verifying detection accuracy across synthetic bot attack payloads (Instant Teleport, Linear Interpolation, and Human Kinematics).

---

### `vercel.json` & `netlify.toml`
* **Purpose**: Production cloud deployment configurations enabling static file delivery and dataset routing out-of-the-box.

---

## 5. Parameter & Metric Dictionary

| Parameter Name | Data Type | Unit / Format | Description & Significance |
|---|---|---|---|
| `latencyMs` | Integer | Milliseconds ($\text{ms}$) | **Cognitive Search Duration**: Time elapsed from challenge presentation until the final tile click. Humans typically require $1,200\text{ms} - 4,500\text{ms}$ to visually scan the grid. Values $<200\text{ms}$ indicate programmatic script execution. |
| `curvature` | Float | Ratio ($R \ge 1.0$) | **Trajectory Curvature Ratio**: Calculated as $\frac{\text{Total Path Length}}{\text{Euclidean Distance}}$. A straight line produces $R = 1.000$ (indicative of automated linear bots). Natural human hand movements produce subtle curves with $R \in [1.05, 3.50]$. |
| `speedVariance` | Float | $\text{px}/\text{ms}$ (StdDev) | **Kinematic Acceleration Variation**: Standard deviation of cursor speed across movement slices. Automated scripts often move at a fixed constant velocity ($0.00$), whereas humans exhibit natural acceleration and deceleration profiles. |
| `clickX`, `clickY` | Float | Normalized ($0.00 - 1.00$) | **Spatial Click Dispersion**: Relative coordinates within the clicked image tile. Robotic clickers target exact centroids $(0.50, 0.50)$ or origins $(0.00, 0.00)$. Humans demonstrate natural spatial scatter. |
| `score` | Integer | Percentage ($0 - 100\%$) | **Human Confidence Score**: Weighted composite heuristic score. Scores $\ge 70\%$ are verified as human. If an incorrect anomaly is chosen, the score is strictly overridden to $0\%$. |
| `classification` | String | Enum | Final heuristic category: `HUMAN_VERIFIED`, `BOT_DETECTED`, `WRONG_ANSWER`, or `SUSPICIOUS_BEHAVIOR`. |
| `isCorrectSelection` | Boolean | `true` / `false` | Verifies whether the selected image was indeed the semantic intruder. |
| `flags` | Array | String Identifiers | Specific heuristic rule violations triggered during analysis (e.g. `INSTANT_SUBMISSION`, `TELEPORT_CURSOR`, `LINEAR_TRAJECTORY_BOT`, `GEOMETRIC_CENTROID_CLICK`, `UNTRUSTED_EVENT`). |
| `dominantCat` | String | Text | The primary image category forming the majority of grid tiles (e.g. `fruit`, `car`, `cat`). |
| `intruderCat` | String | Text | The distinct anomaly category hidden within the grid (e.g. `flower`, `motorbike`, `dog`). |

---

## 6. Deployment Guide

### Option 1: Vercel (Recommended — 1 Minute)
1. Navigate to **[vercel.com](https://vercel.com)** and log in with GitHub.
2. Click **"Add New..."** -> **"Project"** and select **`jawadwar1234/aegis-security`**.
3. Click **"Deploy"** (uses the included `vercel.json`).
4. Live endpoints generated:
   - **Visitor Gateway**: `https://<your-project>.vercel.app/`
   - **Admin Console**: `https://<your-project>.vercel.app/dashboard.html`

### Option 2: Netlify
1. Connect repository on **[netlify.com](https://netlify.com)**.
2. Deploy directly using the included `netlify.toml`.
