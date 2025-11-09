// app.js
// Usa Firebase modular SDK (v9+). Guarda os dados em Firestore, usa Auth e Storage.
// Requisitos: coloca index.html, styles.css e app.js juntos. Abre em servidor (https recomendado para FCM).

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-analytics.js";

import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  updateProfile
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";

import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  addDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  updateDoc,
  onSnapshot,
  limit
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";

import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-storage.js";

import { getMessaging, getToken } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-messaging.js";

/* ===========================
   CONFIGURAÇÃO DO FIREBASE
   =========================== */
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
let analytics = null;
try {
  analytics = getAnalytics(app);
  console.log('Analytics ready');
} catch (e) {
  console.warn('Analytics not available in this environment', e);
}

const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Messaging (FCM) - requires service worker + server key to fully work for push notifications.
// Here we initialise client token retrieval placeholder.
let messaging = null;
try {
  messaging = getMessaging(app);
} catch (e) {
  console.warn('Messaging init failed (needs https and service worker):', e);
}

/* ===========================
   HELPERS
   =========================== */
const $ = id => document.getElementById(id);
const hide = el => el.classList.add('hidden');
const show = el => el.classList.remove('hidden');

function randomCode(len = 6){
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i=0;i<len;i++) s += chars[Math.floor(Math.random()*chars.length)];
  return s;
}

function todayISO(){
  return new Date().toISOString().slice(0,10);
}

/* ===========================
   UI ELEMENTS
   =========================== */
const authScreen = $('authScreen');
const authTabs = document.querySelectorAll('.tab');
const loginForm = $('loginForm');
const signupForm = $('signupForm');
const loginEmail = $('loginEmail');
const loginPassword = $('loginPassword');
const signupName = $('signupName');
const signupEmail = $('signupEmail');
const signupPassword = $('signupPassword');
const signupInvite = $('signupInvite');
const loginBtn = $('loginBtn');
const signupBtn = $('signupBtn');

const mainApp = $('mainApp');
const logoutBtn = $('logoutBtn');
const profileBtn = $('profileBtn');
const profileModal = $('profileModal');
const profilePic = $('profilePic');
const profilePicFile = $('profilePicFile');
const profileName = $('profileName');
const profileEmail = $('profileEmail');
const saveProfileBtn = $('saveProfileBtn');
const profilePoints = $('profilePoints');

const feedList = $('feedList');
const bigFire = $('bigFire');
const registerTodayBtn = $('registerTodayBtn');
const sendFireBtn = $('sendFireBtn');
const streakInfo = $('streakInfo');

const missionsList = $('missionsList');
const conversationsList = $('conversationsList');
const invitesList = $('invitesList');

const newInviteBtn = $('newInviteBtn');
const inviteModal = $('inviteModal');
const generateInviteBtn = $('generateInviteBtn');
const newInviteCode = $('newInviteCode');

const chatModal = $('chatModal');
const chatTitle = $('chatTitle');
const chatMessages = $('chatMessages');
const chatText = $('chatText');
const chatSendBtn = $('chatSendBtn');

/* ===========================
   AUTH TABS
   =========================== */
authTabs.forEach(btn=>{
  btn.addEventListener('click', ()=>{
    document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
    btn.classList.add('active');
    const tab = btn.dataset.tab;
    if (tab === 'login'){
      show(loginForm); hide(signupForm);
    } else {
      show(signupForm); hide(loginForm);
    }
  });
});

/* ===========================
   AUTH: login / signup
   =========================== */
loginForm.addEventListener('submit', async e=>{
  e.preventDefault();
  loginBtn.disabled = true;
  try {
    await signInWithEmailAndPassword(auth, loginEmail.value, loginPassword.value);
    // onAuthStateChanged will handle UI
  } catch (err){
    alert('Erro ao entrar: ' + err.message);
  } finally { loginBtn.disabled = false; }
});

signupForm.addEventListener('submit', async e=>{
  e.preventDefault();
  signupBtn.disabled = true;
  try {
    // verify invite
    const code = signupInvite.value.trim().toUpperCase();
    const ref = doc(db, 'invites', code);
    const snap = await getDoc(ref);
    if (!snap.exists()){
      alert('Código de convite inválido.');
      signupBtn.disabled = false;
      return;
    }
    const inv = snap.data();
    if (!inv.valid){
      alert('Convite expirado ou inválido.');
      signupBtn.disabled = false;
      return;
    }

    // create user
    const userCred = await createUserWithEmailAndPassword(auth, signupEmail.value, signupPassword.value);
    const user = userCred.user;

    // set displayName
    await updateProfile(user, { displayName: signupName.value });

    // create user doc
    const userDoc = doc(db, 'users', user.uid);
    await setDoc(userDoc, {
      name: signupName.value,
      email: signupEmail.value,
      createdAt: serverTimestamp(),
      streak: 0,
      lastFire: null,
      points: 0,
      inviteUsed: code
    });

    // optional: mark invite as used (or keep valid to allow multiple uses)
    // aqui vamos manter a possibilidade de o criador decidir; por agora mantemos como usadoBy array
    try {
      const invref = doc(db, 'invites', code);
      const invSnap = await getDoc(invref);
      const prev = invSnap.data() || {};
      const usedBy = prev.usedBy ? [...prev.usedBy, user.uid] : [user.uid];
      await updateDoc(invref, { usedBy });
    } catch(e){ console.warn('Erro a marcar invite como usado', e); }

    // logged in (auth state change)
  } catch (err){
    alert('Erro ao registar: ' + err.message);
  } finally { signupBtn.disabled = false; }
});

