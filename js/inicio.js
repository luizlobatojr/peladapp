import { getAuth, onAuthStateChanged } from "firebase/auth";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  updateDoc,
  doc,
  where,
  limit,
  Timestamp,
} from "firebase/firestore";
import { app, db } from "./firebase.js";

const auth = getAuth(app);

let currentUserId = null;
let proximaPartidaId = null;
let unsubProxima = null;

onAuthStateChanged(auth, (user) => {
  if (!user) return;
  currentUserId = user.uid;

  observarRankingEPerfil();
  observarProximaPartida();
});

// =====================================================
// RANKING + PERFIL DO JOGADOR
// =====================================================
function observarRankingEPerfil() {
  const qRanking = query(collection(db, "jogadores"), orderBy("overall", "desc"));

  onSnapshot(qRanking, (snapshot) => {
    const meuDoc = snapshot.docs.find((d) => d.id === currentUserId);

    if (!meuDoc) {
      console.log("Perfil ainda não sincronizado ou não encontrado.");
      return; // aguarda a próxima atualização do snapshot
    }

    // ---------- Ranking (top 5) ----------
    const linhasRanking = document.querySelectorAll(".rank-list-row");
    snapshot.docs.slice(0, 5).forEach((docSnap, index) => {
      if (!linhasRanking[index]) return;
      const dados = docSnap.data();
      const rankNumEl = linhasRanking[index].querySelector(".rank-num");
      if (rankNumEl) rankNumEl.innerText = index + 1;
      linhasRanking[index].querySelector(".rank-name").innerText = dados.nome || "---";
      linhasRanking[index].querySelector(".rank-score").innerText = dados.overall || 0;
      linhasRanking[index].classList.toggle("me", docSnap.id === currentUserId);
    });

    const meuPerfil = { id: meuDoc.id, ...meuDoc.data() };

    // ---------- Overall dinâmico ----------
    const soma =
      (meuPerfil.ritmo || 0) +
      (meuPerfil.penalty || 0) +
      (meuPerfil.finalizacao || 0) +
      (meuPerfil.defesa || 0) +
      (meuPerfil.passe || 0) +
      (meuPerfil.fisico || 0);
    const novoOverall = Math.round(soma / 6);

    if (meuPerfil.overall !== novoOverall) {
      updateDoc(doc(db, "jogadores", meuPerfil.id), { overall: novoOverall });
    }

    // ---------- Nome / overall globais ----------
    document.querySelectorAll(".ovr").forEach((el) => (el.innerText = novoOverall));
    document
      .querySelectorAll(".pname")
      .forEach((el) => (el.innerText = (meuPerfil.nome || "JOGADOR").toUpperCase()));

    const userName = document.getElementById("user-name");
    if (userName) userName.innerText = meuPerfil.nome || "Jogador";

    const userLevel = document.getElementById("user-level");
    if (userLevel) userLevel.innerText = novoOverall;

    const levelLabel = document.getElementById("level-label");
    if (levelLabel) levelLabel.innerText = "Nível " + novoOverall;

    // ---------- Cartão LINHA ----------
    const attrsLin = document.querySelectorAll(".player-card:nth-child(1) .attrs span");
    if (attrsLin.length >= 6) {
      attrsLin[0].innerHTML = `<b>${meuPerfil.ritmo || 0}</b> RIT`;
      attrsLin[1].innerHTML = `<b>${meuPerfil.drible ?? meuPerfil.passe ?? 0}</b> DRI`;
      attrsLin[2].innerHTML = `<b>${meuPerfil.finalizacao || 0}</b> FIN`;
      attrsLin[3].innerHTML = `<b>${meuPerfil.defesa || 0}</b> DEF`;
      attrsLin[4].innerHTML = `<b>${meuPerfil.passe || 0}</b> PAS`;
      attrsLin[5].innerHTML = `<b>${meuPerfil.fisico || 0}</b> FIS`;
    }

    // ---------- Cartão GOLEIRO ----------
    const attrsGol = document.querySelectorAll(".player-card:nth-child(2) .attrs span");
    if (attrsGol.length >= 6) {
      attrsGol[0].innerHTML = `<b>${meuPerfil.elasticidade ?? meuPerfil.ritmo ?? 0}</b> ELA`;
      attrsGol[1].innerHTML = `<b>${meuPerfil.reflexos ?? meuPerfil.defesa ?? 0}</b> REF`;
      attrsGol[2].innerHTML = `<b>${meuPerfil.manejo ?? meuPerfil.passe ?? 0}</b> MAN`;
      attrsGol[3].innerHTML = `<b>${meuPerfil.defesa || 0}</b> DEF`;
      attrsGol[4].innerHTML = `<b>${meuPerfil.chute ?? meuPerfil.finalizacao ?? 0}</b> CHU`;
      attrsGol[5].innerHTML = `<b>${meuPerfil.posicionamento ?? meuPerfil.fisico ?? 0}</b> POS`;
    }

    // ---------- Estatísticas (topo) ----------
    const statCards = document.querySelectorAll(".stat-card .value");
    if (statCards.length >= 4) {
      statCards[0].innerText = meuPerfil.gols || 0;
      statCards[1].innerText = meuPerfil.assistencias || 0;
      statCards[2].innerText = meuPerfil.mvps || 0;
      statCards[3].innerText = meuPerfil.sequencias || 0;
    }

    // ---------- Painel "Meu Perfil" ----------
    const painelPerfil = document.querySelector(".profile-stats");
    if (painelPerfil) {
      const cells = painelPerfil.querySelectorAll(".cell .num");
      if (cells.length >= 4) {
        cells[0].innerText = novoOverall;
        cells[1].innerText = meuPerfil.jogos || 0;
        cells[2].innerText = meuPerfil.vitorias || 0;

        const totalJogos = meuPerfil.jogos || 0;
        const vitorias = meuPerfil.vitorias || 0;
        const aproveitamento = totalJogos > 0 ? Math.round((vitorias / totalJogos) * 100) : 0;
        cells[3].innerText = aproveitamento + "%";
      }
    }

    const profileName = document.querySelector(".profile-name");
    if (profileName) profileName.innerText = meuPerfil.nome || "Jogador";

    const profileSub = document.querySelector(".profile-sub");
    if (profileSub) profileSub.innerText = "Nível: " + (meuPerfil.nivel || "Veterano");

    // ---------- Posição pessoal no ranking ----------
    const minhaPosicao = snapshot.docs.findIndex((d) => d.id === currentUserId) + 1;
    const posEl = document.querySelector(".ranking-me .pos");
    if (posEl) posEl.innerText = "#" + minhaPosicao;

    // ---------- Conquistas ----------
    atualizarConquistas(meuPerfil);
  });
}

