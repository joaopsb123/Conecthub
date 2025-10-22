import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { 
  getFirestore, doc, setDoc, getDoc, getDocs, collection, addDoc, onSnapshot, updateDoc, query, orderBy, arrayUnion, arrayRemove, serverTimestamp, where 
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-storage.js";

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

/* ---------------- ELEMENTOS DOM ---------------- */
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

const tabFeed = document.getElementById("tabFeed");
const tabVideos = document.getElementById("tabVideos");
const tabChats = document.getElementById("tabChats");
const tabUsers = document.getElementById("tabUsers");

const feedSection = document.getElementById("feedSection");
const videoSection = document.getElementById("videoSection");
const usersSection = document.getElementById("usersSection");

const feedPosts = document.getElementById("feedPosts");
const feedVideos = document.getElementById("feedVideos");
const usersList = document.getElementById("usersList");

const chatBox = document.getElementById("chatBox");
const chatWithName = document.getElementById("chatWithName");
const chatWithPic = document.getElementById("chatWithPic");
const statusText = document.getElementById("statusText");
const messagesDiv = document.getElementById("messages");
const messageInput = document.getElementById("messageInput");
const sendMsgBtn = document.getElementById("sendMsg");

const themeToggle = document.getElementById("themeToggle");

/* ---------------- VARIÁVEIS ---------------- */
let currentUser = null;
let currentUserData = null;
let selectedUser = null;
let messagesUnsub = null;

/* ---------------- TEMA ---------------- */
themeToggle.onclick = () => {
  document.body.classList.toggle("light");
  localStorage.setItem("theme", document.body.classList.contains("light") ? "light" : "dark");
};
if(localStorage.getItem("theme")==="light") document.body.classList.add("light");

/* ---------------- AUTENTICAÇÃO ---------------- */
signupBtn.onclick = async () => {
  const email = emailEl.value.trim();
  const pass = passEl.value;
  const name = displayNameEl.value.trim() || email.split("@")[0];
  const bio = bioEl.value.trim() || "";
  if(!email || !pass) return alert("Preenche email e senha!");
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    await setDoc(doc(db, "users", cred.user.uid), {
      displayName: name,
      bio,
      email,
      photoURL: "",
      friends: [],
      createdAt: serverTimestamp(),
      lastActive: serverTimestamp()
    });
  } catch(e) { alert(e.message); }
};

loginBtn.onclick = async () => {
  try { await signInWithEmailAndPassword(auth, emailEl.value.trim(), passEl.value); }
  catch(e){ alert(e.message); }
};

logoutBtn.onclick = async () => {
  if(currentUser) await updateDoc(doc(db,"users",currentUser.uid), {lastActive: serverTimestamp()});
  await signOut(auth);
};

/* ---------------- AUTH STATE ---------------- */
onAuthStateChanged(auth, async (user) => {
  if(user){
    currentUser = user;
    authBox.classList.add("hidden");
    userPanel.classList.remove("hidden");

    const snap = await getDoc(doc(db,"users",user.uid));
    currentUserData = snap.data();
    userNameLabel.textContent = currentUserData.displayName;
    userEmailLabel.textContent = currentUserData.email;
    if(currentUserData.photoURL) userPic.src = currentUserData.photoURL;

    loadFeed();
    loadVideos();
    loadUsers();
  } else {
    currentUser = null;
    currentUserData = null;
    authBox.classList.remove("hidden");
    userPanel.classList.add("hidden");
    feedPosts.innerHTML = "";
    feedVideos.innerHTML = "";
    usersList.innerHTML = "";
    chatBox.classList.add("hidden");
    if(messagesUnsub) messagesUnsub();
  }
});

/* ---------------- UPLOAD DE PERFIL ---------------- */
profilePicInput.onchange = async(e)=>{
  if(!currentUser) return;
  const file = e.target.files[0];
  if(!file) return;
  const ext = file.type.includes("video") ? "mp4" : "jpg";
  const storageRef = ref(storage, `profiles/${currentUser.uid}.${ext}`);
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);
  await updateDoc(doc(db,"users",currentUser.uid), {photoURL:url});
  userPic.src = url;
};

/* ---------------- LOAD FEED ---------------- */
async function loadFeed(){
  feedPosts.innerHTML="";
  const snap = await getDocs(query(collection(db,"posts"),orderBy("createdAt","desc")));
  snap.forEach(docSnap=>{
    const post = docSnap.data();
    const div = document.createElement("div");
    div.className = "feed-card";
    div.innerHTML = `
      ${post.type==="video"?`<video src="${post.url}" controls></video>`:`<img src="${post.url}">`}
      <div class="info">
        <div class="user-name">${post.userName}</div>
        <div class="caption">${post.caption||""}</div>
        <div class="actions">
          <button onclick="likePost('${docSnap.id}')">❤️ ${post.likes?.length||0}</button>
        </div>
      </div>
    `;
    feedPosts.appendChild(div);
  });
}

