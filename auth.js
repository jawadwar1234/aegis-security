import { app } from "./firebase-config.js";

import {
    getAuth,
    signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const auth = getAuth(app);

const loginForm = document.getElementById("loginForm");
const errorMsg = document.getElementById("error-msg");

loginForm.addEventListener("submit", async (e) => {

    e.preventDefault();

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    try {

        await signInWithEmailAndPassword(
            auth,
            email,
            password
        );

        console.log("Login successful!");

        window.location.href = "dashboard.html";

    } catch (error) {

        console.error(error);

        errorMsg.textContent =
            "ACCESS DENIED: Invalid email or password.";

    }

});