import { AzureFunction, Context, HttpRequest } from "@azure/functions";
import * as querystring from "querystring";
import uuidv4 = require("uuid/v4");
import * as SendGrid from "@sendgrid/mail";
import { storageHelpers } from "../common/storageHelpers";
import { formHelpers } from "../common/formHelpers";
SendGrid.setApiKey(process.env["SendGridApiKey"] as string);
const commentTable = "comments";

const httpTrigger: AzureFunction = async function(
  context: Context,
  req: HttpRequest
): Promise<void> {
  context.log("HTTP trigger function processed a request.");

  context.res!.headers["Content-Type"] = "application/json";

  const body = querystring.parse(req.body);

  if (req.method == "POST") {
    if (!(await formHelpers.verifiedRequestBody(body))) {
      // failed verification
      context.res!.status = 200;
      context.res!.body = { message: "success" };
      return;
    }

    if (
      body &&
      body.comment &&
      body.postGuid &&
      body.authorEmail &&
      body.authorName
    ) {
      await storageHelpers.createTableIfNotExists(commentTable);

      const commentEntity = {
        PartitionKey: body.postGuid,
        RowKey: uuidv4(),
        status: 0,
        authorEmail: body.authorEmail,
        authorName: body.authorName,
        bodyText: body.comment
      };

      await storageHelpers.insertEntity(commentTable, commentEntity);

      const userEmail = {
        to: body.authorEmail,
        from: "noreply@jamesedwards.name",
        subject: "Thank you for your comment!",
        text: "It will be posted when approved."
      };

      const adminEmail = {
        to: process.env["AdminEmail"],
        from: "noreply@jamesedwards.name",
        subject: "New comment posted!",
        html: `A new comment has been posted. 
        <div>from: ${body.authorName}</div>
        <div>email: ${body.authorEmail}</div>
        <div>comment: ${body.comment}</div>
        Update status to approve.`
      };

      await Promise.all([SendGrid.send(userEmail), SendGrid.send(adminEmail)]);

      context.res!.status = 200;
      context.res!.body = {
        message: "Thank you for your comment. It will be posted when approved."
      };
    } else {
      context.res!.status = 400;
      context.res!.body = {
        message: "Comment invalid. Please correct errors and try again."
      };
    }
  } else if (req.method == "GET") {
    await storageHelpers.createTableIfNotExists(commentTable);

    //getting all comments for now since they are actually needed
    const sasToken = storageHelpers
      .tableService()
      .generateSharedAccessSignature(
        commentTable,
        storageHelpers.getSharedAccessPolicy()
      );

    const sasUrl = storageHelpers.tableService().getUrl("comments", sasToken);

    context.res!.status = 200;
    context.res!.body = { sasUrl };
  } else {
    context.res!.status = 500;
    context.res!.body = {
      message: "An error occured. Please try again later."
    };
  }
};

export default httpTrigger;
