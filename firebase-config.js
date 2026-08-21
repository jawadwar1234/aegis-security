import { initializeApp } from 
"https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";

const firebaseConfig = {
    apiKey: "AIzaSyBxM042yJtkRsqUGeHkPVt1omBlZmkA3QY",
    authDomain: "securityshield-26d3a.firebaseapp.com",
    projectId: "securityshield-26d3a",
    storageBucket: "securityshield-26d3a.firebasestorage.app",
    messagingSenderId: "125664259135",
    appId: "1:125664259135:web:caa6d83c107490e793dc8a",
    measurementId: "G-L6W1LCHRKG"
};

const app = initializeApp(firebaseConfig);

export { app };