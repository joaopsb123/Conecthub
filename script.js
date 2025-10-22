import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc, getDocs, collection, addDoc, updateDoc, onSnapshot, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyBI_4n8aBT9ZPiLy8cwgiQDtD0_CYSKk4E",
  authDomain: "videot-2fcec.firebaseapp.com",
  projectId: "videot-2fcec",
  storageBucket: "videot-2fcec.firebasestorage.app",
  messagingSenderId: "583396995831",
  appId: "1:583396995831:web:6182575e28ea628cc259f2"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

const authBox = document.getElementById("auth-box");
const userPanel = document.getElementById("user-panel");
const emailEl = document.getElementById("email");
const passEl = document.getElementById("password");
const displayNameEl = document.getElementById("displayName");
const bioEl = document.getElementById("bio");
const signupBtn = document.getElementById("signupBtn");
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const userPic = document.getElementById("userPic");
const profilePic = document.getElementById("profilePic");
const uploadPost = document.getElementById("uploadPost");
const postMedia = document.getElementById("postMedia");
const postCaption = document.getElementById("postCaption");
const feedPosts = document.getElementById("feedPosts");

let currentUser = null;

signupBtn.onclick = async ()=>{
  try {
    const cred = await createUserWithEmailAndPassword(auth, emailEl.value, passEl.value);
    await setDoc(doc(db, "users", cred.user.uid), {
      displayName: displayNameEl.value || emailEl.value.split('@')[0],
      bio: bioEl.value || "",
      email: emailEl.value,
      photoURL: "",
      createdAt: serverTimestamp()
    });
  } catch(e) {
    alert(e.message);
  }
}

loginBtn.onclick = async ()=>{
  try {
    await signInWithEmailAndPassword(auth, emailEl.value, passEl.value);
  } catch(e) {
    alert(e.message);
  }
}

logoutBtn.onclick = async ()=>{
  await signOut(auth);
}

onAuthStateChanged(auth, async (user)=>{
  if(user){
    authBox.classList.add("hidden");
    userPanel.classList.remove("hidden");
    currentUser = user;
    loadFeed();
  } else {
    authBox.classList.remove("hidden");
    userPanel.classList.add("hidden");
  }
});

profilePic.onchange = async (e)=>{
  if(!currentUser) return;
  const file = e.target.files[0];
  const storageRef = ref(storage, `profiles/${currentUser.uid}`);
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);
  await updateDoc(doc(db, "users", currentUser.uid), { photoURL: url });
  userPic.src = url;
}

uploadPost.onclick = async ()=>{
  if(!currentUser) return alert("Faça login primeiro!");
  const file = postMedia.files[0];
  if(!file) return alert("Escolha uma imagem ou vídeo.");
  const storageRef = ref(storage, `posts/${Date.now()}_${file.name}`);
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);
  await addDoc(collection(db, "posts"), {
    userId: currentUser.uid,
    userName: currentUser.displayName || currentUser.email.split('@')[0],
    caption: postCaption.value,
    url,
    type: file.type.includes('video') ? 'video' : 'image',
    createdAt: serverTimestamp()
  });
  postCaption.value = "";
  postMedia.value = null;
  loadFeed();
}

async function loadFeed(){
  feedPosts.innerHTML = "";
  const snap = await getDocs(query(collection(db, "posts"), orderBy("createdAt", "desc")));
  snap.forEach(d => {
    const post = d.data();
    const card = document.createElement("div");
    card.className = "post-card";
    card.innerHTML = `
      ${post.type==='video'?`<video src="${post.url}" controls></video>`:`<img src="${post.url}" alt="post">`}
      <div class="post-info">
        <strong>${post.userName}</strong>
        <p>${post.caption || ''}</p>
      </div>
    `;
    feedPosts.appendChild(card);
  });
      }