/* ===========================
   AUTH STATE CHANGE
   =========================== */
let currentUser = null;
onAuthStateChanged(auth, async user=>{
  currentUser = user;
  if (user){
    // show main app
    hide(authScreen); show(mainApp);
    // load profile and UI
    await loadProfileUI();
    subscribeToFeed();
    loadMissions();
    loadConversations();
    loadInvites();
    restoreStreakUI();
    tryInitMessaging();
  } else {
    // show auth
    show(authScreen); hide(mainApp);
    // cleanup listeners if needed (not fully implemented)
    feedList.innerHTML = '';
  }
});

/* ===========================
   PROFILE
   =========================== */
profileBtn.addEventListener('click', ()=> openModal('profileModal'));
document.querySelectorAll('.closeModal').forEach(b=>{
  b.addEventListener('click', (e)=>{
    const target = b.dataset.target;
    if (target) hide($(target));
    else b.closest('.modal').classList.add('hidden');
  });
});

async function loadProfileUI(){
  const u = auth.currentUser;
  if (!u) return;
  profileEmail.value = u.email || '';
  profileName.value = u.displayName || '';

  // load profile pic and points from user doc
  const docRef = doc(db, 'users', u.uid);
  const snap = await getDoc(docRef);
  if (snap.exists()){
    const data = snap.data();
    profilePoints.textContent = data.points || 0;
    if (data.photoURL){
      profilePic.src = data.photoURL;
    } else {
      profilePic.src = `https://ui-avatars.com/api/?name=${encodeURIComponent((data.name||u.email).slice(0,15))}&background=ff7a18&color=06101a`;
    }
  } else {
    profilePic.src = `https://ui-avatars.com/api/?name=${encodeURIComponent((u.displayName||u.email).slice(0,15))}&background=ff7a18&color=06101a`;
  }
}

saveProfileBtn.addEventListener('click', async ()=>{
  const name = profileName.value.trim();
  const file = profilePicFile.files[0];
  if (!currentUser) return alert('Sem utilizador');
  saveProfileBtn.disabled = true;
  try {
    let photoURL = null;
    if (file){
      const r = storageRef(storage, `avatars/${currentUser.uid}/${file.name}`);
      await uploadBytes(r, file);
      photoURL = await getDownloadURL(r);
    }

    // update auth profile
    await updateProfile(currentUser, { displayName: name, photoURL: photoURL || currentUser.photoURL || null });

    // update user doc
    const udoc = doc(db, 'users', currentUser.uid);
    const payload = { name };
    if (photoURL) payload.photoURL = photoURL;
    await updateDoc(udoc, payload);

    alert('Perfil guardado.');
    await loadProfileUI();
  } catch (e){
    console.error(e);
    alert('Erro ao guardar perfil: ' + e.message);
  } finally { saveProfileBtn.disabled = false; }
});

/* ===========================
   INVITES (gerar / listar)
   =========================== */
newInviteBtn.addEventListener('click', ()=> openModal('inviteModal'));
generateInviteBtn.addEventListener('click', async ()=>{
  if (!currentUser) return alert('Tem de entrar.');
  generateInviteBtn.disabled = true;
  try {
    const code = randomCode(7);
    const docRef = doc(db, 'invites', code);
    await setDoc(docRef, {
      code,
      createdBy: currentUser.uid,
      createdAt: serverTimestamp(),
      valid: true,
      usedBy: []
    });
    newInviteCode.textContent = `Código: ${code} — copia e partilha com amigos`;
    loadInvites(); // refresh
  } catch (e){
    console.error(e);
    alert('Erro a gerar convite: ' + e.message);
  } finally { generateInviteBtn.disabled = false; }
});

