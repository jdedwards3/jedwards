import { AzureFunction, Context, HttpRequest } from "@azure/functions";
import * as querystring from "querystring";
import util = require("util");
import uuidv4 = require("uuid/v4");
import * as simpleGit from "simple-git/promise";
import { formHelpers } from "../common/formHelpers";
import { Octokit } from "@octokit/rest";
import fs = require("fs");
import rimrafstd = require("rimraf");
import { tmpdir } from "os";
const rimraf = util.promisify(rimrafstd);
const mkdir = util.promisify(fs.mkdir);
const writeFile = util.promisify(fs.writeFile);
const readFile = util.promisify(fs.readFile);

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
    !(
      body &&
      body.comment &&
      body.postGuid &&
      body.authorEmail &&
      body.authorName
    )
  ) {
    context.res!.status = 400;
    context.res!.body = {
      message: "Comment invalid. Please correct errors and try again.",
    };
    return;
  }

  const tempRepo = uuidv4();

  await mkdir(`${tmpdir}/${tempRepo}/${process.env["CommentPath"]}`, {
    recursive: true,
  });

  const git = simpleGit(`${tmpdir}/${tempRepo}`);

  await git.init();

  await Promise.all([
    git.addConfig("user.name", `${process.env["GitHubUser"]}`),
    git.addConfig("user.email", `${process.env["AdminEmail"]}`),
  ]);

  await git.addRemote(
    "private",
    `https://${process.env["GitHubUser"]}:${process.env["GitHubUserPassword"]}@${process.env["GitHubPrivateRepo"]}`
  );

  const commentId = uuidv4();

  try {
    await git.fetch("private", `${process.env["BaseBranch"]}`);

    await git.checkout(`private/${process.env["BaseBranch"]}`, [
      "--",
      `${process.env["CommentPath"]}/${body.postGuid}.json`,
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
        `${tmpdir}/${tempRepo}/${process.env["CommentPath"]}/${body.postGuid}.json`,
        "utf8"
      )
    );
  } catch (error) {
    //no previous comments
  }

  comments.push(comment);

  await writeFile(
    `${tmpdir}/${tempRepo}/${process.env["CommentPath"]}/${body.postGuid}.json`,
    JSON.stringify(comments, null, 2),
    "utf8"
  );

  await git.add(
    `${tmpdir}/${tempRepo}/${process.env["CommentPath"]}/${body.postGuid}.json`
  );

  await git.commit(`adding comment ${commentId}`);

  await git.push("private", `${commentId}`);

  await new Octokit({
    auth: process.env["GitHubUserPassword"],
  }).pulls.create({
    owner: `${process.env["GitHubUser"]}`,
    repo: `${process.env["PrivateRepoName"]}`,
    title: `${commentId}`,
    head: `${commentId}`,
    base: `${process.env["BaseBranch"]}`,
  });

  await rimraf(`${tmpdir}/${tempRepo}/`);

  context.res!.status = 200;
  context.res!.body = {
    message: "Thank you for your comment. It will be posted when approved.",
  };
};

export default httpTrigger;
