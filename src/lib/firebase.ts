import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDkaS-o_CBxK-MWnU6-iH7sit4EbjmAcDo",
  authDomain: "efecapitaladmin.firebaseapp.com",
  projectId: "efecapitaladmin",
  storageBucket: "efecapitaladmin.firebasestorage.app",
  messagingSenderId: "855812027696",
  appId: "1:855812027696:web:5315b7bc85665ea5a044f5",
  measurementId: "G-0CNRPQ2XBC",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
