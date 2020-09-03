import { AzureFunction, Context, HttpRequest } from "@azure/functions";
import * as querystring from "querystring";
import util = require("util");
import uuidv4 = require("uuid/v4");
import * as SendGrid from "@sendgrid/mail";
import * as simpleGit from "simple-git/promise";
import { storageHelpers } from "../common/storageHelpers";
import { formHelpers } from "../common/formHelpers";
import { Octokit } from "@octokit/rest";
import fs = require("fs");
import rimrafstd = require("rimraf");
import { tmpdir } from "os";
const rimraf = util.promisify(rimrafstd);
const mkdir = util.promisify(fs.mkdir);
const writeFile = util.promisify(fs.writeFile);
const readFile = util.promisify(fs.readFile);
SendGrid.setApiKey(process.env["SendGridApiKey"] as string);
const commentTable = "comments";

const httpTrigger: AzureFunction = async function (
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
      const tempRepo = uuidv4();

      await mkdir(`${tmpdir}/${tempRepo}/viewData/comments`, {
        recursive: true,
      });

      const git = simpleGit(`${tmpdir}/${tempRepo}`);

      await git.init();

      await git.addConfig("user.name", `${process.env["GitHubUser"]}`);
      await git.addConfig("user.email", `${process.env["AdminEmail"]}`);

      await git.addRemote(
        "private",
        `https://${process.env["GitHubUser"]}:${process.env["GitHubUserPassword"]}@${process.env["GitHubPrivateRepo"]}`
      );

      const commentId = uuidv4();

      try {
        await git.fetch("private", `${process.env["BaseBranch"]}`);

        await git.checkout(`private/${process.env["BaseBranch"]}`, [
          "--",
          `viewData/comments/${body.postGuid}.json`,
        ]);

        await git.checkoutBranch(
          `${commentId}`,
          `private/${process.env["BaseBranch"]}`
        );
      } catch (error) {
        await git.checkout(`private/${process.env["BaseBranch"]}`);
        await git.checkoutLocalBranch(`${commentId}`);
      }

      const comment = {
        id: commentId,
        timestamp: new Date(new Date().toUTCString()).getTime(),
        authorEmail: body.authorEmail,
        authorName: body.authorName,
        bodyText: body.comment,
      };

      let comments = [];

      try {
        comments = JSON.parse(
          await readFile(
            `${tmpdir}/${tempRepo}/viewData/comments/${body.postGuid}.json`,
            "utf8"
          )
        );
      } catch (error) {
        //no previous comments
      }

      comments.push(comment);

      await writeFile(
        `${tmpdir}/${tempRepo}/viewData/comments/${body.postGuid}.json`,
        JSON.stringify(comments, null, 2),
        "utf8"
      );

      await git.add(
        `${tmpdir}/${tempRepo}/viewData/comments/${body.postGuid}.json`
      );

      await git.commit(`adding comment ${commentId}`);

      await git.push("private", `${commentId}`);

      await rimraf(`${tmpdir}/${tempRepo}/`);

      /* todo: remove */
      await storageHelpers.createTableIfNotExists(commentTable);
      const commentEntity = {
        PartitionKey: body.postGuid,
        RowKey: uuidv4(),
        status: 0,
        authorEmail: body.authorEmail,
        authorName: body.authorName,
        bodyText: body.comment,
      };
      await storageHelpers.insertEntity(commentTable, commentEntity);
      /* end remove */

      const userEmail = {
        to: body.authorEmail,
        from: "noreply@jamesedwards.name",
        subject: "Thank you for your comment!",
        text: "It will be posted when approved.",
      };

      const adminEmail = {
        to: process.env["AdminEmail"],
        from: "noreply@jamesedwards.name",
        subject: "New comment posted!",
        html: `A new comment has been posted.
        <div>from: ${body.authorName}</div>
        <div>email: ${body.authorEmail}</div>
        <div>comment: ${body.comment}</div>
        Update status to approve.`,
      };

      await Promise.all([
        SendGrid.send(userEmail),
        SendGrid.send(adminEmail),
        new Octokit({
          auth: process.env["GitHubUserPassword"],
        }).pulls.create({
          owner: `${process.env["GitHubUser"]}`,
          repo: `${process.env["PrivateRepoName"]}`,
          title: `${commentId}`,
          head: `${commentId}`,
          base: `${process.env["BaseBranch"]}`,
        }),
      ]);

      context.res!.status = 200;
      context.res!.body = {
        message: "Thank you for your comment. It will be posted when approved.",
      };
    } else {
      context.res!.status = 400;
      context.res!.body = {
        message: "Comment invalid. Please correct errors and try again.",
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
      message: "An error occured. Please try again later.",
    };
  }
};

export default httpTrigger;
