import { AzureFunction, Context, HttpRequest } from "@azure/functions";
import * as querystring from "querystring";
import * as azure from "azure-storage";
import uuidv4 = require("uuid/v4");
import * as SendGrid from "@sendgrid/mail";
SendGrid.setApiKey(process.env["SendGridApiKey"] as string);

const createTableIfNotExists = (
  tableService: azure.TableService,
  tableName: string
) =>
  new Promise((resolve, reject) => {
    tableService.createTableIfNotExists(tableName, (error, result) => {
      if (error) {
        reject(error);
      } else {
        resolve({ result: result });
      }
    });
  });

const insertEntity = (
  tableService: azure.TableService,
  tableName: string,
  entity: any
) =>
  new Promise((resolve, reject) => {
    tableService.insertEntity(tableName, entity, (error, result) => {
      if (error) {
        reject(error);
      } else {
        resolve({ result: result });
      }
    });
  });

const httpTrigger: AzureFunction = async function(
  context: Context,
  req: HttpRequest
): Promise<void> {
  context.log("HTTP trigger function processed a request.");

  context.res!.headers["Content-Type"] = "application/json";

  const tableName = "comments";

  const tableService = azure.createTableService(process.env[
    "TableStorageConnection"
  ] as string);

  if (req.method == "POST") {
    const body = querystring.parse(req.body);

    //todo: validate
    if (
      body &&
      body.comment &&
      body.postGuid &&
      body.authorEmail &&
      body.authorName
    ) {
      await createTableIfNotExists(tableService, tableName);

      const commentEntity = {
        PartitionKey: body.postGuid,
        RowKey: uuidv4(),
        status: 0,
        authorEmail: body.authorEmail,
        authorName: body.authorName,
        bodyText: body.comment
      };

      await insertEntity(tableService, tableName, commentEntity);

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
        text: "A new comment has been posted. Update status to approve."
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
    const startDate = new Date();
    const expiryDate = new Date(startDate);

    expiryDate.setMinutes(startDate.getMinutes() + 15);
    startDate.setMinutes(startDate.getMinutes() - 15);

    const sharedAccessPolicy: azure.TableService.TableSharedAccessPolicy = {
      AccessPolicy: {
        Permissions: azure.TableUtilities.SharedAccessPermissions.QUERY,
        Start: startDate,
        Expiry: expiryDate
      }
    };

    //getting all comments for now since they are actually needed
    const sasToken = tableService.generateSharedAccessSignature(
      "comments",
      sharedAccessPolicy
    );

    const sasUrl = tableService.getUrl("comments", sasToken);

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
