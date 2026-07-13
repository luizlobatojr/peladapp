import { getAuth, onAuthStateChanged } from "firebase/auth";
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  addDoc,
  getDocs,
  query,
  where,
  limit,
  arrayUnion,
  Timestamp,
} from "firebase/firestore";
import { app, db } from "./firebase.js";

const auth = getAuth(app);
let usuarioAtual = null;

onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }
  usuarioAtual = user;
});

// ===========================================================
// NAVEGAÇÃO ENTRE ABAS
// ===========================================================
function mudarAba(aba) {
  document.getElementById("tab-criar").classList.toggle("active", aba === "criar");
  document.getElementById("tab-entrar").classList.toggle("active", aba === "entrar");
  document.getElementById("conteudo-criar").classList.toggle("active", aba === "criar");
  document.getElementById("conteudo-entrar").classList.toggle("active", aba === "entrar");
}
window.mudarAba = mudarAba;

// ===========================================================
// GERADOR DE CÓDIGO DE CONVITE
// ===========================================================
function gerarCodigoConvite() {
  // Evita caracteres ambíguos (0/O, 1/I/L)
  const alfabeto = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let codigo = "";
  for (let i = 0; i < 6; i++) {
    codigo += alfabeto[Math.floor(Math.random() * alfabeto.length)];
  }
  return codigo;
}

function mostrarErro(id, mensagem) {
  const el = document.getElementById(id);
  el.innerText = mensagem;
  el.style.display = "block";
}

function esconderErro(id) {
  document.getElementById(id).style.display = "none";
}

// ===========================================================
// CRIAR GRUPO
// ===========================================================
const btnCriarGrupo = document.getElementById("btn-criar-grupo");

btnCriarGrupo.addEventListener("click", async () => {
  esconderErro("erro-criar");

  if (!usuarioAtual) {
    mostrarErro("erro-criar", "Aguarde, carregando sua sessão...");
    return;
  }

  const nome = document.getElementById("input-nome-grupo").value.trim();
  if (!nome) {
    mostrarErro("erro-criar", "Digite um nome para o grupo.");
    return;
  }

  btnCriarGrupo.disabled = true;
  btnCriarGrupo.innerText = "Criando...";

  try {
    const codigoConvite = gerarCodigoConvite();

    // 1. Cria o documento do grupo
    const grupoRef = await addDoc(collection(db, "grupos"), {
      nome,
      criadorId: usuarioAtual.uid,
      codigoConvite,
      dataCriacao: Timestamp.now(),
    });

    // 2. Adiciona quem criou como admin do grupo
    await setDoc(doc(db, "grupos", grupoRef.id, "membros", usuarioAtual.uid), {
      papel: "admin",
      entrouEm: Timestamp.now(),
    });

    // 3. Atualiza o perfil do jogador com o novo grupo
    await setDoc(
      doc(db, "jogadores", usuarioAtual.uid),
      {
        grupos: arrayUnion(grupoRef.id),
      },
      { merge: true }
    );

    // 4. Define esse grupo como o ativo no navegador
    localStorage.setItem("grupoAtivo", grupoRef.id);

    // 5. Mostra o código gerado
    document.getElementById("codigo-gerado").innerText = codigoConvite;
    document.getElementById("codigo-box").style.display = "block";
    document.getElementById("input-nome-grupo").disabled = true;
    btnCriarGrupo.style.display = "none";
  } catch (error) {
    console.error("Erro ao criar grupo:", error);
    mostrarErro("erro-criar", "Erro ao criar o grupo. Tente novamente.");
    btnCriarGrupo.disabled = false;
    btnCriarGrupo.innerText = "📅 CRIAR GRUPO";
  }
});

document.getElementById("btn-ir-inicio").addEventListener("click", () => {
  window.location.href = "inicio.html";
});

// ===========================================================
// ENTRAR EM GRUPO EXISTENTE (por código)
// ===========================================================
const btnEntrarGrupo = document.getElementById("btn-entrar-grupo");

btnEntrarGrupo.addEventListener("click", async () => {
  esconderErro("erro-entrar");

  if (!usuarioAtual) {
    mostrarErro("erro-entrar", "Aguarde, carregando sua sessão...");
    return;
  }

  const codigo = document.getElementById("input-codigo-grupo").value.trim().toUpperCase();
  if (!codigo) {
    mostrarErro("erro-entrar", "Digite o código de convite.");
    return;
  }

  btnEntrarGrupo.disabled = true;
  btnEntrarGrupo.innerText = "Procurando grupo...";

  try {
    // 1. Busca o grupo pelo código de convite
    const qGrupo = query(
      collection(db, "grupos"),
      where("codigoConvite", "==", codigo),
      limit(1)
    );
    const snapshot = await getDocs(qGrupo);

    if (snapshot.empty) {
      mostrarErro("erro-entrar", "Nenhum grupo encontrado com esse código.");
      btnEntrarGrupo.disabled = false;
      btnEntrarGrupo.innerText = "🔓 ENTRAR NO GRUPO";
      return;
    }

    const grupoDoc = snapshot.docs[0];

    // 2. Adiciona o usuário como membro (jogador comum)
    await setDoc(doc(db, "grupos", grupoDoc.id, "membros", usuarioAtual.uid), {
      papel: "jogador",
      entrouEm: Timestamp.now(),
    });

    // 3. Atualiza o perfil do jogador com o novo grupo
    await setDoc(
      doc(db, "jogadores", usuarioAtual.uid),
      {
        grupos: arrayUnion(grupoDoc.id),
      },
      { merge: true }
    );

    // 4. Define esse grupo como o ativo e vai pro dashboard
    localStorage.setItem("grupoAtivo", grupoDoc.id);
    window.location.href = "inicio.html";
  } catch (error) {
    console.error("Erro ao entrar no grupo:", error);
    mostrarErro("erro-entrar", "Erro ao entrar no grupo. Tente novamente.");
    btnEntrarGrupo.disabled = false;
    btnEntrarGrupo.innerText = "🔓 ENTRAR NO GRUPO";
  }
});