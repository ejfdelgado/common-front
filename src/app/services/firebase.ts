import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyBBOoITozdPrj-6JihAOutw_xO1mK7icb4",
    authDomain: "ejfexperiments.firebaseapp.com",
    projectId: "ejfexperiments",
    storageBucket: "ejfexperiments.firebasestorage.app",
    messagingSenderId: "1066977671859",
    appId: "1:1066977671859:web:064cd6d0e9549fa7094ec6",
    measurementId: "G-PBZZJYXYS5"
};

export const defaultFirebaseApp = initializeApp(firebaseConfig);
export const db = getFirestore(defaultFirebaseApp);