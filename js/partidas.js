import { getAuth, onAuthStateChanged } from "firebase/auth";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  increment,
  Timestamp,
} from "firebase/firestore";
import { app, db } from "./firebase.js";

const auth = getAuth(app);

let currentUserId = null;
let partidaAgendadaId = null;
let partidaAoVivoId = null;

const JOGADORES_POR_TIME = 5;

// ===========================================================
// CATÁLOGO DE EVENTOS
// Cada evento pode: contar uma estatística (contador), mexer num
// atributo usado no cálculo do Overall (atributo/delta), e/ou somar
// no placar do time (afetaPlacar).
// ===========================================================
const CATALOGO_EVENTOS = [
  { id: "gol", label: "Gol", icone: "⚽", contador: "gols", atributo: "finalizacao", delta: 1, afetaPlacar: true },
  { id: "assistencia", label: "Assistência", icone: "🎯", contador: "assistencias", atributo: "passe", delta: 1 },
  { id: "penalti_convertido", label: "Pênalti convertido", icone: "✅", contador: "gols", atributo: "penalty", delta: 1, afetaPlacar: true },
  { id: "penalti_perdido", label: "Pênalti perdido", icone: "❌", contador: "penaltisPerdidos", atributo: "penalty", delta: -2, negativo: true },
  { id: "falta", label: "Falta cometida", icone: "🟧", contador: "faltas", atributo: "fisico", delta: -1, negativo: true },
  { id: "cartao_amarelo", label: "Cartão amarelo", icone: "🟨", contador: "cartoesAmarelos", atributo: "fisico", delta: -1, negativo: true },
  { id: "cartao_vermelho", label: "Cartão vermelho", icone: "🟥", contador: "cartoesVermelhos", atributo: "defesa", delta: -3, negativo: true },
  { id: "desarme", label: "Desarme", icone: "🛡️", contador: "desarmes", atributo: "defesa", delta: 1 },
];

function buscarEvento(id) {
  return CATALOGO_EVENTOS.find((e) => e.id === id);
}

onAuthStateChanged(auth, (user) => {
  if (!user) return;
  currentUserId = user.uid;
  observarPartidas();
});

// ===========================================================
// OBSERVA: existe partida ao vivo? Ou uma agendada pra iniciar?
// ===========================================================
function observarPartidas() {
  const qAoVivo = query(
    collection(db, "partidas"),
    where("status", "==", "em_andamento"),
    limit(1)
  );

  onSnapshot(qAoVivo, (snapshot) => {
    if (!snapshot.empty) {
      partidaAoVivoId = snapshot.docs[0].id;
      mostrarEstado("ao-vivo");
      renderizarPartidaAoVivo(snapshot.docs[0].data());
    } else {
      partidaAoVivoId = null;
      observarProximaAgendada();
    }
  });
}

function observarProximaAgendada() {
  const agora = Timestamp.now();
  const qAgendada = query(
    collection(db, "partidas"),
    where("data", ">=", agora),
    orderBy("data", "asc"),
    limit(1)
  );

  onSnapshot(qAgendada, (snapshot) => {
    if (partidaAoVivoId) return;

    if (snapshot.empty) {
      mostrarEstado("vazio");
      return;
    }

    const partidaDoc = snapshot.docs[0];
    partidaAgendadaId = partidaDoc.id;
    const partida = partidaDoc.data();

    const dt = partida.data?.toDate?.();
    const dataTexto = dt
      ? dt.toLocaleDateString("pt-BR", { day: "2-digit", month: "long" }) +
        " às " +
        dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
      : "--";

    const totalConfirmados = Object.values(partida.confirmados || {}).filter(Boolean).length;

    document.getElementById("info-partida-agendada").innerText =
      `${partida.local || "Local a definir"} · ${dataTexto} · ${totalConfirmados} confirmados`;

    mostrarEstado("agendada");
  });
}

function mostrarEstado(estado) {
  document.getElementById("estado-sem-partida").style.display = estado === "vazio" ? "block" : "none";
  document.getElementById("painel-iniciar").style.display = estado === "agendada" ? "block" : "none";
  document.getElementById("conteudo-ao-vivo").style.display = estado === "ao-vivo" ? "block" : "none";
}

