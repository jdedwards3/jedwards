import { AzureFunction, Context, HttpRequest } from "@azure/functions";
import * as querystring from "querystring";
import * as SendGrid from "@sendgrid/mail";
import { formHelpers } from "../common/formHelpers";
SendGrid.setApiKey(process.env["SENDGRID_API_KEY"] as string);

const httpTrigger: AzureFunction = async function (
  context: Context,
  req: HttpRequest
): Promise<void> {
  context.log("HTTP trigger function processed a request.");

  context.res!.headers["Content-Type"] = "application/json";

  const body = querystring.parse(req.body);

  if (!(await formHelpers.verifiedRequestBody(body))) {
    // failed verification
    context.res!.status = 200;
    context.res!.body = { message: "success" };
    return;
  }

  if (
    !(body && body.firstName && body.lastName && body.email && body.message)
  ) {
    context.res!.status = 400;
    context.res!.body = {
      message: "Contact form is invalid. Please correct errors and try again.",
    };
    return;
  }

  const adminEmail = {
    to: process.env["ADMIN_EMAIL"],
    from: "admin@jamesedwards.net",
    subject: `Message from ${body.firstName} ${body.lastName}`,
    html: `<div>First Name: ${body.firstName}</div>
           <div>Last Name: ${body.lastName}</div>
           <div>Email: ${body.email}</div>
           <div>Website: ${body.website}</div>
           <div>Message: ${body.message}</div>`,
  };

  await SendGrid.send(adminEmail);

  context.res!.status = 200;
  context.res!.body = {
    message: "Thank you for contacting me! I will reply to you shortly.",
  };
};

export default httpTrigger;
