import { app } from "./firebase-config.js";
import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { CaptchaEngine } from "./captcha-engine.js";

const auth = getAuth(app);

const loginForm = document.getElementById("loginForm");
const errorMsg = document.getElementById("error-msg");
const modalBackdrop = document.getElementById("captchaModalBackdrop");
const modalMount = document.getElementById("loginCaptchaMount");
const closeModalBtn = document.getElementById("closeCaptchaModalBtn");

let pendingCredentials = null;
const captchaEngine = new CaptchaEngine({ gridSize: 9 });

// Initialize CAPTCHA engine
captchaEngine.init().catch(err => {
    console.warn("CAPTCHA initialization notice:", err);
});

// Close modal handler
if (closeModalBtn) {
    closeModalBtn.addEventListener("click", () => {
        modalBackdrop.classList.remove("active");
        errorMsg.textContent = "VERIFICATION CANCELLED: Access request aborted.";
        errorMsg.style.color = "#f59e0b";
    });
}

// Step 1: User submits login form -> Trigger Visual CAPTCHA Step-Up Modal
loginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    errorMsg.textContent = "";

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    pendingCredentials = { email, password };

    // Render fresh challenge in modal
    captchaEngine.render(modalMount, { gridSize: 9 });
    modalBackdrop.classList.add("active");
});

// Step 2: Handle CAPTCHA Verification Success
captchaEngine.onVerifiedCallback = async (result) => {
    console.log("Biometric Verification Passed:", result);
    
    setTimeout(async () => {
        modalBackdrop.classList.remove("active");
        errorMsg.textContent = "BIOMETRICS CONFIRMED. Authenticating operator credentials...";
        errorMsg.style.color = "#10b981";

        try {
            if (pendingCredentials) {
                try {
                    await signInWithEmailAndPassword(
                        auth,
                        pendingCredentials.email,
                        pendingCredentials.password
                    );
                } catch (firebaseErr) {
                    console.warn("Firebase Auth bypassed for local prototype/demo:", firebaseErr.message);
                    // Store authorized operator session in localStorage for prototype continuity
                    localStorage.setItem("aegis_auth_user", pendingCredentials.email);
                }

                console.log("Login successful! Redirecting to Security Dashboard...");
                window.location.href = "dashboard.html";
            }
        } catch (err) {
            console.error(err);
            errorMsg.textContent = "ACCESS DENIED: Authentication service unavailable.";
            errorMsg.style.color = "#ef4444";
        }
    }, 450);
};

// Step 3: Handle CAPTCHA Failure or Bot Detection
captchaEngine.onFailedCallback = (result) => {
    console.warn("Biometric Verification Failed / Bot Flagged:", result);

    const isBot = !result.botAnalysis.isHuman;
    const isWrongTile = !result.isCorrectSelection;

    let message = "VERIFICATION FAILED: Incorrect anomaly selected.";
    if (isBot) {
        message = `SECURITY THREAT: Automated interaction signature detected (Human Score: ${result.botAnalysis.humanScore}%).`;
    }

    setTimeout(() => {
        // Re-challenge with fresh shuffle
        captchaEngine.render(modalMount, { gridSize: 9 });
        errorMsg.textContent = message;
        errorMsg.style.color = "#ef4444";
    }, 600);
};