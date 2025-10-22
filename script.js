import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import {
  getFirestore, doc, setDoc, getDoc, getDocs,
  collection, query, where, orderBy, addDoc,
  updateDoc, onSnapshot, serverTimestamp,
  arrayUnion, arrayRemove
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import {
  getAuth, createUserWithEmailAndPassword,
  signInWithEmailAndPassword, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import {
  getStorage, ref, uploadBytes, getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-storage.js";

/* ---------- CONFIG FIREBASE ---------- */
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

/* ---------- ELEMENTOS ---------- */
const authBox = document.getElementById("auth-box");
const userPanel = document.getElementById("user-panel");
const emailEl = document.getElementById("email");
const passEl = document.getElementById("password");
const displayNameEl = document.getElementById("displayName");
const bioEl = document.getElementById("bio");
const signupBtn = document.getElementById("signupBtn");
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const profilePicInput = document.getElementById("profilePic");
const userPic = document.getElementById("userPic");
const userNameLabel = document.getElementById("userName");
const userEmailLabel = document.getElementById("userEmailLabel");

const tabFriends = document.getElementById("tabFriends");
const tabUsers = document.getElementById("tabUsers");
const tabChats = document.getElementById("tabChats");
const friendsList = document.getElementById("friendsList");
const usersList = document.getElementById("usersList");
const chatsList = document.getElementById("chatsList");

const placeholder = document.getElementById("placeholder");
const chatBox = document.getElementById("chatBox");
const chatWithName = document.getElementById("chatWithName");
const chatWithPic = document.getElementById("chatWithPic");
const statusText = document.getElementById("statusText");
const messagesDiv = document.getElementById("messages");
const messageInput = document.getElementById("messageInput");
const sendMsgBtn = document.getElementById("sendMsg");
const themeToggle = document.getElementById("themeToggle");

/* ---------- VARIÁVEIS ---------- */
let currentUser = null;
let currentUserData = null;
let selectedUser = null;
let unsubMessages = null;
let unsubFriends = null;
let unsubChats = null;

/* ---------- TEMA ---------- */
themeToggle.onclick = () => {
  document.body.classList.toggle("light");
  localStorage.setItem("theme", document.body.classList.contains("light") ? "light" : "dark");
};
if (localStorage.getItem("theme") === "light") document.body.classList.add("light");

/* ---------- AUTENTICAÇÃO ---------- */
signupBtn.onclick = async () => {
  const email = emailEl.value.trim();
  const pass = passEl.value;
  if (!email || !pass) return alert("Preenche email e senha!");
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    const uid = cred.user.uid;
    await setDoc(doc(db, "users", uid), {
      email,
      displayName: displayNameEl.value || email.split("@")[0],
      bio: bioEl.value || "",
      photoURL: "",
      online: true,
      friends: [],
      createdAt: serverTimestamp(),
      lastActive: serverTimestamp()
    });
  } catch (e) {
    alert(e.message);
  }
};

loginBtn.onclick = async () => {
  try {
    await signInWithEmailAndPassword(auth, emailEl.value.trim(), passEl.value);
  } catch (e) {
    alert("Erro ao entrar: " + e.message);
  }
};

logoutBtn.onclick = async () => {
  if (currentUser)
    await updateDoc(doc(db, "users", currentUser.uid), { online: false, lastActive: serverTimestamp() }).catch(() => {});
  await signOut(auth);
};

/* ---------- ESTADO DE LOGIN ---------- */
onAuthStateChanged(auth, async (u) => {
  if (u) {
    currentUser = u;
    authBox.classList.add("hidden");
    userPanel.classList.remove("hidden");
    userEmailLabel.textContent = u.email;

    const snap = await getDoc(doc(db, "users", u.uid));
    currentUserData = snap.exists() ? snap.data() : {};
    userNameLabel.textContent = currentUserData.displayName || u.email.split("@")[0];
    if (currentUserData.photoURL) userPic.src = currentUserData.photoURL;

    await updateDoc(doc(db, "users", u.uid), { online: true, lastActive: serverTimestamp() }).catch(() => {});

    listenFriends();
    listenChats();
  } else {
    currentUser = null;
    authBox.classList.remove("hidden");
    userPanel.classList.add("hidden");
    if (unsubFriends) unsubFriends();
    if (unsubMessages) unsubMessages();
    if (unsubChats) unsubChats();
  }
});

/* ---------- FOTO DE PERFIL ---------- */
profilePicInput.onchange = async (e) => {
  const file = e.target.files[0];
  if (!file || !currentUser) return;
  try {
    const refPath = ref(storage, `profiles/${currentUser.uid}.jpg`);
    await uploadBytes(refPath, file);
    const url = await getDownloadURL(refPath);
    await updateDoc(doc(db, "users", currentUser.uid), { photoURL: url });
    userPic.src = url;
  } catch (e) {
    alert("Erro ao enviar imagem: " + e.message);
  }
};

/* ---------- LISTA DE AMIGOS ---------- */
function listenFriends() {
  if (!currentUser) return;
  const refUser = doc(db, "users", currentUser.uid);
  unsubFriends = onSnapshot(refUser, async (snap) => {
    const data = snap.data();
    currentUserData = data;
    const ids = data.friends || [];
    friendsList.innerHTML = "";

    for (let id of ids) {
      const fsnap = await getDoc(doc(db, "users", id));
      if (!fsnap.exists()) continue;
      const f = fsnap.data();
      const div = document.createElement("div");
      div.className = "user-item";
      div.innerHTML = `
        <img src="${f.photoURL || 'https://i.imgur.com/8Km9tLL.png'}" class="avatar">
        <div class="user-info">
          <div class="name">${escapeHtml(f.displayName)}</div>
          <div class="small">${f.online ? "🟢 online" : "⚫ offline"}</div>
        </div>
        <div class="actions">
          <button class="openChat">Chat</button>
          <button class="unfriend">❌</button>
        </div>`;
      div.querySelector(".openChat").onclick = () => openChat(id, f);
      div.querySelector(".unfriend").onclick = () => removeFriend(id);
      friendsList.appendChild(div);
    }
  });
}

/* ---------- LISTAR USUÁRIOS ---------- */
tabUsers.onclick = async () => {
  tabUsers.classList.add("active"); tabFriends.classList.remove("active"); tabChats.classList.remove("active");
  usersList.classList.remove("hidden"); friendsList.classList.add("hidden"); chatsList.classList.add("hidden");

  const snap = await getDocs(collection(db, "users"));
  usersList.innerHTML = "";
  snap.forEach(docSnap => {
    const u = docSnap.data();
    const id = docSnap.id;
    if (id === currentUser.uid) return;
    const div = document.createElement("div");
    const isFriend = (currentUserData?.friends || []).includes(id);
    div.className = "user-item";
    div.innerHTML = `
      <img src="${u.photoURL || 'https://i.imgur.com/8Km9tLL.png'}" class="avatar">
      <div class="user-info">
        <div class="name">${escapeHtml(u.displayName || u.email)}</div>
        <div class="small">${u.bio || ""}</div>
      </div>
      <div class="actions">
        <button class="openChat">Chat</button>
        <button class="followBtn">${isFriend ? "✔️ Amigo" : "+ Seguir"}</button>
      </div>`;
    div.querySelector(".openChat").onclick = () => openChat(id, u);
    div.querySelector(".followBtn").onclick = () => toggleFriend(id, div.querySelector(".followBtn"));
    usersList.appendChild(div);
  });
};

async function toggleFriend(uid, btn) {
  const meRef = doc(db, "users", currentUser.uid);
  const themRef = doc(db, "users", uid);
  const meSnap = await getDoc(meRef);
  const already = (meSnap.data()?.friends || []).includes(uid);
  if (already) {
    await updateDoc(meRef, { friends: arrayRemove(uid) });
    await updateDoc(themRef, { friends: arrayRemove(currentUser.uid) });
    btn.textContent = "+ Seguir";
  } else {
    await updateDoc(meRef, { friends: arrayUnion(uid) });
    await updateDoc(themRef, { friends: arrayUnion(currentUser.uid) });
    btn.textContent = "✔️ Amigo";
  }
}

async function removeFriend(uid) {
  if (!confirm("Remover amigo?")) return;
  await updateDoc(doc(db, "users", currentUser.uid), { friends: arrayRemove(uid) });
  await updateDoc(doc(db, "users", uid), { friends: arrayRemove(currentUser.uid) });
}

/* ---------- CHAT ---------- */
function openChat(uid, userObj) {
  selectedUser = { uid, ...userObj };
  placeholder.classList.add("hidden");
  chatBox.classList.remove("hidden");
  chatWithName.textContent = userObj.displayName || userObj.email;
  chatWithPic.src = userObj.photoURL || "https://i.imgur.com/8Km9tLL.png";
  statusText.textContent = userObj.online ? "🟢 online" : "⚫ offline";
  if (unsubMessages) unsubMessages();
  listenMessages(uid);
}

sendMsgBtn.onclick = async () => {
  if (!messageInput.value.trim() || !selectedUser) return;
  const text = messageInput.value.trim();
  const chatId = [currentUser.uid, selectedUser.uid].sort().join("_");
  await addDoc(collection(db, "chats", chatId, "messages"), {
    from: currentUser.uid,
    fromName: currentUserData.displayName,
    to: selectedUser.uid,
    text,
    createdAt: serverTimestamp()
  });
  await setDoc(doc(db, "chats", chatId), {
    participants: [currentUser.uid, selectedUser.uid],
    lastMessage: text,
    lastFrom: currentUser.uid,
    lastFromName: currentUserData.displayName,
    lastUpdated: serverTimestamp()
  }, { merge: true });
  messageInput.value = "";
};

function listenMessages(uid) {
  const chatId = [currentUser.uid, uid].sort().join("_");
  const q = query(collection(db, "chats", chatId, "messages"), orderBy("createdAt"));
  unsubMessages = onSnapshot(q, snap => {
    messagesDiv.innerHTML = "";
    snap.forEach(d => {
      const m = d.data();
      const msg = document.createElement("div");
      msg.className = "message " + (m.from === currentUser.uid ? "me" : "them");
      msg.innerHTML = `<div class="msg-name">${escapeHtml(m.fromName)}</div>
                       <div class="msg-text">${escapeHtml(m.text)}</div>`;
      messagesDiv.appendChild(msg);
    });
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  });
}

/* ---------- LISTA DE CONVERSAS ---------- */
function listenChats() {
  const q = query(collection(db, "chats"), where("participants", "array-contains", currentUser.uid), orderBy("lastUpdated", "desc"));
  unsubChats = onSnapshot(q, async snap => {
    chatsList.innerHTML = "";
    if (snap.empty) chatsList.innerHTML = `<div class="small">Sem conversas</div>`;
    for (const c of snap.docs) {
      const chat = c.data();
      const otherId = chat.participants.find(x => x !== currentUser.uid);
      const otherSnap = await getDoc(doc(db, "users", otherId));
      const other = otherSnap.data();
      const div = document.createElement("div");
      div.className = "user-item";
      div.innerHTML = `
        <img src="${other.photoURL || 'https://i.imgur.com/8Km9tLL.png'}" class="avatar">
        <div class="user-info">
          <div class="name">${escapeHtml(other.displayName)}</div>
          <div class="small">${escapeHtml(chat.lastMessage || "")}</div>
        </div>`;
      div.onclick = () => openChat(otherId, other);
      chatsList.appendChild(div);
    }
  });
}

/* ---------- UTIL ---------- */
function escapeHtml(s) {
  return s ? s.replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m])) : "";
}
