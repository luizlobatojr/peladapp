import { signOut } from "firebase/auth"; // O signOut é da biblioteca do firebase
import { auth } from "./firebase.js";    // Importe o auth que você exportou acima

// Agora o 'auth' já está inicializado e pronto para usar
document.addEventListener("DOMContentLoaded", () => {
  const btnSair = document.querySelector(".menu-item.danger");
  if (btnSair) {
    btnSair.addEventListener("click", async () => {
      try {
        await signOut(auth); // Usando o auth importado
        window.location.href = "login.html";
      } catch (error) {
        console.error("Erro ao sair:", error);
      }
    });
  }
});
