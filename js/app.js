import { getAuth, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { db } from "./firebase.js"; // Importa a tua config do Firebase

const auth = getAuth();

onAuthStateChanged(auth, async (user) => {
  if (user) {
    // 1. O utilizador está logado, vamos buscar os dados dele no Firestore
    const docRef = doc(db, "jogadores", user.uid);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const dados = docSnap.data();
      
      // 2. Preencher a interface com os dados reais
      document.getElementById("user-name").innerText = dados.nome || "Jogador";
      document.getElementById("user-level").innerText = dados.overall || "1";
      document.getElementById("level-label").innerText = "Nível " + (dados.overall || "1");
      document.getElementById("xp-text").innerText = `${dados.xpAtual || 0} / ${dados.xpMeta || 1000} XP`;
      
      // Opcional: Atualizar a barra de progresso
      const porcentagem = (dados.xpAtual / dados.xpMeta) * 100;
      document.getElementById("xp-progress").style.width = porcentagem + "%";
    }
  } else {
    // 3. Se não estiver logado, manda para o login
    window.location.href = "login.html";
  }
});