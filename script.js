// Imports Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { 
  getFirestore, doc, setDoc, getDoc, getDocs, collection, query, where, addDoc, onSnapshot, orderBy, updateDoc, serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { 
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { 
  getStorage, ref, uploadBytes, getDownloadURL 
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-storage.js";

// Firebase config
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

// Elements
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const displayNameInput = document.getElementById("displayName");
const bioInput = document.getElementById("bio");
const signupBtn = document.getElementById("signupBtn");
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const chatSection = document.getElementById("chat-section");
const authSection = document.getElementById("auth-section");
const userPic = document.getElementById("userPic");
const userName = document.getElementById("userName");
const profilePicInput = document.getElementById("profilePic");
const usersList = document.getElementById("usersList");
const chatsList = document.getElementById("chatsList");
const chatBox = document.getElementById("chatBox");
const chatWith = document.getElementById("chatWith");
const statusText = document.getElementById("statusText");
const messagesDiv = document.getElementById("messages");
const msgInput = document.getElementById("messageInput");
const imageInput = document.getElementById("imageInput");
const sendBtn = document.getElementById("sendMsg");
const tabUsers = document.getElementById("tabUsers");
const tabChats = document.getElementById("tabChats");

let currentUser = null;
let selectedUser = null;

// Criar conta
signupBtn.onclick = async () => {
  try {
    const userCred = await createUserWithEmailAndPassword(auth, emailInput.value, passwordInput.value);
    await setDoc(doc(db, "users", userCred.user.uid), {
      email: userCred.user.email,
      displayName: displayNameInput.value || userCred.user.email.split("@")[0],
      bio: bioInput.value || "",
      photoURL: "",
      online: true,
      lastActive: serverTimestamp()
    });
    alert("Conta criada com sucesso!");
  } catch (e) {
    alert(e.message);
  }
};

// Login
loginBtn.onclick = async () => {
  try {
    await signInWithEmailAndPassword(auth, emailInput.value, passwordInput.value);
  } catch (e) {
    alert(e.message);
  }
};

// Logout
logoutBtn.onclick = () => signOut(auth);

// Status online/offline
async function setUserStatus(uid, online) {
  await updateDoc(doc(db, "users", uid), { online, lastActive: serverTimestamp() });
}

// Estado de autenticação
onAuthStateChanged(auth, async user => {
  if (user) {
    currentUser = user;
    authSection.classList.add("hidden");
    chatSection.classList.remove("hidden");

    const userDoc = await getDoc(doc(db, "users", user.uid));
    const data = userDoc.data();
    userName.textContent = data.displayName;
    if (data.photoURL) userPic.src = data.photoURL;

    await setUserStatus(user.uid, true);
    loadUsers();
    loadChats();

    window.addEventListener("beforeunload", () => setUserStatus(user.uid, false));
  } else {
    currentUser = null;
    authSection.classList.remove("hidden");
    chatSection.classList.add("hidden");
  }
});

// Upload foto de perfil
profilePicInput.onchange = async e => {
  const file = e.target.files[0];
  if (!file || !currentUser) return;

  const storageRef = ref(storage, `profiles/${currentUser.uid}.jpg`);
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);
  await updateDoc(doc(db, "users", currentUser.uid), { photoURL: url });
  userPic.src = url;
  alert("Foto atualizada!");
};

// Listar usuários
async function loadUsers() {
  const snap = await getDocs(collection(db, "users"));
  usersList.innerHTML = "";
  snap.forEach(docSnap => {
    const u = docSnap.data();
    if (u.email !== currentUser.email) {
      const div = document.createElement("div");
      div.classList.add("user-item");
      div.innerHTML = `
        <img src="${u.photoURL || 'https://i.imgur.com/8Km9tLL.png'}" class="avatar">
        <div>
          <strong>${u.displayName}</strong><br>
          <small>${u.online ? "🟢 Online" : "⚫ Offline"} — ${u.bio}</small>
        </div>`;
      div.onclick = () => openChat(docSnap.id, u);
      usersList.appendChild(div);
    }
  });
}

// Enviar mensagem (texto ou imagem)
sendBtn.onclick = async () => {
  if (!msgInput.value && !imageInput.files[0]) return;
  const chatId = [currentUser.uid, selectedUser.uid].sort().join("_");
  let imageUrl = "";

  if (imageInput.files[0]) {
    const imgRef = ref(storage, `chats/${chatId}/${Date.now()}.jpg`);
    await uploadBytes(imgRef, imageInput.files[0]);
    imageUrl = await getDownloadURL(imgRef);
  }

  await addDoc(collection(db, "chats", chatId, "messages"), {
    from: currentUser.uid,
    to: selectedUser.uid,
    text: msgInput.value,
    image: imageUrl,
    createdAt: serverTimestamp()
  });
  msgInput.value = "";
  imageInput.value = "";
};

// Abrir chat
function openChat(uid, userObj) {
  selectedUser = { uid, ...userObj };
  chatWith.textContent = userObj.displayName;
  statusText.textContent = userObj.online ? "🟢 online" : "⚫ offline";
  chatBox.classList.remove("hidden");
  listenMessages();
}

// Escutar mensagens
function listenMessages() {
  const chatId = [currentUser.uid, selectedUser.uid].sort().join("_");
  const q = query(collection(db, "chats", chatId, "messages"), orderBy("createdAt"));
  onSnapshot(q, snap => {
    messagesDiv.innerHTML = "";
    snap.forEach(docSnap => {
      const msg = docSnap.data();
      const div = document.createElement("div");
      div.classList.add(msg.from === currentUser.uid ? "me" : "them");
      div.innerHTML = `
        ${msg.text ? `<p>${msg.text}</p>` : ""}
        ${msg.image ? `<img src="${msg.image}" class="chat-img">` : ""}
      `;
      messagesDiv.appendChild(div);
    });
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  });
}

// Tabs
tabUsers.onclick = () => {
  usersList.classList.remove("hidden");
  chatsList.classList.add("hidden");
};
tabChats.onclick = () => {
  usersList.classList.add("hidden");
  chatsList.classList.remove("hidden");
};

// (extra) Carrega lista de conversas futuras
function loadChats() {
  chatsList.innerHTML = `<p style="text-align:center;color:gray;">(Conversas recentes aparecerão aqui)</p>`;
}
