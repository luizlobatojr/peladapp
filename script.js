if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/service-worker.js")
      .then((reg) => {
        console.log("Service Worker registrado com sucesso!");

        // Verifica se há uma atualização esperando para ser aplicada
        reg.addEventListener("updatefound", () => {
          const newWorker = reg.installing;

          newWorker.addEventListener("statechange", () => {
            // Se o novo Service Worker terminou de instalar e está pronto
            if (
              newWorker.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              // Cria um aviso na tela do usuário (pode customizar com CSS)
              const alertBox = document.createElement("div");
              alertBox.innerHTML = `
                <div style="position: fixed; bottom: 20px; right: 20px; background: #333; color: #fff; padding: 15px; border-radius: 8px; z-index: 9999; box-shadow: 0px 4px 10px rgba(0,0,0,0.3);">
                  <p style="margin: 0 0 10px 0;">Nova atualização disponível!</p>
                  <button id="reload-app" style="background: #28a745; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer;">Atualizar Agora</button>
                </div>
              `;
              document.body.appendChild(alertBox);

              // Quando clicar, recarrega a página para puxar os arquivos novos
              document
                .getElementById("reload-app")
                .addEventListener("click", () => {
                  // Envia a mensagem para o worker que está esperando ativar
                  newWorker.postMessage({ action: "skipWaiting" });
                });

              // E adicione este ouvinte fora do bloco para recarregar quando o novo worker assumir o controle
              navigator.serviceWorker.addEventListener(
                "controllerchange",
                () => {
                  window.location.reload();
                },
              );
            }
          });
        });
      })
      .catch((err) => console.log("Erro ao registrar o Service Worker:", err));
  });
}
