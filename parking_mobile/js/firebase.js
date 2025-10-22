// Import the functions you need from the SDKs you need
  import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
  import { 
    getFirestore, 
    doc, 
    updateDoc, 
    getDoc, 
    setDoc,
    collection,
    addDoc,
    query,
    where,
    getDocs,
    Timestamp
  } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";
  import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-analytics.js";
  // TODO: Add SDKs for Firebase products that you want to use
  // https://firebase.google.com/docs/web/setup#available-libraries

  // Your web app's Firebase configuration
  // For Firebase JS SDK v7.20.0 and later, measurementId is optional
  const firebaseConfig = {
    apiKey: "AIzaSyAT_Jt-E_gptcVIUgRmt6S4G0IbVUTtwLw",
    authDomain: "parkingdashboard-d660e.firebaseapp.com",
    projectId: "parkingdashboard-d660e",
    storageBucket: "parkingdashboard-d660e.firebasestorage.app",
    messagingSenderId: "953469235598",
    appId: "1:953469235598:web:71c4ff58697951e68374df",
    measurementId: "G-2WV1CHZQBY",
  };

  // Initialize Firebase
  const app = initializeApp(firebaseConfig);
  const analytics = getAnalytics(app);
  const db = getFirestore(app);

  export { 
    app, 
    analytics, 
    db, 
    doc, 
    updateDoc, 
    getDoc, 
    setDoc,
    collection,
    addDoc,
    query,
    where,
    getDocs,
    Timestamp
  };