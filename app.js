// Código principal da app (sem módulos) - funciona diretamente no browser
// Lê/escreve streak no localStorage e controla TTS + animação de foguinho

const speakBtn = document.getElementById('speakBtn');
const lightBtn = document.getElementById('lightBtn');
const registerDayBtn = document.getElementById('registerDayBtn');
const speakText = document.getElementById('speakText');

const flamesContainer = document.getElementById('flamesContainer');
const streakCountEl = document.getElementById('streakCount');
const lastDateEl = document.getElementById('lastDate');

const STORAGE_KEY = 'foguinho_streak_v1';

// Util helpers de datas
function todayISO() {
  const d = new Date();
  // usa horário local; formata YYYY-MM-DD
  return d.toISOString().slice(0,10);
}
function yesterdayISO() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0,10);
}

// Carregar estado do localStorage
function loadState(){
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { last: null, streak: 0 };
    return JSON.parse(raw);
  } catch(e) {
    console.warn('Erro a ler storage', e);
    return { last: null, streak: 0 };
  }
}

function saveState(state){
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch(e) {
    console.warn('Erro a gravar storage', e);
  }
}

// Render flames (um por dia do streak, até 30)
function renderFlames(streak){
  flamesContainer.innerHTML = '';
  const max = Math.min(streak, 30);
  for (let i=0;i<max;i++){
    const f = document.createElement('div');
    f.className = 'flame';
    // usar emoji 🔥 — simples e compatível
    f.textContent = '🔥';
    // variação de tamanho
    const s = 0.9 + Math.random()*0.3;
    f.style.transform = `scale(${s})`;
    flamesContainer.appendChild(f);
  }
  streakCountEl.textContent = `Streak: ${streak} ${streak === 1 ? 'dia' : 'dias'}`;
}

// Atualiza info na UI a partir do state
function updateUI(){
  const s = loadState();
  renderFlames(s.streak);
  lastDateEl.textContent = `Último registo: ${s.last ?? '—'}`;
}

// Registar o dia atual no streak (chamada quando o usuário quiser "registar")
function registerToday(){
  const s = loadState();
  const today = todayISO();
  const yesterday = yesterdayISO();

  if (s.last === today) {
    // já registado hoje
    alert('Já regiaste o dia de hoje — o streak mantém-se.');
    return s;
  }

  if (s.last === yesterday) {
    s.streak = (s.streak || 0) + 1;
  } else {
    // se último é hoje (já tratado), se não for ontem, reinicia
    s.streak = 1;
  }
  s.last = today;
  saveState(s);
  sendAnalyticsEvent('register_day', {streak: s.streak});
  updateUI();
  return s;
}

// Função que "acende o foguinho" — anima uma explosão temporária e fala
function lightFoguinho(playSpeech = true){
  // cria um foguinho temporário central
  const temp = document.createElement('div');
  temp.className = 'flame';
  temp.style.position = 'absolute';
  temp.style.left = '50%';
  temp.style.top = '40%';
  temp.style.transform = 'translate(-50%,-50%) scale(1.2)';
  temp.style.zIndex = 9999;
  temp.textContent = '🔥';
  document.body.appendChild(temp);

  // efeito de pulso e desaparece
  temp.animate([
    { transform: 'translate(-50%,-50%) scale(0.6)', opacity: 0 },
    { transform: 'translate(-50%,-50%) scale(1.25)', opacity: 1 },
    { transform: 'translate(-50%,-50%) scale(1.6)', opacity: 0 }
  ], { duration: 900, easing: 'ease-out' });

  setTimeout(()=> temp.remove(), 920);

  if (playSpeech) {
    const text = speakText.value || 'Acendi o foguinho!';
    speak(text);
  }

  sendAnalyticsEvent('light_foguinho', {timestamp: new Date().toISOString()});
}

// Text-to-speech simples (usa SpeechSynthesis API)
function speak(text){
  if (!('speechSynthesis' in window)) {
    alert('TTS não suportado neste browser.');
    return;
  }
  const utter = new SpeechSynthesisUtterance(text);
  // podemos definir língua PT-PT
  utter.lang = 'pt-PT';
  // velocidade / pitch se quiser
  utter.rate = 1;
  utter.pitch = 1;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utter);
  sendAnalyticsEvent('speak', {textLength: text.length});
}

// Tenta enviar evento para analytics (se firebase estiver carregado)
function sendAnalyticsEvent(name, payload = {}){
  try {
    // se o analytics estiver inicializado pelo script do index, ele não está exposto,
    // mas guardámos a app em window.__FIREBASE_APP (veja index.html)
    // Aqui só fazemos console para não quebrar se não existir
    if (window.gtag) {
      // se o site usar gtag
      window.gtag('event', name, payload);
    } else {
      // não forçar erro — apenas log local
      console.log('Analytics event:', name, payload);
    }
  } catch(e){
    console.warn('Analytics falhou', e);
  }
}

// Inicialização UI
function init(){
  updateUI();

  speakBtn.addEventListener('click', () => {
    speak(speakText.value || 'Olá!');
  });

  lightBtn.addEventListener('click', () => {
    // Ao acender, também marcamos o dia registado (opcional) — aqui deixamos separado
    lightFoguinho(true);
  });

  registerDayBtn.addEventListener('click', () => {
    const state = registerToday();
    // pequena animação: adiciona um novo foguinho ao container
    const f = document.createElement('div');
    f.className = 'flame';
    f.textContent = '🔥';
    f.style.opacity = 0;
    f.style.transform = 'scale(0.3)';
    flamesContainer.prepend(f);
    // anima manualmente
    setTimeout(()=> {
      f.style.transition = 'transform 400ms ease, opacity 400ms ease';
      f.style.transform = '';
      f.style.opacity = 1;
    }, 20);
  });

  // Opcional: ao abrir a app, se já regiaste hoje, mostra isso
  const s = loadState();
  if (s.last === todayISO()) {
    // incentivo visual
    console.log('Já registaste hoje — mantém o streak! 🔥');
  }
}

init();
