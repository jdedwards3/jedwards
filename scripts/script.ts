(async function () {
  window.addEventListener("load", async function () {
    if (document.querySelectorAll("form[data-type]").length) {
      const { FormHandler } = await import("./formHandler.js");
      new FormHandler();
    }
    if (document.querySelectorAll(".ad-unit").length) {
      const { adCheck } = await import("./adHandler.js");
      adCheck();
    }
  });

  let t: any = null;
  let w = window.outerWidth;
  if (document.querySelectorAll(".ad-unit").length) {
    const { adReload } = await import("./adHandler.js");
    window.addEventListener("resize", function () {
      if (w != window.outerWidth) {
        t = adReload(t);
      }
      w = window.outerWidth;
    });
  }
})();
