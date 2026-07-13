import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { db } from "./firebase.js";

const auth = getAuth();
const formCadastro = document.getElementById("form-cadastro");

formCadastro.addEventListener("submit", async (e) => {
  e.preventDefault();

  const nome = document.getElementById("nome").value;
  const email = document.getElementById("email").value;
  const telefone = document.getElementById("telefone").value;
  const senha = document.getElementById("senha").value;
  const confirmarSenha = document.getElementById("confirmar-senha").value;

  if (senha !== confirmarSenha) {
    alert("As senhas não coincidem!");
    return;
  }

  try {
    // 1. Criar usuário no Auth
    const userCredential = await createUserWithEmailAndPassword(auth, email, senha);
    const user = userCredential.user;

    // 2. Criar perfil no Firestore
    // Usamos toISOString() para garantir que a data seja gravada como string no Firestore
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
      dataCriacao: new Date().toISOString() 
    });

    alert("Conta criada com sucesso!");
    // Redireciona diretamente para a home após o sucesso
    window.location.href = "inicio.html"; 
    
  } catch (error) {
    console.error("Erro no cadastro:", error);
    if (error.code === "auth/email-already-in-use") {
      alert("Este e-mail já está sendo utilizado.");
    } else {
      alert("Erro ao criar conta: " + error.message);
    }
  }
});