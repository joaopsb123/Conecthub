import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc, getDocs, collection, addDoc, onSnapshot, updateDoc, query, orderBy, arrayUnion } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-storage.js";

/* ---------------- CONFIG ---------------- */
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

/* ---------------- TEMA ---------------- */
themeToggle.onclick = () => {
  document.body.classList.toggle("light");
};
if (localStorage.getItem("theme")==="light") document.body.classList.add("light");

/* ---------------- AUTH ---------------- */
signupBtn.onclick = async () => {
  const email = emailEl.value.trim();
  const pass = passEl.value;
  if(!email||!pass)return alert("Preenche email e senha!");
  try{
    const cred = await createUserWithEmailAndPassword(auth,email,pass);
    const uid = cred.user.uid;
    await setDoc(doc(db,"users",uid),{
      displayName:displayNameEl.value||email.split("@")[0],
      bio:bioEl.value||"",
      email, photoURL:"", friends:[], createdAt:new Date(), lastActive:new Date()
    });
  }catch(e){alert(e.message);}
};

loginBtn.onclick = async () => {
  try{await signInWithEmailAndPassword(auth,emailEl.value,passEl.value);}catch(e){alert(e.message);}
};

logoutBtn.onclick = async () => {
  if(currentUser) await updateDoc(doc(db,"users",currentUser.uid),{lastActive:new Date()});
  await signOut(auth);
};

/* ---------------- ON AUTH ---------------- */
onAuthStateChanged(auth,async(u)=>{
  if(u){
    currentUser=u;
    authBox.classList.add("hidden");
    userPanel.classList.remove("hidden");
    const snap = await getDoc(doc(db,"users",u.uid));
    currentUserData = snap.data();
    userNameLabel.textContent = currentUserData.displayName;
    userEmailLabel.textContent =currentUserData.email;
    if(currentUserData.photoURL)userPic.src=currentUserData.photoURL;

    loadFeed();
    loadVideos();
  }else{
    currentUser=null;
    authBox.classList.remove("hidden");
    userPanel.classList.add("hidden");
    feedPosts.innerHTML="";
    feedVideos.innerHTML="";
  }
});

/* ---------------- FEED ---------------- */
async function loadFeed(){
  feedPosts.innerHTML="";
  const snap = await getDocs(query(collection(db,"posts"),orderBy("createdAt","desc")));
  snap.forEach(docSnap=>{
    const p = docSnap.data();
    const div = document.createElement("div");
    div.className="feed-card";
    div.innerHTML=`
      ${p.type==="video"?`<video src="${p.url}" controls></video>`:`<img src="${p.url}">`}
      <div class="info">
        <div class="user-name">${p.userName}</div>
        <div class="caption">${p.caption||""}</div>
      </div>
    `;
    feedPosts.appendChild(div);
  });
}

async function loadVideos(){
  feedVideos.innerHTML="";
  const snap = await getDocs(query(collection(db,"posts"),orderBy("createdAt","desc")));
  snap.forEach(docSnap=>{
    const p = docSnap.data();
    if(p.type==="video"){
      const div = document.createElement("div");
      div.className="feed-card";
      div.innerHTML=`<video src="${p.url}" controls></video>
      <div class="info">
        <div class="user-name">${p.userName}</div>
        <div class="caption">${p.caption||""}</div>
      </div>`;
      feedVideos.appendChild(div);
    }
  });
}

/* ---------------- TABS ---------------- */
tabFeed.onclick=()=>{feedSection.classList.remove("hidden");videoSection.classList.add("hidden");chatBox.classList.add("hidden");usersSection?.classList.add("hidden");}
tabVideos.onclick=()=>{feedSection.classList.add("hidden");videoSection.classList.remove("hidden");chatBox.classList.add("hidden");usersSection?.classList.add("hidden");}
tabChats.onclick=()=>{feedSection.classList.add("hidden");videoSection.classList.add("hidden");chatBox.classList.remove("hidden");usersSection?.classList.add
