import { initializeApp } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-analytics.js";
import { getFirestore, collection, addDoc, doc, updateDoc, getDocs, getDoc, deleteDoc, Timestamp } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";

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
    loadGroups(); // Load groups on page load
    loadUsers(); // Load users on page load
}

// Function to Save a New Habit
async function saveHabit() {
    const habitName = document.getElementById("habit-name").value;
    const groupName = document.getElementById("group-name").value; // Get selected group

    if (!habitName || !groupName) {
        alert("Please enter a habit name and select a group.");
        return;
    }

    await addDoc(collection(db, "habits"), {
        name: habitName,
        group: groupName,
        frequency: 1,
        lastCompleted: null
    });

    alert("Habit saved!");
    loadHabits(); // Refresh UI
}

// Function to complete a habit
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

// Function to load habits
async function loadHabits() {
    const habitList = document.getElementById("habit-list");
    habitList.innerHTML = "";

    const username = localStorage.getItem("username");
    if (!username) {
        alert("Please log in.");
        window.location.href = "login.html";
        return;
    }

    // Fetch user data to get their groups
    const userRef = doc(db, "users", username);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
        alert("User not found.");
        return;
    }

    const userData = userSnap.data();
    const userGroups = userData.groups || [];

    // Fetch all habits, but only show those for the user's groups
    const querySnapshot = await getDocs(collection(db, "habits"));
    querySnapshot.forEach((docSnap) => {
        const habit = docSnap.data();
        if (userGroups.includes(habit.group)) {
            habitList.innerHTML += `
                <p>
                    <strong>${habit.name}</strong><br>
                    Complete every ${habit.frequency} days<br>
                    Group: ${habit.group}<br>
                    Last Done: ${habit.lastCompleted?.toDate() || "Never"}<br>
                    <button onclick="completeHabit('${docSnap.id}')">Mark Done</button>
                    <button onclick="openEditModal('${docSnap.id}', '${habit.name}', ${habit.frequency}, '${habit.group}')">Edit</button>
                </p>
            `;
        }
    });
}

// Function to open the edit modal
function openEditModal(habitId, habitName, habitFrequency, habitGroup) {
    document.getElementById('edit-habit-name').value = habitName;
    document.getElementById('edit-habit-frequency').value = habitFrequency;
    document.getElementById('edit-habit-group').value = habitGroup;
    document.getElementById('edit-modal').style.display = 'block';
    document.getElementById('edit-modal').dataset.habitId = habitId;
}

// Function to close the edit modal
function closeModal() {
    document.getElementById('edit-modal').style.display = 'none';
}

// Function to update the habit
async function updateHabit() {
    const habitId = document.getElementById('edit-modal').dataset.habitId;
    const habitName = document.getElementById('edit-habit-name').value;
    const habitFrequency = parseInt(document.getElementById('edit-habit-frequency').value);
    const habitGroup = document.getElementById('edit-habit-group').value;

    try {
        const habitRef = doc(db, "habits", habitId);
        await updateDoc(habitRef, {
            name: habitName,
            frequency: habitFrequency,
            group: habitGroup
        });

        console.log("✅ Firestore update successful!");
        alert("Habit updated!");
        closeModal();
        loadHabits(); // Refresh UI after update
    } catch (error) {
        console.error("🔥 Error updating habit:", error);
        alert("Error updating habit: " + error.message);
    }
}

// Function to create a new group
async function createGroup() {
    const groupName = document.getElementById("new-group-name").value;
    const groupMembers = Array.from(document.getElementById("new-group-members").selectedOptions).map(option => option.value);
    const username = localStorage.getItem('username');

    if (!groupName) {
        alert("Please enter a group name.");
        return;
    }

    if (!groupMembers.includes(username)) {
        groupMembers.push(username); // Ensure the creator is a member of the group
    }

    await addDoc(collection(db, "groups"), {
        name: groupName,
        members: groupMembers
    });

    alert("Group created!");
    loadGroups(); // Refresh UI
}

