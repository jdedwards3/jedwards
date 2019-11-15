import { AzureFunction, Context, HttpRequest } from "@azure/functions";
import * as querystring from "querystring";
import uuidv4 = require("uuid/v4");
import * as SendGrid from "@sendgrid/mail";
import { formHelpers } from "../common/formHelpers";
import { storageHelpers } from "../common/storageHelpers";
const tableName = "contactForm";

const httpTrigger: AzureFunction = async function(
  context: Context,
  req: HttpRequest
): Promise<void> {
  context.log("HTTP trigger function processed a request.");

  context.res!.headers["Content-Type"] = "application/json";

  const body = querystring.parse(req.body);

  if (!formHelpers.verifiedRequestBody(body)) {
    context.res!.status = 400;
    context.res!.body = {
      message: "invalid request"
    };
    return;
  }

  if (body && body.firstName && body.lastName && body.email && body.message) {
    await storageHelpers.createTableIfNotExists(tableName);

    const contactFormEntity = {
      PartitionKey: "contactForm",
      RowKey: uuidv4(),
      firstName: body.firstName,
      lastName: body.lastName,
      email: body.email,
      message: body.message,
      website: body.website
    };

    const adminEmail = {
      to: process.env["AdminEmail"],
      from: "noreply@jamesedwards.name",
      subject: "New Contact Form Submission",
      html: `<div>from: ${body.firstName} ${body.lastName}</div>
      <div>message: ${body.message}</div>`
    };

    await Promise.all([
      storageHelpers.insertEntity(tableName, contactFormEntity),
      SendGrid.send(adminEmail)
    ]);
    context.res!.status = 200;
    context.res!.body = {
      message: "Thank you for contacting me! I will reply to you shortly."
    };
  } else {
    context.res!.status = 400;
    context.res!.body = {
      message: "Contact form is invalid. Please correct errors and try again."
    };
  }
};

export default httpTrigger;