function atualizarConquistas(perfil) {
  const achvs = document.querySelectorAll(".achv");
  if (achvs.length < 4) return;

  // Ordem igual à do HTML: MVP, Artilheiro, Assistente, 100 Jogos
  const regras = [
    { atual: perfil.mvps || 0, meta: 5 },
    { atual: perfil.gols || 0, meta: 10 },
    { atual: perfil.assistencias || 0, meta: 10 },
    { atual: perfil.jogos || 0, meta: 100 },
  ];

  achvs.forEach((el, i) => {
    const regra = regras[i];
    if (!regra) return;
    const desbloqueado = regra.atual >= regra.meta;
    el.classList.toggle("locked", !desbloqueado);

    const sub = el.querySelector(".achv-sub");
    if (sub && !desbloqueado) {
      sub.innerText = `${regra.atual}/${regra.meta}`;
    }
  });
}

// =====================================================
// PRÓXIMA PARTIDA (confirmação de presença, local, preço, pagamentos)
// =====================================================
function observarProximaPartida() {
  const agora = Timestamp.now();
  const qProxima = query(
    collection(db, "partidas"),
    where("data", ">=", agora),
    orderBy("data", "asc"),
    limit(1)
  );

  if (unsubProxima) unsubProxima();

  unsubProxima = onSnapshot(qProxima, (snapshot) => {
    if (snapshot.empty) {
      setTexto("home-data-hora", "Nenhuma pelada agendada");
      setTexto("home-local", "--");
      setTexto("home-preco", "--");
      setTexto("contagem-confirmados", "0");
      atualizarAvatarStack(0);
      proximaPartidaId = null;
      return;
    }

    const partidaDoc = snapshot.docs[0];
    proximaPartidaId = partidaDoc.id;
    const partida = partidaDoc.data();

    // ---------- Data / horário ----------
    if (partida.data) {
      const dt = partida.data.toDate();
      const dataFormatada = dt.toLocaleDateString("pt-BR", {
        weekday: "long",
        day: "2-digit",
        month: "long",
      });
      const horaFormatada = dt.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      });
      setTexto("home-data-hora", `${capitalizar(dataFormatada)} · ${horaFormatada}`);
    }

    setTexto("home-local", partida.local || "Local a definir");
    setTexto("home-preco", partida.preco ? `${partida.preco}€` : "Grátis");

    // ---------- Confirmados ----------
    const confirmados = partida.confirmados || {};
    const idsConfirmados = Object.keys(confirmados).filter((uid) => confirmados[uid] === true);

    setTexto("contagem-confirmados", idsConfirmados.length);
    atualizarAvatarStack(idsConfirmados.length);

    // ---------- Pagamentos ----------
    atualizarPagamentos(partida);

    // ---------- Estado visual dos botões EU VOU / NÃO VOU ----------
    atualizarBotoesPresenca(confirmados[currentUserId]);
  });
}

