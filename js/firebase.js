import {initializeApp} from 'http://www.gstatic.com/firebasejs/11.0.1/firebase-app.js';
import {getFirestore} from 'http://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js';
import {getAnalytics} from 'http://www.gstatic.com/firebasejs/11.0.1/firebase-analytics.js';
//need to add sdks from firebase products i end up using


// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyAPujgD3xoa9zRjqve5nat6m4Q5Aa6MjDM",
    authDomain: "penn-football-benchmarking.firebaseapp.com",
    projectId: "penn-football-benchmarking",
    storageBucket: "penn-football-benchmarking.firebasestorage.app",
    messagingSenderId: "144027601930",
    appId: "1:144027601930:web:a4ea4a588776b2341d63f3",
    measurementId: "G-834Q3624G1"
  };

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);

window.db = db;
window.collection = collection;
window.addDoc = addDoc;
window.getDocs = getDocs;

async function getRecruitReports() {
    const reportsColl = collection(db, 'recruitReports');
    const reports = await getDocs(reportsColl);
    return reports;
}

export { app, analytics, db, getStationReports };