// ===========================================================
// INICIAR PARTIDA — sorteio equilibrado por Overall
// (5 titulares por time; quem sobrar vira reserva)
// ===========================================================
document.getElementById("btn-iniciar-partida").addEventListener("click", async () => {
  if (!partidaAgendadaId) return;

  const btn = document.getElementById("btn-iniciar-partida");
  btn.disabled = true;
  btn.innerText = "Sorteando times...";

  try {
    const partidaRef = doc(db, "partidas", partidaAgendadaId);
    const partidaSnap = await getDoc(partidaRef);
    const partida = partidaSnap.data();

    const confirmados = partida.confirmados || {};
    const uidsConfirmados = Object.keys(confirmados).filter((uid) => confirmados[uid] === true);

    const minimoNecessario = JOGADORES_POR_TIME * 2;
    if (uidsConfirmados.length < minimoNecessario) {
      alert(
        `É preciso pelo menos ${minimoNecessario} jogadores confirmados (${JOGADORES_POR_TIME} por time) pra iniciar a partida. Hoje tem ${uidsConfirmados.length}.`
      );
      btn.disabled = false;
      btn.innerText = "▶️ INICIAR PARTIDA AO VIVO";
      return;
    }

    // Busca nome + overall de cada confirmado
    const jogadoresInfo = await Promise.all(
      uidsConfirmados.map(async (uid) => {
        const jSnap = await getDoc(doc(db, "jogadores", uid));
        const dados = jSnap.exists() ? jSnap.data() : {};
        return {
          uid,
          nome: dados.nome || "Jogador",
          overall: dados.overall || 0,
        };
      })
    );

    // Embaralha primeiro (desempate) e depois ordena por Overall decrescente
    const ordenados = jogadoresInfo
      .sort(() => Math.random() - 0.5)
      .sort((a, b) => b.overall - a.overall);

    // Só os 10 melhores (5+5) entram como titulares — snake draft: A,B,B,A,A,B,B,A...
    const titulares = ordenados.slice(0, minimoNecessario);
    const reservas = ordenados.slice(minimoNecessario);

    const padraoSnake = [0, 1, 1, 0];
    const timeAJogadores = [];
    const timeBJogadores = [];

    titulares.forEach((jogador, i) => {
      const time = padraoSnake[i % 4];
      (time === 0 ? timeAJogadores : timeBJogadores).push({ uid: jogador.uid, nome: jogador.nome });
    });

    await updateDoc(partidaRef, {
      status: "em_andamento",
      timeA: { nome: "Time Verde", placar: 0, jogadores: timeAJogadores },
      timeB: { nome: "Time Preto", placar: 0, jogadores: timeBJogadores },
      reservas: reservas.map((j) => ({ uid: j.uid, nome: j.nome })),
      eventos: [{ tipo: "inicio", texto: "Partida iniciada! Times sorteados por Overall.", criadoEm: Timestamp.now() }],
    });

    // Conta essa partida como "jogo" pra todo mundo que entrou em campo
    await Promise.all(
      titulares.map((j) => updateDoc(doc(db, "jogadores", j.uid), { jogos: increment(1) }))
    );
  } catch (error) {
    console.error("Erro ao iniciar partida:", error);
    alert("Erro ao iniciar a partida.");
    btn.disabled = false;
    btn.innerText = "▶️ INICIAR PARTIDA AO VIVO";
  }
});

// ===========================================================
// RENDERIZA O PLACAR + TIMES + FEED
// ===========================================================
function renderizarPartidaAoVivo(partida) {
  document.getElementById("nome-time-a").innerText = partida.timeA?.nome || "Time A";
  document.getElementById("nome-time-b").innerText = partida.timeB?.nome || "Time B";
  document.getElementById("placar-a").innerText = partida.timeA?.placar || 0;
  document.getElementById("placar-b").innerText = partida.timeB?.placar || 0;
  document.getElementById("local-partida").innerText = partida.local || "";

  renderizarTime("lista-time-a", partida.timeA?.jogadores || [], "timeA");
  renderizarTime("lista-time-b", partida.timeB?.jogadores || [], "timeB");
  renderizarReservas(partida.reservas || []);

  renderizarFeed(partida.eventos || []);
}

function renderizarTime(containerId, jogadores, timeKey) {
  const container = document.getElementById(containerId);
  container.innerHTML = "";

  if (jogadores.length === 0) {
    container.innerHTML = '<div class="field-hint">Sem jogadores.</div>';
    return;
  }

  jogadores.forEach((j, idx) => {
    const bloco = document.createElement("div");
    bloco.className = "jogador-bloco";

    const menuId = `menu-${timeKey}-${idx}`;

    bloco.innerHTML = `
      <div class="jogador-linha">
        <span>${j.nome}</span>
        <button class="btn-acao-toggle" data-menu="${menuId}">⚙️ Registrar</button>
      </div>
      <div class="evento-menu" id="${menuId}">
        ${CATALOGO_EVENTOS.map(
          (ev) => `
          <div class="evento-chip ${ev.negativo ? "negativo" : ""}" data-evento="${ev.id}">
            ${ev.icone} ${ev.label}
          </div>`
        ).join("")}
      </div>
    `;
    container.appendChild(bloco);

    const btnToggle = bloco.querySelector(".btn-acao-toggle");
    const menu = bloco.querySelector(".evento-menu");

    btnToggle.addEventListener("click", () => {
      menu.classList.toggle("aberto");
    });

    menu.querySelectorAll(".evento-chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        registrarEvento(timeKey, j.uid, j.nome, chip.dataset.evento);
        menu.classList.remove("aberto");
      });
    });
  });
}