/* ---------------- LOAD VÍDEOS ---------------- */
async function loadVideos(){
  feedVideos.innerHTML="";
  const snap = await getDocs(query(collection(db,"posts"),orderBy("createdAt","desc")));
  snap.forEach(docSnap=>{
    const post = docSnap.data();
    if(post.type==="video"){
      const div = document.createElement("div");
      div.className = "feed-card";
      div.innerHTML = `
        <video src="${post.url}" controls></video>
        <div class="info">
          <div class="user-name">${post.userName}</div>
          <div class="caption">${post.caption||""}</div>
          <div class="actions">
            <button onclick="likePost('${docSnap.id}')">❤️ ${post.likes?.length||0}</button>
          </div>
        </div>
      `;
      feedVideos.appendChild(div);
    }
  });
}

/* ---------------- CURTIR POST ---------------- */
window.likePost = async (postId) => {
  if(!currentUser) return alert("Faz login para curtir");
  const postRef = doc(db,"posts",postId);
  await updateDoc(postRef,{
    likes: arrayUnion(currentUser.uid)
  });
  loadFeed();
  loadVideos();
}

/* ---------------- TABS ---------------- */
tabFeed.onclick = ()=>{feedSection.classList.remove("hidden");videoSection.classList.add("hidden");chatBox.classList.add("hidden");usersSection?.classList.add("hidden");}
tabVideos.onclick = ()=>{feedSection.classList.add("hidden");videoSection.classList.remove("hidden");chatBox.classList.add("hidden");usersSection?.classList.add("hidden");}
tabChats.onclick = ()=>{feedSection.classList.add("hidden");videoSection.classList.add("hidden");chatBox.classList.remove("hidden");usersSection?.classList.add("hidden");}
tabUsers.onclick = ()=>{feedSection.classList.add("hidden");videoSection.classList.add("hidden");chatBox.classList.add("hidden");usersSection?.classList.remove("hidden");}

/* ---------------- LISTA DE USUÁRIOS ---------------- */
async function loadUsers(){
  usersList.innerHTML="";
  const snap = await getDocs(collection(db,"users"));
  snap.forEach(docSnap=>{
    const u = docSnap.data();
    if(u.email === currentUser.email) return;
    const div = document.createElement("div");
    div.className="user-item";
    div.innerHTML = `
      <img src="${u.photoURL||'https://i.imgur.com/8Km9tLL.png'}" class="avatar">
      <div class="user-info">
        <div class="name">${u.displayName}</div>
        <div class="small">${u.bio||""}</div>
      </div>
      <div class="actions">
        <button onclick="startChat('${docSnap.id}','${u.displayName}','${u.photoURL||''}')">Chat</button>
      </div>
    `;
    usersList.appendChild(div);
  });
}

/* ---------------- CHAT ---------------- */
window.startChat = async (uid,name,photo)=>{
  selectedUser = {uid,name,photo};
  chatBox.classList.remove("hidden");
  chatWithName.textContent = name;
  chatWithPic.src = photo||'https://i.imgur.com/8Km9tLL.png';
  messagesDiv.innerHTML="";

  if(messagesUnsub) messagesUnsub();
  const chatId = [currentUser.uid, uid].sort().join("_");
  const q = query(collection(db,"chats",chatId,"messages"),orderBy("createdAt"));
  messagesUnsub = onSnapshot(q,snap=>{
    messagesDiv.innerHTML="";
    snap.forEach(d=>{
      const m = d.data();
      const div = document.createElement("div");
      div.className = "message "+(m.from===currentUser.uid?"me":"them");
      div.innerHTML = `<div class="msg-name">${m.fromName}</div><div class="msg-text">${m.text}</div>`;
      messagesDiv.appendChild(div);
    });
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  });
}

sendMsgBtn.onclick = async ()=>{
  if(!messageInput.value.trim() || !selectedUser) return;
  const chatId = [currentUser.uid, selectedUser.uid].sort().join("_");
  await addDoc(collection(db,"chats",chatId,"messages"),{
    from: currentUser.uid,
    fromName: currentUserData.displayName,
    to: selectedUser.uid,
    text: messageInput.value.trim(),
    createdAt: serverTimestamp()
  });
  messageInput.value="";
}
