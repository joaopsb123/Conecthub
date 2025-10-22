// Importações Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc, updateDoc, getDocs, collection, query, where, addDoc, onSnapshot, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-storage.js";

// Configuração Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBI_4n8aBT9ZPiLy8cwgiQDtD0_CYSKk4E",
  authDomain: "videot-2fcec.firebaseapp.com",
  projectId: "videot-2fcec",
  storageBucket: "videot-2fcec.firebasestorage.app",
  messagingSenderId: "583396995831",
  appId: "1:583396995831:web:6182575e28ea628cc259f2",
  measurementId: "G-2ERH0XEGSX"
};

// Inicializa Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

// Elementos
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const signupBtn = document.getElementById("signupBtn");
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const chatSection = document.getElementById("chat-section");
const authSection = document.getElementById("auth-section");
const userEmail = document.getElementById("userEmail");
const searchInput = document.getElementById("searchUser");
const searchResults = document.getElementById("searchResults");
const chatBox = document.getElementById("chatBox");
const chatWith = document.getElementById("chatWith");
const messagesDiv = document.getElementById("messages");
const msgInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendMsg");
const profilePicInput = document.getElementById("profilePic");

let currentUser = null;
let selectedUser = null;

// Criação de conta
signupBtn.onclick = async () => {
  try {
    const userCred = await createUserWithEmailAndPassword(auth, emailInput.value, passwordInput.value);
    await setDoc(doc(db, "users", userCred.user.uid), {
      email: userCred.user.email,
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

// Atualiza status online/offline
async function setUserStatus(uid, online) {
  await updateDoc(doc(db, "users", uid), {
    online,
    lastActive: serverTimestamp()
  });
}

// Autenticação em tempo real
onAuthStateChanged(auth, async user => {
  if (user) {
    currentUser = user;
    userEmail.textContent = user.email;
    authSection.classList.add("hidden");
    chatSection.classList.remove("hidden");

    await setUserStatus(user.uid, true);
    window.addEventListener("beforeunload", () => setUserStatus(user.uid, false));
  } else {
    currentUser = null;
    authSection.classList.remove("hidden");
    chatSection.classList.add("hidden");
  }
});

// Upload de foto de perfil
profilePicInput.onchange = async e => {
  const file = e.target.files[0];
  if (!file || !currentUser) return;

  const storageRef = ref(storage, `profiles/${currentUser.uid}.jpg`);
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);
  await updateDoc(doc(db, "users", currentUser.uid), { photoURL: url });
  alert("Foto de perfil atualizada!");
};

// Pesquisar usuários
searchInput.oninput = async () => {
  const q = query(collection(db, "users"), where("email", ">=", searchInput.value), where("email", "<=", searchInput.value + "\uf8ff"));
  const snap = await getDocs(q);
  searchResults.innerHTML = "";

  snap.forEach(docSnap => {
    const u = docSnap.data();
    if (u.email !== currentUser.email) {
      const div = document.createElement("div");
      div.classList.add("user-item");
      div.innerHTML = `
        <img src="${u.photoURL || 'https://i.imgur.com/8Km9tLL.png'}" class="avatar">
        <div>
          <strong>${u.email}</strong><br>
          <small>${u.online ? "🟢 Online" : "⚫ Offline"}</small>
        </div>`;
      div.onclick = () => openChat(docSnap.id, u);
      searchResults.appendChild(div);
    }
  });
};

// Abrir chat
function openChat(uid, userObj) {
  selectedUser = { uid, ...userObj };
  chatWith.textContent = userObj.email;
  chatBox.classList.remove("hidden");
  listenMessages();
}

// Enviar mensagem
sendBtn.onclick = async () => {
  if (!msgInput.value.trim()) return;
  const chatId = [currentUser.uid, selectedUser.uid].sort().join("_");
  await addDoc(collection(db, "chats", chatId, "messages"), {
    from: currentUser.uid,
    to: selectedUser.uid,
    text: msgInput.value,
    createdAt: serverTimestamp()
  });
  await updateDoc(doc(db, "users", currentUser.uid), { lastActive: serverTimestamp() });
  msgInput.value = "";
}

// Receber mensagens em tempo real
function listenMessages() {
  const chatId = [currentUser.uid, selectedUser.uid].sort().join("_");
  const q = query(collection(db, "chats", chatId, "messages"), orderBy("createdAt"));
  onSnapshot(q, snap => {
    messagesDiv.innerHTML = "";
    snap.forEach(docSnap => {
      const msg = docSnap.data();
      const div = document.createElement("div");
      div.textContent = (msg.from === currentUser.uid ? "Você: " : selectedUser.email + ": ") + msg.text;
      div.classList.add(msg.from === currentUser.uid ? "me" : "them");
      messagesDiv.appendChild(div);
    });
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  });
}
