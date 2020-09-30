import { AzureFunction, Context, HttpRequest } from "@azure/functions";
import util = require("util");
import * as querystring from "querystring";
import * as simpleGit from "simple-git/promise";
import fs = require("fs");
import { tmpdir } from "os";
import uuidv4 = require("uuid/v4");
import globstd = require("glob");
import rimrafstd = require("rimraf");
const rimraf = util.promisify(rimrafstd);
const glob = util.promisify(globstd);
const mkdir = util.promisify(fs.mkdir);
const writeFile = util.promisify(fs.writeFile);
const readFile = util.promisify(fs.readFile);

const httpTrigger: AzureFunction = async function (
  context: Context,
  req: HttpRequest
): Promise<void> {
  context.log("HTTP trigger function processed a request.");

  context.res!.headers["Content-Type"] = "application/json";

  const payload = JSON.parse(querystring.parse(req.body).payload as string);

  //todo: validate header secret
  if (
    payload.action != "closed" ||
    payload.pull_request.base.ref != process.env["BaseBranch"] ||
    !payload.pull_request.merged_at
  ) {
    return;
  }

  const tempRepo = uuidv4();

  await mkdir(`${tmpdir}/${tempRepo}/viewData/comments`, {
    recursive: true,
  });

  const git = simpleGit(`${tmpdir}/${tempRepo}`);

  await git.init();

  await Promise.all([
    git.addConfig("user.name", `${process.env["GitHubUser"]}`),
    git.addConfig("user.email", `${process.env["AdminEmail"]}`),
  ]);

  await Promise.all([
    git.addRemote(
      "private",
      `https://${process.env["GitHubUser"]}:${process.env["GitHubUserPassword"]}@${process.env["GitHubPrivateRepo"]}`
    ),
    git.addRemote(
      "public",
      `https://${process.env["GitHubUser"]}:${process.env["GitHubUserPassword"]}@${process.env["GitHubPublicRepo"]}`
    ),
  ]);

  await git.fetch("public", `${process.env["BaseBranch"]}`);

  await git.checkout(`public/${process.env["BaseBranch"]}`, [
    "--",
    "viewData/comments/",
  ]);

  await git.checkoutBranch(
    `${process.env["BaseBranch"]}`,
    `public/${process.env["BaseBranch"]}`
  );

  await git.fetch("private", `${process.env["BaseBranch"]}`);

  await git.checkout(`private/${process.env["BaseBranch"]}`, [
    "--",
    "viewData/comments/",
  ]);

  const paths = await glob(`comments/**/*.json`, {
    cwd: `${tmpdir}/${tempRepo}/viewData/`,
  });

  await Promise.all(
    paths.map(async (path) => {
      let pathData = [];

      pathData = [
        ...JSON.parse(
          await readFile(`${tmpdir}/${tempRepo}/viewData/${path}`, "utf8")
        ),
      ];

      const publicData = pathData.map((item) => {
        const { authorEmail, ...store } = item;
        return store;
      });

      await writeFile(
        `${tmpdir}/${tempRepo}/viewData/${path}`,
        JSON.stringify(publicData, null, 2),
        "utf8"
      );
    })
  );

  await git.add(`${tmpdir}/${tempRepo}/viewData/comments/*.json`);

  await git.commit("approving comment");

  await git.push("public", `${process.env["BaseBranch"]}`);

  await rimraf(`${tmpdir}/${tempRepo}/`);

  context.res!.status = 200;
  context.res!.body = { message: "success" };
};

export default httpTrigger;
