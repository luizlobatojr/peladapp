import { getAuth, onAuthStateChanged } from "firebase/auth";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "./firebase.js";

const auth = getAuth();
const listPanel = document.querySelector(".list-panel");
const header = listPanel.querySelector(".list-head-row");
const myCard = document.querySelector(".my-rank-card");

function renderizarRanking(jogadores) {
  listPanel.innerHTML = "";
  listPanel.appendChild(header);

  jogadores.forEach((jogador, index) => {
    const pos = index + 1;
    // Lógica para as medalhas
    const classeMedalha = pos === 1 ? 'gold' : pos === 2 ? 'silver' : pos === 3 ? 'bronze' : '';
    
    const row = document.createElement("div");
    row.className = `rank-row`;
    
    row.innerHTML = `
      <div class="rank-pos ${classeMedalha}">${pos}</div>
      <div class="rank-player">
        <div class="rp-avatar"></div>
        <div>
          <div class="rp-name">${jogador.nome || "Sem Nome"}</div>
          <div class="rp-badge">Nível ${jogador.overall || 0}</div>
        </div>
      </div>
      <div class="rank-col score">${jogador.overall || 0}</div>
      <div class="rank-col">${jogador.jogos || 0}</div>
      <div class="rank-col">${jogador.vitorias || 0}V</div>
      <div class="rank-col"><span class="trend">${jogador.variacao || '—'}</span></div>
    `;
    listPanel.appendChild(row);
  });
}

function renderizarMeuCard(meuPerfil) {
  if (!myCard) return;
  // Aplica a mesma lógica de medalha no seu card também
  const classeMedalha = meuPerfil.posicao === 1 ? 'gold' : meuPerfil.posicao === 2 ? 'silver' : meuPerfil.posicao === 3 ? 'bronze' : '';

  myCard.innerHTML = `
    <div class="rank-pos ${classeMedalha}">${meuPerfil.posicao}</div> 
    <div class="rank-player">
      <div class="rp-avatar"></div>
      <div>
        <div class="rp-name" style="color: var(--green); font-weight: 600">${meuPerfil.nome || "Você"} (você)</div>
        <div class="rp-badge">Nível ${meuPerfil.overall || 0}</div>
      </div>
    </div>
    <div class="rank-col score" style="color: var(--green)">${meuPerfil.overall || 0}</div>
    <div class="rank-col">${meuPerfil.jogos || 0} jogos</div>
    <div class="rank-col">${meuPerfil.vitorias || 0}V</div>
    <div class="rank-col"><span class="trend ${meuPerfil.variacao > 0 ? 'up' : 'down'}">${meuPerfil.variacao || 0}</span></div>
  `;
}

onAuthStateChanged(auth, (user) => {
  const currentUserId = user ? user.uid : null;
  const q = query(collection(db, "jogadores"), orderBy("overall", "desc"));

  onSnapshot(q, (snapshot) => {
    const ranking = snapshot.docs.map((doc, index) => ({
      id: doc.id,
      ...doc.data(),
      posicao: index + 1
    }));
    
    renderizarRanking(ranking);
    
    const meuPerfilEncontrado = ranking.find(j => j.id === currentUserId);
    if (meuPerfilEncontrado) {
      renderizarMeuCard(meuPerfilEncontrado);
    }
  });
});