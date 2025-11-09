import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import serviceAccount from "./serviceAccountKey.json" assert { type: "json" };

// Inicializa Firebase Admin
initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function setupFirestore() {
  const missions = [
    { id: "mission1", title: "Acende o foguinho 3 dias seguidos", reward: 10, active: true },
    { id: "mission2", title: "Fala com 2 amigos hoje", reward: 5, active: true },
    { id: "mission3", title: "Acende o foguinho 7 dias seguidos", reward: 25, active: true }
  ];

  for (const mission of missions) {
    await db.collection("missions").doc(mission.id).set(mission);
  }

  console.log("Missões padrão criadas no Firestore!");
}

setupFirestore();
