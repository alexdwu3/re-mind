import { initializeApp } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-analytics.js";
import {
  getFirestore,
  collection,
  addDoc,
  doc,
  updateDoc,
  getDocs,
  getDoc,
  deleteDoc,
  Timestamp,
  writeBatch,
  arrayUnion,
} from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";
// Firebase Configuration (Get from Firebase Console)
const firebaseConfig = {
  apiKey: "AIzaSyAnVw1HDnYl3FNDJCYj_1FS1cJcSizyWOU",
  authDomain: "re-mind-419f4.firebaseapp.com",
  projectId: "re-mind-419f4",
  storageBucket: "re-mind-419f4.firebasestorage.app",
  messagingSenderId: "325017281253",
  appId: "1:325017281253:web:e52f45b1d7d134cec46a0c",
  measurementId: "G-9S335NBRPR",
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);

// Check for username and set page title and username display
const username = localStorage.getItem("username");
if (!username) {
  window.location.href = "login.html";
} else {
  document.title = `re/mind: ${username}`;
  document.getElementById("user-name").innerText = `for: ${username}`;
  loadUsers(); // Load users on page load
}

async function saveHabit() {
  const habitName = document.getElementById("habit-name").value;
  const groupId = document.getElementById("group-name").value; // This must be an ID!

  if (!habitName || !groupId) {
    alert("Please enter a habit name and select a group.");
    return;
  }

  console.log("📝 Saving Habit:", habitName, "for Group ID:", groupId);

  await addDoc(collection(db, "habits"), {
    name: habitName,
    groupId: groupId, // Storing correct ID
    frequency: 1,
    lastCompleted: null,
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
  console.log("user data" + userData);
  const userGroups = userData.groups || []; // Ensure user groups are an array of **IDs**

  console.log("👤 User Data:", userData);
  console.log("👤 User Groups (IDs):", userGroups);

  if (userGroups.length === 0) {
    console.warn("⚠️ User has no groups, skipping habit loading.");
    return;
  }

  // Fetch all habits, filtering for user groups
  const querySnapshot = await getDocs(collection(db, "habits"));

  console.log("🔥 Total Habits in Firestore:", querySnapshot.docs.length);

  for (const docSnap of querySnapshot.docs) {
    const habit = docSnap.data();

    if (!habit.groupId) {
      console.warn(`⚠️ Skipping habit ${habit.name} due to missing groupId`);
      continue;
    }

    if (userGroups.includes(habit.groupId)) {
      console.log("✅ Habit Matches User Group:", habit.name, habit.groupId);

      // Fetch group name
      const groupRef = doc(db, "groups", habit.groupId);
      const groupSnap = await getDoc(groupRef);
      const groupName = groupSnap.exists()
        ? groupSnap.data().name
        : "Unknown Group";

      habitList.innerHTML += `
                <p>
                    <strong>${habit.name}</strong><br>
                    Group: ${groupName} <br>
                    Frequency: Complete each ${habit.frequency} day(s)<br>
                    Last Done: ${
                      habit.lastCompleted
                        ? new Date(
                            habit.lastCompleted.seconds * 1000
                          ).toLocaleString()
                        : "Never"
                    }<br>
                    <button onclick="completeHabit('${
                      docSnap.id
                    }')">Mark Done</button>
                </p>
            `;
    } else {
      console.warn(
        `⚠️ Habit Skipped: ${habit.name} (Group ID: ${habit.groupId})`
      );
    }
  }
}

// Function to open the edit modal
function openEditModal(habitId, habitName, habitFrequency, habitGroup) {
  document.getElementById("edit-habit-name").value = habitName;
  document.getElementById("edit-habit-frequency").value = habitFrequency;
  document.getElementById("edit-habit-group").value = habitGroup;
  document.getElementById("edit-modal").style.display = "block";
  document.getElementById("edit-modal").dataset.habitId = habitId;
}

// Function to close the edit modal
function closeModal() {
  document.getElementById("edit-modal").style.display = "none";
}

// Function to update the habit
async function updateHabit() {
  const habitId = document.getElementById("edit-modal").dataset.habitId;
  const habitName = document.getElementById("edit-habit-name").value;
  const habitFrequency = parseInt(
    document.getElementById("edit-habit-frequency").value
  );
  const habitGroup = document.getElementById("edit-habit-group").value;

  try {
    const habitRef = doc(db, "habits", habitId);
    await updateDoc(habitRef, {
      name: habitName,
      frequency: habitFrequency,
      group: habitGroup,
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

async function createGroup() {
  const groupName = document.getElementById("new-group-name").value;
  const groupMembers = Array.from(
    document.getElementById("new-group-members").selectedOptions
  ).map((option) => option.value);
  const username = localStorage.getItem("username");

  if (!groupName) {
    alert("Please enter a group name.");
    return;
  }

  if (!groupMembers.includes(username)) {
    groupMembers.push(username); // Ensure the creator is a member of the group
  }

  console.log("📝 Creating Group:", groupName, "with Members:", groupMembers);

  const groupDoc = await addDoc(collection(db, "groups"), {
    name: groupName,
    members: groupMembers,
  });

  // Update user documents with the new group ID
  const batch = writeBatch(db);
  groupMembers.forEach((member) => {
    const userRef = doc(db, "users", member);
    batch.update(userRef, {
      groups: arrayUnion(groupDoc.id),
    });
  });

  await batch.commit();

  alert("Group created!");

  // Reload groups after creating a new group
  loadGroups();
}

async function loadGroups() {
  console.log(
    "🔥 loadGroups() called at",
    new Date().toISOString(),
    "from",
    new Error().stack
  );

  const groupList = document.getElementById("group-list");
  const groupSelect = document.getElementById("group-name");

  // Clear UI before reloading
  groupList.innerHTML = "";
  groupSelect.innerHTML = "";

  const username = localStorage.getItem("username");
  if (!username) {
    alert("Please log in.");
    window.location.href = "login.html";
    return;
  }

  const querySnapshot = await getDocs(collection(db, "groups"));
  const uniqueGroups = new Set();

  console.log("🔥 Firestore Groups Fetched:", querySnapshot.docs.length);

  querySnapshot.forEach((docSnap) => {
    const group = docSnap.data();
    const groupId = docSnap.id;

    if (group.members.includes(username)) {
      if (!uniqueGroups.has(groupId)) {
        uniqueGroups.add(groupId);
        groupList.innerHTML += `
                    <p>
                        <strong>${group.name}</strong><br>
                        Members: ${[...new Set(group.members)].join(
                          ", "
                        )}<br>  <!-- Remove duplicates -->
                        <button onclick="openEditGroupModal('${groupId}', '${
          group.name
        }', '${group.members.join(", ")}')">Edit Group</button>
                        <button onclick="deleteGroup('${groupId}')">Delete Group</button>
                    </p>
                `;
      }
    }
  });

  uniqueGroups.forEach((groupId) => {
    const group = querySnapshot.docs.find((doc) => doc.id === groupId).data();
    groupSelect.innerHTML += `<option value="${groupId}">${group.name}</option>`;
  });
}

// Function to open the edit group modal
async function openEditGroupModal(groupId, groupName, groupMembers) {
  document.getElementById("edit-group-name").value = groupName;
  const membersArray = groupMembers.split(",").map((member) => member.trim());
  const editGroupMembersSelect = document.getElementById("edit-group-members");
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

  document.getElementById("edit-group-modal").style.display = "block";
  document.getElementById("edit-group-modal").dataset.groupId = groupId;
}

// Function to close the edit group modal
function closeGroupModal() {
  document.getElementById("edit-group-modal").style.display = "none";
}

// Function to update the group
async function updateGroup() {
  const groupId = document.getElementById("edit-group-modal").dataset.groupId;
  const groupName = document.getElementById("edit-group-name").value;
  const groupMembers = Array.from(
    document.getElementById("edit-group-members").selectedOptions
  ).map((option) => option.value);

  try {
    const groupRef = doc(db, "groups", groupId);
    await updateDoc(groupRef, {
      name: groupName,
      members: groupMembers,
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

async function loadUsers() {
  console.log(
    "🔥 loadUsers() called at",
    new Date().toISOString(),
    "from",
    new Error().stack
  );

  const newGroupMembersSelect = document.getElementById("new-group-members");
  const editGroupMembersSelect = document.getElementById("edit-group-members");
  newGroupMembersSelect.innerHTML = "";
  editGroupMembersSelect.innerHTML = "";

  const querySnapshot = await getDocs(collection(db, "users"));
  const existingOptions = new Set();

  querySnapshot.forEach((docSnap) => {
    const user = docSnap.data();
    if (!existingOptions.has(user.username)) {
      const option = document.createElement("option");
      option.value = user.username;
      option.text = user.username;
      newGroupMembersSelect.appendChild(option);
      editGroupMembersSelect.appendChild(option.cloneNode(true));
      existingOptions.add(user.username);
    }
  });
}

// Load habits and groups on page load
window.onload = () => {
  console.log("🔥 Initial loadGroups() call");
  loadGroups();
  // loadUsers();
  loadHabits();
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
