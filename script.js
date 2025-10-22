// script.js - Versão melhorada: sincronização, nomes em mensagens, amigos robustos, conversas
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import {
  getFirestore, collection, doc, setDoc, getDoc, getDocs,
  query, where, orderBy, addDoc, updateDoc, onSnapshot,
  serverTimestamp, arrayUnion, arrayRemove
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import {
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import {
  getStorage, ref, uploadBytes, getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-storage.js";

/* ---------------- CONFIG FIREBASE ---------------- */
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

/* ---------------- ELEMENTOS ---------------- */
const emailEl = document.getElementById("email");
const passEl = document.getElementById("password");
const displayNameEl = document.getElementById("displayName");
const bioEl = document.getElementById("bio");
const signupBtn = document.getElementById("signupBtn");
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const authBox = document.getElementById("auth-box");
const userPanel = document.getElementById("user-panel");
const userPic = document.getElementById("userPic");
const userNameLabel = document.getElementById("userName");
const userEmailLabel = document.getElementById("userEmailLabel");
const profilePicInput = document.getElementById("profilePic");
const themeToggle = document.getElementById("themeToggle");

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

let currentUser = null;
let currentUserData = null;
let selectedUser = null;
let messagesUnsubscribe = null;
let friendsUnsubscribe = null;
let chatsUnsubscribe = null;

/* ---------------- TEMA ---------------- */
themeToggle.onclick = () => {
  document.body.classList.toggle("light");
  localStorage.setItem("theme", document.body.classList.contains("light") ? "light" : "dark");
};
if (localStorage.getItem("theme") === "light") document.body.classList.add("light");

/* ---------------- AUTENTICAÇÃO ---------------- */
signupBtn.onclick = async () => {
  try {
    const email = emailEl.value.trim();
    const pass = passEl.value;
    if (!email || !pass) throw new Error("Preenche email e senha.");
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    const uid = cred.user.uid;
    const profile = {
      email,
      displayName: displayNameEl.value.trim() || email.split("@")[0],
      bio: bioEl.value || "",
      photoURL: "",
      online: true,
      friends: [],
      createdAt: serverTimestamp(),
      lastActive: serverTimestamp()
    };
    await setDoc(doc(db, "users", uid), profile);
  } catch (err) {
    alert(err.message);
  }
};

loginBtn.onclick = async () => {
  try {
    await signInWithEmailAndPassword(auth, emailEl.value.trim(), passEl.value);
  } catch (err) {
    alert(err.message);
  }
};

logoutBtn.onclick = async () => {
  if (currentUser) {
    // marca offline
    await updateDoc(doc(db, "users", currentUser.uid), { online: false, lastActive: serverTimestamp() }).catch(()=>{});
  }
  signOut(auth);
};

/* ---------------- ON AUTH CHANGE ---------------- */
onAuthStateChanged(auth, async (u) => {
  if (u) {
    currentUser = u;
    authBox.classList.add("hidden");
    userPanel.classList.remove("hidden");
    userEmailLabel.textContent = u.email;

    const uSnap = await getDoc(doc(db, "users", u.uid));
    currentUserData = uSnap.exists() ? uSnap.data() : null;
    userNameLabel.textContent = currentUserData?.displayName || (u.email.split("@")[0]);
    if (currentUserData?.photoURL) userPic.src = currentUserData.photoURL;

    // marca online
    await updateDoc(doc(db, "users", u.uid), { online: true, lastActive: serverTimestamp() }).catch(()=>{});

    // listeners em tempo real
    listenFriends();
    listenChats();
  } else {
    currentUser = null;
    currentUserData = null;
    authBox.classList.remove("hidden");
    userPanel.classList.add("hidden");
    // remove listeners
    if (friendsUnsubscribe) friendsUnsubscribe();
    if (messagesUnsubscribe) messagesUnsubscribe();
    if (chatsUnsubscribe) chatsUnsubscribe();
  }
});

/* ---------------- FOTO DE PERFIL ---------------- */
profilePicInput.onchange = async (e) => {
  try {
    const file = e.target.files[0];
    if (!file || !currentUser) return;
    const pathRef = ref(storage, `profiles/${currentUser.uid}.jpg`);
    await uploadBytes(pathRef, file);
    const url = await getDownloadURL(pathRef);
    await updateDoc(doc(db, "users", currentUser.uid), { photoURL: url });
    userPic.src = url;
  } catch (err) {
    alert("Erro upload: " + err.message);
  }
};

/* ---------------- AMIGOS (FOLLOW/UNFOLLOW) ---------------- */
async function listenFriends() {
  if (!currentUser) return;
  const userRef = doc(db, "users", currentUser.uid);
  // onSnapshot keeps friends list in sync
  friendsUnsubscribe = onSnapshot(userRef, async (snap) => {
    const data = snap.data() || {};
    currentUserData = data;
    const friendIds = data.friends || [];
    friendsList.innerHTML = "";

    // Load each friend doc (could be optimized)
    for (let fid of friendIds) {
      try {
        const fSnap = await getDoc(doc(db, "users", fid));
        if (!fSnap.exists()) continue;
        const f = fSnap.data();
        const el = document.createElement("div");
        el.className = "user-item";
        el.innerHTML = `
          <img src="${f.photoURL || 'https://i.imgur.com/8Km9tLL.png'}" class="avatar" />
          <div class="user-info">
            <div class="name">${escapeHtml(f.displayName || f.email)}</div>
            <div class="small">${f.online ? "🟢 online" : "⚫ offline"}</div>
          </div>
          <div class="actions">
            <button class="openChat">Abrir</button>
            <button class="unfriend">Remover</button>
          </div>`;
        el.querySelector(".openChat").onclick = () => openChat(fid, f);
        el.querySelector(".unfriend").onclick = () => removeFriend(fid);
        friendsList.appendChild(el);
      } catch (e) { console.error(e); }
    }
  });
}

/* ---------------- LISTAR USUÁRIOS E SEGUIR ---------------- */
tabUsers.onclick = async () => {
  tabUsers.classList.add("active"); tabFriends.classList.remove("active"); tabChats.classList.remove("active");
  usersList.classList.remove("hidden"); friendsList.classList.add("hidden"); chatsList.classList.add("hidden");
  const snap = await getDocs(collection(db, "users"));
  usersList.innerHTML = "";
  snap.forEach(docSnap => {
    const u = docSnap.data();
    const uid = docSnap.id;
    if (!currentUser || u.email === currentUser.email) return;
    const el = document.createElement("div");
    el.className = "user-item";
    const isFriend = (currentUserData?.friends || []).includes(uid);
    el.innerHTML = `
      <img src="${u.photoURL || 'https://i.imgur.com/8Km9tLL.png'}" class="avatar" />
      <div class="user-info">
        <div class="name">${escapeHtml(u.displayName || u.email)}</div>
        <div class="small">${u.bio || ''}</div>
      </div>
      <div class="actions">
        <button class="openChat">Abrir</button>
        <button class="followBtn">${isFriend ? '✔️ Amigo' : '+ Seguir'}</button>
      </div>`;
    el.querySelector(".openChat").onclick = () => openChat(uid, u);
    const followBtn = el.querySelector(".followBtn");
    followBtn.onclick = () => toggleFriend(uid, u, followBtn);
    usersList.appendChild(el);
  });
};

async function toggleFriend(uid, udata, btn) {
  try {
    const meRef = doc(db, "users", currentUser.uid);
    const themRef = doc(db, "users", uid);
    const meSnap = await getDoc(meRef);
    const meData = meSnap.data();
    const already = (meData?.friends || []).includes(uid);
    if (already) {
      await updateDoc(meRef, { friends: arrayRemove(uid) });
      await updateDoc(themRef, { friends: arrayRemove(currentUser.uid) });
      btn.textContent = "+ Seguir";
    } else {
      await updateDoc(meRef, { friends: arrayUnion(uid) });
      await updateDoc(themRef, { friends: arrayUnion(currentUser.uid) });
      btn.textContent = "✔️ Amigo";
    }
  } catch (e) { console.error(e); alert(e.message); }
}

async function removeFriend(uid) {
  if (!confirm("Remover amigo?")) return;
  try {
    await updateDoc(doc(db, "users", currentUser.uid), { friends: arrayRemove(uid) });
    await updateDoc(doc(db, "users", uid), { friends: arrayRemove(currentUser.uid) });
  } catch (e) { console.error(e); }
}

/* ---------------- CHAT / MENSAGENS ---------------- */
function openChat(uid, userObj) {
  selectedUser = { uid, ...userObj };
  placeholder.classList.add("hidden");
  chatBox.classList.remove("hidden");
  chatWithName.textContent = userObj.displayName || userObj.email;
  chatWithPic.src = userObj.photoURL || 'https://i.imgur.com/8Km9tLL.png';
  statusText.textContent = userObj.online ? "🟢 online" : "⚫ offline";
  // unsubscribe previous messages listener
  if (messagesUnsubscribe) messagesUnsubscribe();
  // start listening
  listenMessagesFor(uid);
}

sendMsgBtn.onclick = async () => {
  if (!messageInput.value.trim() || !selectedUser || !currentUser) return;
  const text = messageInput.value.trim();
  const chatId = [currentUser.uid, selectedUser.uid].sort().join("_");

  try {
    // Add message doc
    await addDoc(collection(db, "chats", chatId, "messages"), {
      from: currentUser.uid,
      fromName: currentUserData?.displayName || currentUser.email.split("@")[0],
      to: selectedUser.uid,
      text,
      createdAt: serverTimestamp()
    });

    // Update chat meta (conversations)
    await setDoc(doc(db, "chats", chatId), {
      participants: [currentUser.uid, selectedUser.uid],
      lastMessage: text,
      lastFrom: currentUser.uid,
      lastFromName: currentUserData?.displayName || currentUser.email.split("@")[0],
      lastUpdated: serverTimestamp()
    }, { merge: true });

    messageInput.value = "";
  } catch (e) {
    console.error(e);
  }
};

function listenMessagesFor(otherUid) {
  const chatId = [currentUser.uid, otherUid].sort().join("_");
  const q = query(collection(db, "chats", chatId, "messages"), orderBy("createdAt"));
  messagesUnsubscribe = onSnapshot(q, snap => {
    messagesDiv.innerHTML = "";
    snap.forEach(d => {
      const m = d.data();
      const row = document.createElement("div");
      row.className = "message " + (m.from === currentUser.uid ? "me" : "them");
      // show name (fromName) above message
      const who = document.createElement("div");
      who.className = "msg-name";
      who.textContent = m.fromName || (m.from === currentUser.uid ? currentUser.email : selectedUser.email);
      const content = document.createElement("div");
      content.className = "msg-text";
      content.textContent = m.text;
      row.appendChild(who);
      row.appendChild(content);
      messagesDiv.appendChild(row);
    });
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  });
}

/* ---------------- LISTA DE CONVERSAS (META) ---------------- */
function listenChats() {
  if (!currentUser) return;
  // listen to chats where current user participates
  const q = query(collection(db, "chats"), where("participants", "array-contains", currentUser.uid), orderBy("lastUpdated", "desc"));
  chatsUnsubscribe = onSnapshot(q, async snap => {
    chatsList.innerHTML = "";
    if (snap.empty) {
      chatsList.innerHTML = `<div class="empty">Sem conversas</div>`;
      return;
    }
    snap.forEach(async docSnap => {
      const c = docSnap.data();
      const otherId = c.participants.find(p => p !== currentUser.uid);
      const otherSnap = await getDoc(doc(db, "users", otherId));
      const other = otherSnap.exists() ? otherSnap.data() : { displayName: otherId, photoURL: ''};
      const el = document.createElement("div");
      el.className = "chat-item";
      el.innerHTML = `
        <img src="${other.photoURL || 'https://i.imgur.com/8Km9tLL.png'}" class="avatar" />
        <div class="chat-info">
          <div class="name">${escapeHtml(other.displayName || other.email)}</div>
          <div class="small">${escapeHtml(c.lastMessage || '')}</div>
        </div>
        <div class="meta">
          <div class="small">${c.lastFromName || ''}</div>
        </div>`;
      el.onclick = () => openChat(otherId, other);
      chatsList.appendChild(el);
    });
  });
}

/* ---------------- UTIL ---------------- */
function escapeHtml(s) {
  if (!s) return "";
  return s.replace(/[&<>"'`]/g, (m) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;', '`':'&#96;'}[m]));
                        }
