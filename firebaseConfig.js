// firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCrEbpMZHPvw5Gi1ZRzvqhs8UJVM0jVKaU",
  authDomain: "whatapp-clone-a928d.firebaseapp.com",
  databaseURL: "https://whatapp-clone-a928d-default-rtdb.firebaseio.com",
  projectId: "whatapp-clone-a928d",
  storageBucket: "whatapp-clone-a928d.firebasestorage.app",
  messagingSenderId: "1046074341208",
  appId: "1:1046074341208:web:8d077ad7d35a596062172d",
  measurementId: "G-D6GP2K371X",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
const auth = getAuth(app);
const database = getDatabase(app);

export { auth, database };
