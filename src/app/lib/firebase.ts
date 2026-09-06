import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBrMesCOEnJbKxjdSvwz0oq3fDQ5Fe61vA",
  authDomain: "nova-role-play.firebaseapp.com",
  projectId: "nova-role-play",
  storageBucket: "nova-role-play.firebasestorage.app",
  messagingSenderId: "448829438965",
  appId: "1:448829438965:web:1053f00f3aefe0a7eafebc",
  measurementId: "G-7EDY8BKZNF"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const storage = getStorage(app);