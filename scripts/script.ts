import { EmptyAdReloader } from "./emptyAdReloader.js";
window.onload = async function () {
  new EmptyAdReloader();
  if (document.querySelectorAll("form[data-type]").length > 0) {
    const { FormHandler } = await import("./formHandler.js");
    new FormHandler();
  }
};