function renderizarReservas(reservas) {
  let container = document.getElementById("lista-reservas");

  if (!container) {
    // Cria o bloco de reservas dinamicamente se ainda não existir no HTML
    const painelFeed = document.querySelector("#conteudo-ao-vivo .panel:last-child");
    const bloco = document.createElement("div");
    bloco.className = "panel";
    bloco.innerHTML = `
      <div class="panel-title"><span class="num-badge">🪑</span> Reservas</div>
      <div class="lista-jogadores" id="lista-reservas"></div>
    `;
    painelFeed.parentNode.insertBefore(bloco, painelFeed);
    container = document.getElementById("lista-reservas");
  }

  if (reservas.length === 0) {
    container.innerHTML = '<div class="field-hint">Ninguém no banco.</div>';
    return;
  }

  container.innerHTML = reservas
    .map((j) => `<div class="jogador-linha"><span>${j.nome}</span></div>`)
    .join("");
}

function renderizarFeed(eventos) {
  const feed = document.getElementById("feed-eventos");

  if (!eventos || eventos.length === 0) {
    feed.innerHTML = '<div class="field-hint">Nenhum evento ainda. Boa sorte! ⚽</div>';
    return;
  }

  const ordenados = [...eventos].sort((a, b) => {
    const tA = a.criadoEm?.toMillis?.() || 0;
    const tB = b.criadoEm?.toMillis?.() || 0;
    return tB - tA;
  });

  feed.innerHTML = ordenados
    .map((ev) => {
      const hora = ev.criadoEm?.toDate?.()
        ? ev.criadoEm.toDate().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
        : "";
      const catalogo = buscarEvento(ev.tipo);
      const icone = catalogo?.icone || "•";
      const texto = ev.texto || `${ev.jogadorNome || "Jogador"} · ${catalogo?.label || ev.tipo}`;
      return `
        <div class="evento-item">
          <div class="eico">${icone}</div>
          <div>${texto}</div>
          <div class="etime">${hora}</div>
        </div>
      `;
    })
    .join("");
}

// ===========================================================
// REGISTRAR EVENTO (gol, assistência, falta, pênalti, cartão...)
// ===========================================================
async function registrarEvento(timeKey, jogadorUid, jogadorNome, eventoId) {
  if (!partidaAoVivoId) return;

  const evento = buscarEvento(eventoId);
  if (!evento) return;

  const partidaRef = doc(db, "partidas", partidaAoVivoId);

  try {
    const atualizacaoPartida = {
      eventos: arrayUnion({
        tipo: evento.id,
        timeKey,
        jogadorUid,
        jogadorNome,
        criadoEm: Timestamp.now(),
      }),
    };

    if (evento.afetaPlacar) {
      atualizacaoPartida[`${timeKey}.placar`] = increment(1);
    }

    await updateDoc(partidaRef, atualizacaoPartida);

    // Atualiza a estatística/atributo do jogador (reflete no Overall dele)
    const atualizacaoJogador = {};
    if (evento.contador) atualizacaoJogador[evento.contador] = increment(1);
    if (evento.atributo) atualizacaoJogador[evento.atributo] = increment(evento.delta);

    if (Object.keys(atualizacaoJogador).length > 0) {
      await updateDoc(doc(db, "jogadores", jogadorUid), atualizacaoJogador);
    }
  } catch (error) {
    console.error("Erro ao registrar evento:", error);
    alert("Erro ao registrar o evento.");
  }
}

// ===========================================================
// ENCERRAR PARTIDA (e soma vitória pra quem ganhou)
// ===========================================================
document.getElementById("btn-encerrar-partida").addEventListener("click", async () => {
  if (!partidaAoVivoId) return;

  const confirmar = confirm("Tem certeza que quer encerrar a partida?");
  if (!confirmar) return;

  try {
    const partidaRef = doc(db, "partidas", partidaAoVivoId);
    const partidaSnap = await getDoc(partidaRef);
    const partida = partidaSnap.data();

    const placarA = partida.timeA?.placar || 0;
    const placarB = partida.timeB?.placar || 0;

    await updateDoc(partidaRef, {
      status: "encerrada",
      eventos: arrayUnion({
        tipo: "fim",
        texto: `Partida encerrada — ${placarA} x ${placarB}`,
        criadoEm: Timestamp.now(),
      }),
    });

    // Soma vitória pra quem ganhou (empate não soma pra ninguém)
    if (placarA !== placarB) {
      const vencedores = placarA > placarB ? partida.timeA?.jogadores : partida.timeB?.jogadores;
      await Promise.all(
        (vencedores || []).map((j) => updateDoc(doc(db, "jogadores", j.uid), { vitorias: increment(1) }))
      );
    }
  } catch (error) {
    console.error("Erro ao encerrar partida:", error);
    alert("Erro ao encerrar a partida.");
  }
});
