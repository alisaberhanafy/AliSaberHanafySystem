/**
 * Shared Firebase client configuration.
 * All platform and workshop pages intentionally use the same STAGING project.
 * Firebase web config is public; authorization is enforced by RTDB rules.
 */
window.AliFirebaseConfig = Object.freeze({
    apiKey: "AIzaSyBHl9rgas8egP590XRvdl4k3Hon86kJDZQ",
    authDomain: "alisabersystem-staging.firebaseapp.com",
    databaseURL: "https://alisabersystem-staging-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "alisabersystem-staging",
    storageBucket: "alisabersystem-staging.firebasestorage.app",
    messagingSenderId: "81230470647",
    appId: "1:81230470647:web:0d7588417a36f1ac3622f2"
});
