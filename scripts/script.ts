(async function () {
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

  let w = window.outerWidth;
  window.addEventListener("resize", function () {
    // show previously hidden ads on window resize
    const emptyAds = Array.from(document.querySelectorAll("ins")).filter(
      function (elem) {
        return !elem.children.length && elem.offsetHeight > 0;
      }
    );

    if (emptyAds && w != window.outerWidth) {
      emptyAds.forEach(function (elem) {
        delete elem.dataset.adsbygoogleStatus;
        let adsbygoogle = (window as any).adsbygoogle || [];
        adsbygoogle.push({});
      });
    }
    w = window.outerWidth;
  });
})();
