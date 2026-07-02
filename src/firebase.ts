import { getFirestore } from "firebase/firestore";
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
//import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAYnJOHIzRotI_l0nT6x2voT6JIKyK0o-E",
  authDomain: "store-fulfillment-app.firebaseapp.com",
  projectId: "store-fulfillment-app",
  storageBucket: "store-fulfillment-app.firebasestorage.app",
  messagingSenderId: "671615808445",
  appId: "1:671615808445:web:7f79bc5cb16d68e1f258d4",
  measurementId: "G-YGHTHTRR0V"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
// const analytics = getAnalytics(app);
export const db = getFirestore(app);