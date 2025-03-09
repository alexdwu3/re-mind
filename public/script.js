import { initializeApp } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-analytics.js";
import { getFirestore, collection, addDoc, doc, updateDoc, getDocs, getDoc, Timestamp } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";

// Firebase Configuration (Get from Firebase Console)
const firebaseConfig = {
    apiKey: "AIzaSyAnVw1HDnYl3FNDJCYj_1FS1cJcSizyWOU",
    authDomain: "re-mind-419f4.firebaseapp.com",
    projectId: "re-mind-419f4",
    storageBucket: "re-mind-419f4.firebasestorage.app",
    messagingSenderId: "325017281253",
    appId: "1:325017281253:web:e52f45b1d7d134cec46a0c",
    measurementId: "G-9S335NBRPR"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);

// Check for username and set page title and username display
const username = localStorage.getItem('username');
if (!username) {
    window.location.href = 'login.html';
} else {
    document.title = `re/mind: ${username}`;
    document.getElementById('user-name').innerText = `for: ${username}`;
}

// Function to Save a New Habit
async function saveHabit() {
    const habitName = document.getElementById("habit-name").value;
    if (!username) {
        alert('No username found. Please log in again.');
        window.location.href = 'login.html';
        return;
    }
    await addDoc(collection(db, "habits"), {
        name: habitName,
        frequency: 1,  // Daily by default
        group: [username],
        lastCompleted: null
    });    
    alert("Habit saved!");
    loadHabits(); // Refresh UI after saving
}

async function completeHabit(habitId) {
    console.log("🟢 completeHabit called with habitId:", habitId);
    
    if (!habitId) {
        console.error("❌ Invalid habit ID!");
        alert("Invalid habit ID.");
        return;
    }

    try {
        const habitRef = doc(db, "habits", habitId);
        await updateDoc(habitRef, { lastCompleted: Timestamp.now() });

        console.log("✅ Firestore update successful!");
        alert("Habit marked as done!");
        loadHabits(); // Refresh UI after update
    } catch (error) {
        console.error("🔥 Error updating habit:", error);
        alert("Error updating habit: " + error.message);
    }
}

async function loadHabits() {
    const habitList = document.getElementById("habit-list");
    habitList.innerHTML = "";

    if (!username) {
        alert('No username found. Please log in again.');
        window.location.href = 'login.html';
        return;
    }

    const querySnapshot = await getDocs(collection(db, "habits"));
    querySnapshot.forEach((docSnap) => {
        const habit = docSnap.data();
        const habitId = docSnap.id; // Get Firestore document ID

        if (habit.group.includes(username)) {
            console.log("📌 Adding Habit to UI:", habit.name, "| Firestore ID:", habitId);

            // Ensure habitId is correctly inserted
            habitList.innerHTML += `
                <p>
                    <strong>${habit.name}</strong><br>
                    Last Done: ${habit.lastCompleted?.toDate() || "Never"}<br>
                    <button onclick="completeHabit('${habitId}')">Mark Done</button> <!-- ✅ Pass habitId here -->
                </p>
            `;
        }
    });
}

// Load habits on page load
window.onload = loadHabits;

// Expose functions to the global window object
window.completeHabit = completeHabit;
window.saveHabit = saveHabit;
window.loadHabits = loadHabits;