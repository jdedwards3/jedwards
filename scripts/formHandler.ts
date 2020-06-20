export class FormHandler {
  constructor() {
    this.formSubmitListener();
  }

  private formSubmitListener() {
    document.body.addEventListener("submit", async function (event) {
      event.preventDefault();

      const { errorHandler, errorLogger } = await import("./errorHandler.js");

      const submitButton = document.querySelector(
        "button[type=submit]"
      ) as HTMLInputElement;

      submitButton.disabled = true;

      const statusMsgElement = document.getElementById("form-submit-msg");

      statusMsgElement!.innerText = "Submitting reply... Please wait.";

      const form = event.target as HTMLFormElement;

      const formData = new FormData(form);

      const result = await fetch(
        `${form.action}/formToken/${new Date(
          new Date().toUTCString()
        ).getTime()}/${form.dataset.type}`
      )
        .then(errorHandler)
        .then((response: Response) => response.json())
        .then((data) => {
          // anti-forgery
          formData.append("_csrf", data.token);
          return data.type;
        })
        .then(
          async (type) =>
            // casting to any here to satisfy tsc
            // sending body as x-www-form-url-encoded
            // formData convert to array for edge browser support
            await fetch(`${form.action}/${type}`, {
              method: form.method,
              body: new URLSearchParams([...(formData as any)]),
            })
        )
        .then(errorHandler)
        .then((response: Response) => response.json())
        .then((json) => json)
        .catch(errorLogger);

      statusMsgElement!.innerText = result.message;
      submitButton.disabled = false;
    });
  }
}
