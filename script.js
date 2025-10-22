import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { 
  getFirestore, doc, setDoc, getDoc, getDocs, collection, query, where, addDoc, updateDoc, onSnapshot, serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { 
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { 
  getStorage, ref, uploadBytes, getDownloadURL 
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyBI_4n8aBT9ZPiLy8cwgiQDtD0_CYSKk4E",
  authDomain: "videot-2fcec.firebaseapp.com",
  projectId: "videot-2fcec",
  storageBucket: "videot-2fcec.firebasestorage.app",
  messagingSenderId: "583396995831",
  appId: "1:583396995831:web:6182575e28ea628cc259f2",
  measurementId: "G-2ERH0XEGSX"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

// ELEMENTOS
const email = document.getElementById("email");
const pass = document.getElementById("password");
const displayName = document.getElementById("displayName");
const signupBtn = document.getElementById("signupBtn");
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const authSection = document.getElementById("auth-section");
const chatSection = document.getElementById("chat-section");
const userPic = document.getElementById("userPic");
const userName = document.getElementById("userName");
const profilePic = document.getElementById("profilePic");
const themeToggle = document.getElementById("themeToggle");
const tabFriends = document.getElementById("tabFriends");
const tabUsers = document.getElementById("tabUsers");
const tabChat = document.getElementById("tabChat");
const friendsList = document.getElementById("friendsList");
const usersList = document.getElementById("usersList");
const chatBox = document.getElementById("chatBox");
const chatWith = document.getElementById("chatWith");
const statusText = document.getElementById("statusText");
const messagesDiv = document.getElementById("messages");
const messageInput = document.getElementById("messageInput");
const sendMsg = document.getElementById("sendMsg");

let currentUser = null;
let selectedUser = null;

// ======== TEMA CLARO/ESCURO =========
themeToggle.onclick = () => {
  document.body.classList.toggle("light");
  localStorage.setItem("theme", document.body.classList.contains("light") ? "light" : "dark");
};
if (localStorage.getItem("theme") === "light") document.body.classList.add("light");

// ======== AUTENTICAÇÃO =========
signupBtn.onclick = async () => {
  const userCred = await createUserWithEmailAndPassword(auth, email.value, pass.value);
  await setDoc(doc(db, "users", userCred.user.uid), {
    email: email.value,
    displayName: displayName.value || email.value.split("@")[0],
    photoURL: "",
    online: true,
    friends: [],
    lastActive: serverTimestamp()
  });
};

loginBtn.onclick = () => signInWithEmailAndPassword(auth, email.value, pass.value);
logoutBtn.onclick = () => signOut(auth);

onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    authSection.classList.add("hidden");
    chatSection.classList.remove("hidden");
    const snap = await getDoc(doc(db, "users", user.uid));
    const u = snap.data();
    userName.textContent = u.displayName;
    if (u.photoURL) userPic.src = u.photoURL;
    await updateDoc(doc(db, "users", user.uid), { online: true });
    listenFriends();
  } else {
    currentUser = null;
    authSection.classList.remove("hidden");
    chatSection.classList.add("hidden");
  }
});

// ======== FOTO DE PERFIL =========
profilePic.onchange = async (e) => {
  const file = e.target.files[0];
  if (!file || !currentUser) return;
  const refImg = ref(storage, `profiles/${currentUser.uid}.jpg`);
  await uploadBytes(refImg, file);
  const url = await getDownloadURL(refImg);
  await updateDoc(doc(db, "users", currentUser.uid), { photoURL: url });
  userPic.src = url;
};

// ======== AMIGOS =========
async function listenFriends() {
  const userRef = doc(db, "users", currentUser.uid);
  onSnapshot(userRef, async (snap) => {
    const userData = snap.data();
    const friendIds = userData.friends || [];
    friendsList.innerHTML = "";
    for (let fId of friendIds) {
      const fSnap = await getDoc(doc(db, "users", fId));
      const f = fSnap.data();
      const div = document.createElement("div");
      div.classList.add("user-item");
      div.innerHTML = `
        <img src="${f.photoURL || 'https://i.imgur.com/8Km9tLL.png'}" class="avatar">
        <div>
          <strong>${f.displayName}</strong><br>
          <small>${f.online ? "🟢 online" : "⚫ offline"}</small>
        </div>`;
      div.onclick = () => openChat(fId, f);
      friendsList.appendChild(div);
    }
  });
}

// ======== LISTAR USUÁRIOS =========
tabUsers.onclick = async () => {
  usersList.classList.remove("hidden");
  friendsList.classList.add("hidden");
  const snap = await getDocs(collection(db, "users"));
  usersList.innerHTML = "";
  snap.forEach((docSnap) => {
    const u = docSnap.data();
    if (u.email !== currentUser.email) {
      const div = document.createElement("div");
      div.classList.add("user-item");
      div.innerHTML = `
        <img src="${u.photoURL || 'https://i.imgur.com/8Km9tLL.png'}" class="avatar">
        <div>
          <strong>${u.displayName}</strong><br>
          <button class="addFriend">+ Amigo</button>
        </div>`;
      div.querySelector(".addFriend").onclick = () => addFriend(docSnap.id);
      usersList.appendChild(div);
    }
  });
};

async function addFriend(uid) {
  const meRef = doc(db, "users", currentUser.uid);
  const friendRef = doc(db, "users", uid);
  const meSnap = await getDoc(meRef);
  const meData = meSnap.data();
  if (!meData.friends.includes(uid)) {
    await updateDoc(meRef, { friends: [...meData.friends, uid] });
    const fSnap = await getDoc(friendRef);
    const fData = fSnap.data();
    await updateDoc(friendRef, { friends: [...(fData.friends || []), currentUser.uid] });
  }
  alert("Agora vocês são amigos!");
}

// ======== CHAT =========
function openChat(uid, userObj) {
  selectedUser = { uid, ...userObj };
  chatWith.textContent = userObj.displayName;
  chatBox.classList.remove("hidden");
  messagesDiv.innerHTML = "";
  listenMessages();
}

sendMsg.onclick = async () => {
  if (!messageInput.value.trim()) return;
  const chatId = [currentUser.uid, selectedUser.uid].sort().join("_");
  await addDoc(collection(db, "chats", chatId, "messages"), {
    from: currentUser.uid,
    fromName: userName.textContent,
    to: selectedUser.uid,
    text: messageInput.value,
    createdAt: serverTimestamp()
  });
  messageInput.value = "";
};

function listenMessages() {
  const chatId = [currentUser.uid, selectedUser.uid].sort().join("_");
  const q = query(collection(db, "chats", chatId, "messages"));
  onSnapshot(q, (snap) => {
    messagesDiv.innerHTML = "";
    snap.forEach((d) => {
      const m = d.data();
      const div = document.createElement("div");
      div.classList.add(m.from === currentUser.uid ? "me" : "them");
      div.innerHTML = `<b>${m.fromName}:</b> ${m.text}`;
      messagesDiv.appendChild(div);
    });
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  });
  }