// Function to load groups
async function loadGroups() {
    const groupList = document.getElementById("group-list");
    const groupSelect = document.getElementById("group-name");
    groupList.innerHTML = "";
    groupSelect.innerHTML = "";

    const username = localStorage.getItem("username");
    if (!username) {
        alert("Please log in.");
        window.location.href = "login.html";
        return;
    }

    const querySnapshot = await getDocs(collection(db, "groups"));
    const groups = new Set(); // Use a Set to avoid duplicates
    querySnapshot.forEach((docSnap) => {
        const group = docSnap.data();
        if (group.members.includes(username)) {
            groups.add(group.name);
            groupList.innerHTML += `
                <p>
                    <strong>${group.name}</strong><br>
                    Members: ${group.members.join(", ")}<br>
                    <button onclick="openEditGroupModal('${docSnap.id}', '${group.name}', '${group.members.join(", ")}')">Edit Group</button>
                    <button onclick="deleteGroup('${docSnap.id}')">Delete Group</button>
                </p>
            `;
        }
    });

    groups.forEach(groupName => {
        groupSelect.innerHTML += `<option value="${groupName}">${groupName}</option>`;
    });
}

// Function to open the edit group modal
function openEditGroupModal(groupId, groupName, groupMembers) {
    document.getElementById('edit-group-name').value = groupName;
    const membersArray = groupMembers.split(',').map(member => member.trim());
    const editGroupMembersSelect = document.getElementById('edit-group-members');
    editGroupMembersSelect.innerHTML = "";

    const querySnapshot = await getDocs(collection(db, "users"));
    querySnapshot.forEach((docSnap) => {
        const user = docSnap.data();
        const option = document.createElement("option");
        option.value = user.username;
        option.text = user.username;
        if (membersArray.includes(user.username)) {
            option.selected = true;
        }
        editGroupMembersSelect.appendChild(option);
    });

    document.getElementById('edit-group-modal').style.display = 'block';
    document.getElementById('edit-group-modal').dataset.groupId = groupId;
}

// Function to close the edit group modal
function closeGroupModal() {
    document.getElementById('edit-group-modal').style.display = 'none';
}

// Function to update the group
async function updateGroup() {
    const groupId = document.getElementById('edit-group-modal').dataset.groupId;
    const groupName = document.getElementById('edit-group-name').value;
    const groupMembers = Array.from(document.getElementById('edit-group-members').selectedOptions).map(option => option.value);

    try {
        const groupRef = doc(db, "groups", groupId);
        await updateDoc(groupRef, {
            name: groupName,
            members: groupMembers
        });

        console.log("✅ Firestore update successful!");
        alert("Group updated!");
        closeGroupModal();
        loadGroups(); // Refresh UI after update
    } catch (error) {
        console.error("🔥 Error updating group:", error);
        alert("Error updating group: " + error.message);
    }
}

// Function to delete a group
async function deleteGroup(groupId) {
    await deleteDoc(doc(db, "groups", groupId));
    alert("Group deleted!");
    loadGroups(); // Refresh UI
}

// Function to load users
async function loadUsers() {
    const newGroupMembersSelect = document.getElementById("new-group-members");
    const editGroupMembersSelect = document.getElementById("edit-group-members");
    newGroupMembersSelect.innerHTML = "";
    editGroupMembersSelect.innerHTML = "";

    const querySnapshot = await getDocs(collection(db, "users"));
    querySnapshot.forEach((docSnap) => {
        const user = docSnap.data();
        const option = document.createElement("option");
        option.value = user.username;
        option.text = user.username;
        newGroupMembersSelect.appendChild(option);
        editGroupMembersSelect.appendChild(option.cloneNode(true));
    });
}

// Load habits and groups on page load
window.onload = () => {
    loadHabits();
    loadGroups();
    loadUsers();
};

// Expose functions to the global window object
window.completeHabit = completeHabit;
window.saveHabit = saveHabit;
window.loadHabits = loadHabits;
window.openEditModal = openEditModal;
window.closeModal = closeModal;
window.updateHabit = updateHabit;
window.createGroup = createGroup;
window.loadGroups = loadGroups;
window.deleteGroup = deleteGroup;
window.openEditGroupModal = openEditGroupModal;
window.closeGroupModal = closeGroupModal;
window.updateGroup = updateGroup;
window.loadUsers = loadUsers;