window.onload = async function () {
  if (document.querySelectorAll("form[data-type]").length) {
    const { FormHandler } = await import("./formHandler.js");
    new FormHandler();
  }
};
