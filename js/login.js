import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "./firebase.js"; // Certifique-se que importa a auth daqui

// Seleciona o formulário
const formLogin = document.getElementById("login-form");

// TESTE DE SEGURANÇA: Só adiciona o listener se o formulário existir
if (formLogin) {
  formLogin.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("email").value;
    const senha = document.getElementById("senha").value;

    try {
      await signInWithEmailAndPassword(auth, email, senha);
      window.location.href = "inicio.html";
    } catch (error) {
      console.error("Erro no login:", error);
      alert("Erro: " + error.message);
    }
  });
} else {
  console.error(
    "ERRO: O elemento com id 'login-form' não foi encontrado no HTML.",
  );
}
