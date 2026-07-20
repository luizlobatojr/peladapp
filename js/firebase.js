import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDQEhmxUDQ_A61VAVYMA0_on-GeOITwaSM",
  authDomain: "futrank-8ea67.firebaseapp.com",
  projectId: "futrank-8ea67",
  storageBucket: "futrank-8ea67.firebasestorage.app",
  messagingSenderId: "999186656331",
  appId: "1:999186656331:web:bb4e33a953ba02a7b5b1ce",
  measurementId: "G-8Z3BJY1572",
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// 3. Exporte o db para poder usar em outros arquivos
export { app, auth, db, storage };
//console.log("Auth:", auth);
//console.log("Storage:", storage);