async function loadInvites(){
  invitesList.innerHTML = '';
  if (!currentUser) return;
  try {
    const q = query(collection(db, 'invites'), where('createdBy','==',currentUser.uid), orderBy('createdAt','desc'), limit(10));
    const snap = await getDocs(q);
    if (snap.empty){ invitesList.innerHTML = '<div class="muted small">Sem convites criados</div>'; return; }
    snap.forEach(docSnap=>{
      const d = docSnap.data();
      const el = document.createElement('div');
      el.className = 'muted small';
      el.textContent = `${d.code} · ${d.usedBy?.length||0} usado(s)`;
      invitesList.appendChild(el);
    });
  } catch(e){ console.warn(e); }
}

/* ===========================
   FEED (simples) - mostra eventos públicos (ex: user acendeu)
   =========================== */
function subscribeToFeed(){
  feedList.innerHTML = '';
  // We'll listen to latest 'activities' collection (or create one when users fire)
  const activitiesRef = collection(db, 'activities');
  const q = query(activitiesRef, orderBy('createdAt','desc'), limit(20));
  onSnapshot(q, snapshot=>{
    feedList.innerHTML = '';
    snapshot.forEach(docSnap=>{
      const a = docSnap.data();
      const card = document.createElement('div');
      card.className = 'feed-card';
      const img = document.createElement('img');
      img.className = 'avatar';
      img.src = a.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(a.name||'User')}&background=ff7a18&color=06101a`;
      const meta = document.createElement('div');
      meta.className = 'meta';
      meta.innerHTML = `<strong>${a.name}</strong><div class="muted small">${a.text}</div><div class="muted small">${new Date(a.createdAt?.toMillis?.() || Date.now()).toLocaleString()}</div>`;
      card.appendChild(img); card.appendChild(meta);
      feedList.appendChild(card);
    });
  });
}

/* ===========================
   FOGUINHO / STREAK
   =========================== */
registerTodayBtn.addEventListener('click', registerToday);
bigFire.addEventListener('click', async ()=>{
  // acender visually and register (optionally share to feed)
  flashFire();
  await registerToday(true);
});

async function registerToday(alsoPublish=false){
  if (!currentUser) return alert('Tem de entrar.');
  registerTodayBtn.disabled = true;
  try {
    const userDocRef = doc(db, 'users', currentUser.uid);
    const snap = await getDoc(userDocRef);
    const data = snap.exists() ? snap.data() : {};
    const last = data.lastFire || null;
    const today = todayISO();
    let newStreak = 1;
    if (last === today){
      newStreak = data.streak || 0;
      alert('Já registaste hoje — streak mantido.');
    } else if (last === previousDayISO()){
      newStreak = (data.streak || 0) + 1;
    } else {
      newStreak = 1;
    }

    await updateDoc(userDocRef, { streak: newStreak, lastFire: today });

    // create an activity for feed
    if (alsoPublish){
      const activitiesRef = collection(db, 'activities');
      await addDoc(activitiesRef, {
        userId: currentUser.uid,
        name: currentUser.displayName || currentUser.email,
        photoURL: currentUser.photoURL || null,
        text: `Acendeu o foguinho (streak ${newStreak})`,
        createdAt: serverTimestamp()
      });
    }

    // show UI
    streakInfo.textContent = `Streak: ${newStreak} dias`;
  } catch (e){
    console.error(e);
    alert('Erro ao registar dia: ' + e.message);
  } finally { registerTodayBtn.disabled = false; }
}

function previousDayISO(){
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0,10);
}

function flashFire(){
  bigFire.animate([
    { transform: 'scale(1)', opacity: 1 },
    { transform: 'scale(1.18)', opacity: 1 },
    { transform: 'scale(0.9)', opacity: 0.9 },
    { transform: 'scale(1)', opacity: 1 }
  ], { duration: 700, easing: 'ease-out' });
}

/* ===========================
   MISSÕES
   =========================== */
async function loadMissions(){
  missionsList.innerHTML = '<div class="muted small">A carregar...</div>';
  try {
    const snap = await getDocs(collection(db, 'missions'));
    missionsList.innerHTML = '';
    if (snap.empty){ missionsList.innerHTML = '<div class="muted small">Sem missões definidas</div>'; return; }
    snap.forEach(docSnap=>{
      const m = docSnap.data();
      const li = document.createElement('li');
      li.className = 'mission';
      li.innerHTML = `<div><strong>${m.title}</strong><div class="muted small">${m.desc||''}</div></div><div><button data-id="${docSnap.id}" class="completeMissionBtn">Completar</button></div>`;
      missionsList.appendChild(li);
    });
    document.querySelectorAll('.completeMissionBtn').forEach(b=>{
      b.addEventListener('click', completeMission);
    });
  } catch(e){
    console.warn(e);
    missionsList.innerHTML = '<div class="muted small">Erro a carregar missões</div>';
  }
}

async function completeMission(e){
  if (!currentUser) return alert('Tem de entrar');
  const missionId = e.target.dataset.id;
  try {
    // Add to user's completed list and give points
    const mRef = doc(db, 'missions', missionId);
    const mSnap = await getDoc(mRef);
    if (!mSnap.exists()) return alert('Missão não encontrada');
    const m = mSnap.data();
    // Add entry in user_missions
    const userMissionRef = doc(db, 'user_missions', `${currentUser.uid}_${missionId}`);
    await setDoc(userMissionRef, {
      userId: currentUser.uid,
      missionId,
      completedAt: serverTimestamp()
    });

    // update user points
    const userRef = doc(db, 'users', currentUser.uid);
    const userSnap = await getDoc(userRef);
    const prevPoints = (userSnap.exists() && userSnap.data().points) || 0;
    await updateDoc(userRef, { points: prevPoints + (m.reward || 5) });
    alert('Missão completada! Recebeste pontos.');
    await loadProfileUI();
  } catch(e){
    console.error(e);
    alert('Erro: ' + e.message);
  }
}

/* ===========================
   MESSAGES (simples 1:1)
   =========================== */
async function loadConversations(){
  conversationsList.innerHTML = '<div class="muted small">A carregar...</div>';
  if (!currentUser) return;
  try {
    // query recent messages where currentUser is participant
    const q = query(collection(db, 'messages'), where('participants', 'array-contains', currentUser.uid), orderBy('lastAt','desc'), limit(20));
    const snap = await getDocs(q);
    conversationsList.innerHTML = '';
    if (snap.empty) { conversationsList.innerHTML = '<div class="muted small">Sem conversas</div>'; return; }
    snap.forEach(docSnap=>{
      const d = docSnap.data();
      const otherId = d.participants.find(id=>id !== currentUser.uid);
      const el = document.createElement('div');
      el.className = 'conversation';
      el.textContent = `${d.title || 'Chat'} · ${d.lastMsg?.slice(0,30) || ''}`;
      el.addEventListener('click', ()=> openChat(docSnap.id, otherId, d.title));
      conversationsList.appendChild(el);
    });
  } catch(e){ console.warn(e); conversationsList.innerHTML = '<div class="muted small">Erro</div>'; }
}

// open or create a chat room ID between current user and other user id
async function openChat(roomId, otherId, title){
  if (!currentUser) return alert('Tem de entrar');
  // if roomId given, load messages; else create new
  let roomRef;
  if (roomId){
    roomRef = doc(db, 'messages', roomId);
  } else {
    // create a deterministic id or add new
    roomRef = await addDoc(collection(db, 'messages'), {
      participants: [currentUser.uid, otherId],
      title: title || null,
      createdAt: serverTimestamp(),
      lastAt: serverTimestamp()
    });
  }
  // show modal
  openModal('chatModal');
  chatTitle.textContent = `Chat com ${title || otherId}`;
  // load messages (simple)
  chatMessages.innerHTML = '<div class="muted small">A carregar mensagens...</div>';
  const msgsQ = query(collection(db, `messages/${roomRef.id}/items`), orderBy('createdAt','asc'));
  onSnapshot(msgsQ, snapshot=>{
    chatMessages.innerHTML = '';
    snapshot.forEach(docSnap=>{
      const m = docSnap.data();
      const el = document.createElement('div');
      el.className = 'chat-msg' + (m.from === currentUser.uid ? ' me' : '');
      el.textContent = m.text;
      chatMessages.appendChild(el);
    });
    chatMessages.scrollTop = chatMessages.scrollHeight;
  });

  // send handler
  chatSendBtn.onclick = async ()=>{
    const text = chatText.value.trim();
    if (!text) return;
    await addDoc(collection(db, `messages/${roomRef.id}/items`), {
      from: currentUser.uid,
      text,
      createdAt: serverTimestamp()
    });
    // update last msg on root doc
    await updateDoc(doc(db, 'messages', roomRef.id), { lastMsg: text, lastAt: serverTimestamp() });
    chatText.value = '';
  };
}

/* ===========================
   SEARCH / Send fire to friend (simple flow)
   =========================== */
$('searchInput').addEventListener('keyup', async (e)=>{
  const qstr = e.target.value.trim();
  if (qstr.length < 2) return;
  // simple search by name or email (startsWith)
  const q = query(collection(db, 'users'), where('name', '>=', qstr), limit(10));
  const snap = await getDocs(q);
  // show results as feed items
  feedList.innerHTML = '';
  snap.forEach(s=>{
    const d = s.data();
    const card = document.createElement('div');
    card.className = 'feed-card';
    const img = document.createElement('img');
    img.src = d.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(d.name||d.email)}&background=ff7a18&color=06101a`;
    img.className = 'avatar';
    const meta = document.createElement('div');
    meta.className = 'meta';
    meta
