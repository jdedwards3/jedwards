import { errorHandler, errorLogger } from "./errorHandler.js";

export class FormHandler {
  constructor() {
    document.body.addEventListener("submit", async function(event) {
      event.preventDefault();
      const statusMsgElement = document.getElementById("form-submit-msg");

      statusMsgElement!.innerText = "Submitting reply... Please wait.";

      const form = event.target as HTMLFormElement;

      // casting to any here to satisfy tsc
      // sending body as x-www-form-url-encoded
      const result = await fetch(form.action, {
        method: form.method,
        body: new URLSearchParams(new FormData(form) as any)
      })
        .then(errorHandler)
        .then((response: Response) => response.json())
        .then(json => json)
        .catch(errorLogger);

      statusMsgElement!.innerText = result.message;
    });
  }
}
