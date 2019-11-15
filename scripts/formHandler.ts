import { errorHandler, errorLogger } from "./errorHandler.js";

export class FormHandler {
  constructor() {
    document.body.addEventListener("submit", async function(event) {
      event.preventDefault();

      const statusMsgElement = document.getElementById("form-submit-msg");

      statusMsgElement!.innerText = "Submitting reply... Please wait.";

      const form = event.target as HTMLFormElement;

      const formData = new FormData(form);

      const result = await fetch(
        `${form.dataset.formToken}/${new Date(
          new Date().toUTCString()
        ).getTime()}`
      )
        .then(errorHandler)
        .then((response: Response) => response.json())
        .then(data => {
          // anti-forgery
          formData.append("_csrf", data.token);
        })
        .then(
          async () =>
            // casting to any here to satisfy tsc
            // sending body as x-www-form-url-encoded
            await fetch(form.action, {
              method: form.method,
              body: new URLSearchParams(formData as any)
            })
        )
        .then(errorHandler)
        .then((response: Response) => response.json())
        .then(json => json)
        .catch(errorLogger);

      statusMsgElement!.innerText = result.message;
    });
  }
}
