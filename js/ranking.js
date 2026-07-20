import { getAuth, onAuthStateChanged } from "firebase/auth";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { app, db } from "./firebase.js";

const auth = getAuth(app);
const listPanel = document.querySelector(".list-panel");
const header = listPanel.querySelector(".list-head-row");
const myCard = document.querySelector(".my-rank-card");
const colLabelScore = document.getElementById("col-label-score");
const abas = document.querySelectorAll(".cat-tab");

let currentUserId = null;
let campoAtual = "overall"; // campo do Firestore usado pra ordenar (muda por categoria)
let unsubscribeRanking = null;

// Mesma classificação usada nos cartões de jogador (player-card.css)
function classificarNivel(overall) {
  if (overall >= 85) return "Ouro";
  if (overall >= 75) return "Prata";
  if (overall >= 65) return "Bronze";
  return "Comum";
}

// ===========================================================
// ABAS DE CATEGORIA (Geral / Artilheiros / Assistências / MVPs / Sequência)
// ===========================================================
abas.forEach((aba) => {
  aba.addEventListener("click", () => {
    const novoCampo = aba.dataset.campo;
    if (!novoCampo || novoCampo === campoAtual) return;

    abas.forEach((a) => a.classList.remove("active"));
    aba.classList.add("active");

    campoAtual = novoCampo;
    if (colLabelScore) colLabelScore.innerText = aba.dataset.label || "Overall";
    document
      .querySelectorAll(".podium-sub")
      .forEach((el) => (el.innerText = aba.dataset.label || "Overall"));

    observarRanking();
  });
});

// ===========================================================
// PÓDIO (top 3 da categoria atual)
// ===========================================================
function renderizarPodio(top3) {
  const posicoes = [
    { el: document.querySelector(".podium-card.first"), jogador: top3[0] },
    { el: document.querySelector(".podium-card.second"), jogador: top3[1] },
    { el: document.querySelector(".podium-card.third"), jogador: top3[2] },
  ];

  posicoes.forEach(({ el, jogador }) => {
    if (!el) return;

    if (!jogador) {
      el.style.visibility = "hidden";
      return;
    }

    el.style.visibility = "visible";
    el.querySelector(".podium-name").innerText = jogador.nome || "---";
    el.querySelector(".podium-score").innerText = jogador[campoAtual] || 0;
  });
}

// ===========================================================
// LISTA COMPLETA
// ===========================================================
function renderizarRanking(jogadores) {
  listPanel.innerHTML = "";
  listPanel.appendChild(header);

  jogadores.forEach((jogador, index) => {
    const pos = index + 1;
    const classeMedalha =
      pos === 1 ? "gold" : pos === 2 ? "silver" : pos === 3 ? "bronze" : "";
    const souEu = jogador.id === currentUserId;

    const row = document.createElement("div");
    row.className = `rank-row${souEu ? " me" : ""}`;

    row.innerHTML = `
      <div class="rank-pos ${classeMedalha}">${pos}</div>
      <div class="rank-player">
        <div class="rp-avatar"></div>
        <div>
          <div class="rp-name">${jogador.nome || "Sem Nome"}${souEu ? " (você)" : ""}</div>
          <div class="rp-badge">${classificarNivel(jogador.overall || 0)}</div>
        </div>
      </div>
      <div class="rank-col score">${jogador[campoAtual] || 0}</div>
      <div class="rank-col">${jogador.jogos || 0}</div>
      <div class="rank-col">${jogador.vitorias || 0}V</div>
      <div class="rank-col"><span class="trend">${jogador.variacao || "—"}</span></div>
    `;
    listPanel.appendChild(row);
  });
}

function renderizarMeuCard(meuPerfil) {
  if (!myCard) return;
  myCard.style.display = "grid";

  const classeMedalha =
    meuPerfil.posicao === 1
      ? "gold"
      : meuPerfil.posicao === 2
        ? "silver"
        : meuPerfil.posicao === 3
          ? "bronze"
          : "";

  myCard.innerHTML = `
    <div class="rank-pos ${classeMedalha}">${meuPerfil.posicao}</div>
    <div class="rank-player">
      <div class="rp-avatar"></div>
      <div>
        <div class="rp-name" style="color: var(--green); font-weight: 600">${meuPerfil.nome || "Você"} (você)</div>
        <div class="rp-badge">${classificarNivel(meuPerfil.overall || 0)}</div>
      </div>
    </div>
    <div class="rank-col score" style="color: var(--green)">${meuPerfil[campoAtual] || 0}</div>
    <div class="rank-col">${meuPerfil.jogos || 0} jogos</div>
    <div class="rank-col">${meuPerfil.vitorias || 0}V</div>
    <div class="rank-col"><span class="trend ${meuPerfil.variacao > 0 ? "up" : "down"}">${meuPerfil.variacao || 0}</span></div>
  `;
}

// ===========================================================
// OBSERVA O RANKING NO CAMPO ATUAL (reordena quando a categoria muda)
// ===========================================================
function observarRanking() {
  if (unsubscribeRanking) unsubscribeRanking();

  const q = query(collection(db, "jogadores"), orderBy(campoAtual, "desc"));

  unsubscribeRanking = onSnapshot(q, (snapshot) => {
    const ranking = snapshot.docs.map((docSnap, index) => ({
      id: docSnap.id,
      ...docSnap.data(),
      posicao: index + 1,
    }));

    renderizarPodio(ranking.slice(0, 3));
    renderizarRanking(ranking);

    const meuPerfilEncontrado = ranking.find((j) => j.id === currentUserId);
    if (meuPerfilEncontrado) {
      renderizarMeuCard(meuPerfilEncontrado);
    } else if (myCard) {
      myCard.style.display = "none";
    }
  });
}

onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  currentUserId = user.uid;
  observarRanking();
});
