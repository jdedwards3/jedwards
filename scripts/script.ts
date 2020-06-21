window.onload = async function () {
  if (document.querySelectorAll("form[data-type]").length) {
    const { FormHandler } = await import("./formHandler.js");
    new FormHandler();
  }
};

window.onresize = async function () {
  // show previously hidden ads on window resize
  const emptyAds = Array.from(document.querySelectorAll("ins")).filter(
    function (elem) {
      return !elem.children.length && elem.offsetHeight > 0;
    }
  );
  if (emptyAds.length) {
    const { emptyAdReloader } = await import("./emptyAdReloader.js");
    emptyAdReloader(emptyAds);
  }
};