function setTexto(id, valor) {
  const el = document.getElementById(id);
  if (el) el.innerText = valor;
}

function capitalizar(texto) {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function atualizarAvatarStack(total) {
  const stack = document.querySelector(".avatar-stack");
  if (!stack) return;

  const maxVisiveis = 5;
  const visiveis = Math.min(total, maxVisiveis);
  const restantes = total - visiveis;

  let html = "";
  for (let i = 0; i < visiveis; i++) {
    html += `<div class="mini-avatar">🙂</div>`;
  }
  if (restantes > 0) {
    html += `<div class="mini-avatar more">+${restantes}</div>`;
  }
  stack.innerHTML = html;
}

function atualizarPagamentos(partida) {
  const arrecadado = partida.arrecadado || 0;
  const meta = partida.meta || 0;

  const amountEls = document.querySelectorAll(".pay-row .item .amount");
  if (amountEls.length >= 2) {
    amountEls[0].innerText = arrecadado.toFixed(2).replace(".", ",") + "€";
    amountEls[1].innerText = meta.toFixed(2).replace(".", ",") + "€";
  }

  const progressFill = document.querySelector(
    ".panel .pay-row + .progress-track .progress-fill"
  );
  const porcentagem = meta > 0 ? Math.min(100, Math.round((arrecadado / meta) * 100)) : 0;
  if (progressFill) progressFill.style.width = porcentagem + "%";

  const payStatus = document.querySelector(".pay-status");
  if (payStatus) {
    const euJaPaguei = (partida.pagamentos || {})[currentUserId];
    payStatus.innerText = euJaPaguei ? "✅ Pago" : "⏳ Pendente";
  }
}

function atualizarBotoesPresenca(minhaConfirmacao) {
  const btnSim = document.querySelector(".match-actions .btn-primary");
  const btnNao = document.querySelector(".match-actions .btn-ghost");
  if (!btnSim || !btnNao) return;

  btnSim.classList.toggle("active", minhaConfirmacao === true);
  btnNao.classList.toggle("active", minhaConfirmacao === false);
}

// Chamada pelos botões "EU VOU" / "NÃO VOU" (onclick no HTML)
window.comfirmarContagem = async function (resposta) {
  if (!currentUserId) {
    console.warn("Usuário ainda não carregado.");
    return;
  }
  if (!proximaPartidaId) {
    console.warn("Nenhuma partida futura encontrada para confirmar presença.");
    return;
  }

  const partidaRef = doc(db, "partidas", proximaPartidaId);
  try {
    await updateDoc(partidaRef, {
      [`confirmados.${currentUserId}`]: resposta === "sim",
    });
  } catch (err) {
    console.error("Erro ao confirmar presença:", err);
  }
};
