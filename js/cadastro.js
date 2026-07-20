import { createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

import { app, auth, db, storage } from "./firebase.js";

console.log("Firebase carregado com sucesso via app.js", app);
const formCadastro = document.getElementById("form-cadastro");
const inputFoto = document.getElementById("input-foto");
const avatarPreview = document.getElementById("avatar-preview");

const BANDEIRAS = {
  BR: "🇧🇷",
  PT: "🇵🇹",
  AO: "🇦🇴",
  MZ: "🇲🇿",
  CV: "🇨🇻",
  ES: "🇪🇸",
  FR: "🇫🇷",
  IT: "🇮🇹",
  GB: "🇬🇧",
  US: "🇺🇸",
  OUTRO: "🏳️",
};

let arquivoFotoSelecionado = null;

// ---------- Preview da foto assim que o usuário escolhe ----------
inputFoto.addEventListener("change", () => {
  const arquivo = inputFoto.files[0];
  if (!arquivo) return;

  if (!arquivo.type.startsWith("image/")) {
    alert("Escolha um arquivo de imagem.");
    inputFoto.value = "";
    return;
  }

  if (arquivo.size > 5 * 1024 * 1024) {
    alert("A imagem precisa ter no máximo 5MB.");
    inputFoto.value = "";
    return;
  }

  arquivoFotoSelecionado = arquivo;

  const leitor = new FileReader();
  leitor.onload = (e) => {
    avatarPreview.style.backgroundImage = `url(${e.target.result})`;
    avatarPreview.innerText = "";
  };
  leitor.readAsDataURL(arquivo);
});

formCadastro.addEventListener("submit", async (e) => {
  e.preventDefault();

  const nome = document.getElementById("nome").value;
  const email = document.getElementById("email").value;
  const telefone = document.getElementById("telefone").value;
  const senha = document.getElementById("senha").value;
  const confirmarSenha = document.getElementById("confirmar-senha").value;
  const nacionalidade = document.getElementById("nacionalidade").value;

  if (senha !== confirmarSenha) {
    alert("As senhas não coincidem!");
    return;
  }

  const btnSubmit = formCadastro.querySelector(".submit-btn");
  const textoOriginal = btnSubmit.innerText;
  btnSubmit.disabled = true;
  btnSubmit.innerText = "Criando conta...";

  try {
    // 1. Criar usuário no Auth
    const userCredential = await createUserWithEmailAndPassword(auth, email, senha);
    const user = userCredential.user;

    // 2. Upload da foto de perfil, se o usuário escolheu uma
    let fotoURL = "";
    if (arquivoFotoSelecionado) {
      btnSubmit.innerText = "Enviando foto...";
      const storageRef = ref(storage, `avatars/${user.uid}`);
      await uploadBytes(storageRef, arquivoFotoSelecionado);
      fotoURL = await getDownloadURL(storageRef);
    }

    // 3. Criar perfil no Firestore
    btnSubmit.innerText = "Criando conta...";
    await setDoc(doc(db, "jogadores", user.uid), {
      nome: nome,
      overall: 50, // Iniciando com 50 conforme sua média padrão
      ritmo: 50,
      penalty: 50,
      finalizacao: 50,
      defesa: 50,
      passe: 50,
      fisico: 50,
      email: email,
      telefone: telefone,
      nacionalidade: nacionalidade,
      bandeira: BANDEIRAS[nacionalidade] || "🏳️",
      fotoURL: fotoURL,
      posicao: 0,
      aproveitamento: 0,
      variacao: 0,
      jogos: 0,
      vitorias: 0,
      gols: 0,
      assistencias: 0,
      mvps: 0,
      sequencias: 0,
      xpAtual: 0,
      xpMeta: 1000,
      dataCriacao: new Date().toISOString(),
    });

    alert("Conta criada com sucesso!");
    window.location.href = "inicio.html";
  } catch (error) {
    console.error("Erro no cadastro:", error);
    if (error.code === "auth/email-already-in-use") {
      alert("Este e-mail já está sendo utilizado.");
    } else {
      alert("Erro ao criar conta: " + error.message);
    }
    btnSubmit.disabled = false;
    btnSubmit.innerText = textoOriginal;
  }
});
