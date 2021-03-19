export default class Main {
  constructor() {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/service-worker.js", { scope: "/" })
        .then(function () {
          console.log("Service Worker Registered");
        });
    }
    window.addEventListener("load", async function () {
      if (document.querySelectorAll("form[data-type]").length) {
        const { FormHandler } = await import("./formHandler.js");
        new FormHandler();
      }
    });
  }
}

new Main();
