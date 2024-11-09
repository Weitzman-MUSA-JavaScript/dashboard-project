// Import the functions you need from the SDKs you need
import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js';
import { getFirestore, collection, addDoc, getDocs } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js';
import { getAnalytics } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-analytics.js';
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: 'AIzaSyCa9E4F9Kw0ybsI4JslEOnzoQpmmkVkEts',
  authDomain: 'communityfridgefinder.firebaseapp.com',
  projectId: 'communityfridgefinder',
  storageBucket: 'communityfridgefinder.firebasestorage.app',
  messagingSenderId: '468147005390',
  appId: '1:468147005390:web:34d66f8a0ae8e4e4c1ad9f',
  measurementId: 'G-LMXN32E2SX',
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);

window.db = db;
window.collection = collection;
window.addDoc = addDoc;
window.getDocs = getDocs;

export { app, analytics, db };
