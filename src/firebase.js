// firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
    apiKey: "AIzaSyDkaS-o_CBxK-MWnU6-iH7sit4EbjmAcDo",
    authDomain: "efecapitaladmin.firebaseapp.com",
    projectId: "efecapitaladmin",
    storageBucket: "efecapitaladmin.firebasestorage.app",
    messagingSenderId: "855812027696",
    appId: "1:855812027696:web:5315b7bc85665ea5a044f5",
    measurementId: "G-0CNRPQ2XBC"
};

// Inicializa Firebase
const app = initializeApp(firebaseConfig);

// Exporta la instancia de autenticación
export const auth = getAuth(app);

// Exporta la instancia de Realtime Database
export const database = getDatabase(app);
export const storage = getStorage(app);