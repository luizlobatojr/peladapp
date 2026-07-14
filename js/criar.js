import { collection, addDoc, Timestamp } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { app, db } from "./firebase.js";

const auth = getAuth(app);

// ===========================================================
// NAVEGAÇÃO ENTRE ETAPAS (stepper)
// ===========================================================
let dadosPartida = {};

function nextStep(step) {
  // 1. Salva os dados atuais sempre que mudar de tela
  salvarDadosNoEstado();

  // 2. Esconde todos os painéis
  document.querySelectorAll(".step-panel").forEach((p) => (p.style.display = "none"));

  // 3. Mostra o painel alvo
  const targetPanel = document.getElementById("panel-" + step);
  if (targetPanel) targetPanel.style.display = "block";

  // 4. Atualiza o stepper visual
  document.querySelectorAll(".step").forEach((s, index) => {
    s.classList.toggle("active", index + 1 === step);
  });

  // 5. No passo 4, renderiza o resumo
  if (step === 4) {
    renderizarResumo();
  }

  window.scrollTo(0, 0);
}

function salvarDadosNoEstado() {
  const dataInput = document.getElementById("input-data").value;

  dadosPartida = {
    data: dataInput || "Não informada",
    hora: document.getElementById("input-hora").value,
    preco: document.getElementById("valor-preco").innerText,
    jogadores: document.getElementById("val-jogadores").innerText,
  };

  localStorage.setItem("dadosPartida", JSON.stringify(dadosPartida));
}

function renderizarResumo() {
  const dados = JSON.parse(localStorage.getItem("dadosPartida"));
  if (!dados) return;

  document.getElementById("resumo-data").innerText = dados.data;
  document.getElementById("resumo-hora").innerText = dados.hora;
  document.getElementById("resumo-jogadores").innerText = dados.jogadores;
  document.getElementById("resumo-preco").innerText = dados.preco + " por jogador";

  if (!dados.data || dados.data === "Não informada") {
    document.getElementById("resumo-dia-semana").innerText = "--";
    return;
  }

  const dataObj = new Date(dados.data + "T00:00:00");
  const opcoes = { weekday: "long" };
  const diaSemana = dataObj.toLocaleDateString("pt-PT", opcoes);
  const formatado = diaSemana.charAt(0).toUpperCase() + diaSemana.slice(1);

  document.getElementById("resumo-dia-semana").innerText = formatado;
}

// Chamada pelo onchange do input de data (o HTML já a chamava, mas ela nunca existia)
function atualizarData(valor) {
  dadosPartida.data = valor;
}

function atualizar(tipo, delta) {
  const el = document.getElementById("valor-preco");
  let valorAtual = parseFloat(el.innerText.replace("€", "").replace(",", "."));
  let novoValor = valorAtual + delta;
  if (novoValor >= 0) el.innerText = novoValor.toFixed(2).replace(".", ",") + "€";
}

function atualizarJogadores(delta) {
  const el = document.getElementById("val-jogadores");
  let valorAtual = parseInt(el.innerText);
  let novoValor = valorAtual + delta;
  if (novoValor >= 10 && novoValor <= 30) el.innerText = novoValor;
}

// O HTML chama essas funções via onclick/onchange inline — como este é um
// módulo (type="module"), elas não ficam globais por padrão, então
// precisam ser expostas manualmente em window.
window.nextStep = nextStep;
window.atualizarData = atualizarData;
window.atualizar = atualizar;
window.atualizarJogadores = atualizarJogadores;

// Contador de caracteres da descrição (estava fixo em "0/100")
const textarea = document.querySelector("textarea");
const charCount = document.querySelector(".char-count");
if (textarea && charCount) {
  textarea.addEventListener("input", () => {
    const max = 100;
    const total = Math.min(textarea.value.length, max);
    charCount.innerText = `${total}/${max}`;
  });
}

// ===========================================================
// CRIAÇÃO DA PARTIDA NO FIRESTORE
// ===========================================================
const btnCriar = document.getElementById("btn-criar-partida");

btnCriar.addEventListener("click", async () => {
  const user = auth.currentUser;

  if (!user) {
    alert("Você precisa estar logado para criar uma partida!");
    return;
  }

  // ---------- Lê os valores direto dos campos ----------
  const dataStr = document.getElementById("input-data").value; // ex: "2026-07-15"
  const horaStr = document.getElementById("input-hora").value; // ex: "20:00"
  const localStr = (document.getElementById("select-local")?.innerText || "").trim();
  const precoStr = document.getElementById("valor-preco").innerText; // ex: "7,00€"
  const jogadoresStr = document.getElementById("val-jogadores").innerText; // ex: "20"
  const descricaoStr = (document.querySelector("textarea")?.value || "").trim();

  if (!dataStr || !horaStr) {
    alert("Preencha a data e o horário da partida.");
    return;
  }

  // ---------- Monta a data/hora real da partida ----------
  const [ano, mes, dia] = dataStr.split("-").map(Number);
  const [hora, minuto] = horaStr.split(":").map(Number);
  const dataHoraPartida = new Date(ano, mes - 1, dia, hora, minuto);

  if (isNaN(dataHoraPartida.getTime())) {
    alert("Data ou horário inválidos.");
    return;
  }

  const preco = parseFloat(precoStr.replace("€", "").replace(",", ".")) || 0;
  const numJogadores = parseInt(jogadoresStr, 10) || 20;

  // ---------- Objeto salvo no Firestore (formato usado pelo inicio.js) ----------
  const novaPartida = {
    data: Timestamp.fromDate(dataHoraPartida),
    local: localStr || "Local a definir",
    descricao: descricaoStr,
    preco: preco,
    vagas: numJogadores,
    meta: preco * numJogadores,
    arrecadado: 0,
    confirmados: { [user.uid]: true }, // quem cria já entra confirmado
    pagamentos: {},
    criadorId: user.uid,
    dataCriacao: Timestamp.now(),
  };

  btnCriar.disabled = true;
  const textoOriginal = btnCriar.innerText;
  btnCriar.innerText = "Criando...";

  try {
    await addDoc(collection(db, "partidas"), novaPartida);
    localStorage.removeItem("dadosPartida");
    alert("Partida criada com sucesso!");
    window.location.href = "inicio.html";
  } catch (error) {
    console.error("Erro ao salvar:", error);
    alert("Erro ao criar partida.");
    btnCriar.disabled = false;
    btnCriar.innerText = textoOriginal;
  }
});
