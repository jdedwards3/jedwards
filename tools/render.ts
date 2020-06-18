import { config } from "../config";
import ejs = require("ejs");
import fs = require("fs");
import fsExtra = require("fs-extra");
import globstd = require("glob");
import fetch from "node-fetch";
import util = require("util");
import uuidv4 = require("uuid/v4");
import * as simpleGit from "simple-git/promise";
const git = simpleGit();
const glob = util.promisify(globstd);
const mkdir = util.promisify(fs.mkdir);
const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);
const viewsPath = "./views";
const viewDataPath = "./viewData";

const environment = process.env.environment as string;

interface IComment {
  PartitionKey: string;
  RowKey: string;
  authorName: string;
  bodyText: string;
  status: number;
}

const pathClean = (path: string) =>
  path.split("/").slice(1).join("/").split(".")[0];

const pathPretty = (path: string) => `${pathClean(path.replace("/index", ""))}`;

const isNonIndexPost = (
  path: string,
  indexPath: string[],
  postPaths: string[]
) => path.indexOf(indexPath[0]) < 0 && postPaths.indexOf(path) > -1;

async function writeSiteMap(paths: string[]) {
  writeFile(
    "built/sitemap.txt",
    paths
      .filter((path) => path.indexOf("/404") < 0)
      .map((path) => `${config[environment].domain}/${pathPretty(path)}`)
      .join("\n"),
    "utf8"
  );
}

async function createOutputFolders(path: string) {
  await Promise.all([
    mkdir(
      `built/api/${
        pathPretty(path).indexOf("404") < 0 ? pathPretty(path) : ""
      }`,
      { recursive: true }
    ),
    mkdir(
      `built/${pathPretty(path).indexOf("404") < 0 ? pathPretty(path) : ""}`,
      { recursive: true }
    ),
  ]);
}

async function getPaths() {
  return Promise.all([
    glob("index.ejs", { cwd: `${viewsPath}` }),
    glob("pages/**/*.ejs", {
      cwd: `${viewsPath}`,
      ignore: ["partials/**/*.ejs", "index.ejs", "layout.ejs"],
    }),
    glob("posts/*.ejs", {
      cwd: `${viewsPath}`,
      ignore: ["partials/**/*.ejs", "index.ejs", "layout.ejs"],
    }),
  ]).then((paths) => paths);
}

async function getComments() {
  try {
    const data = await fetch(`${config[environment].functionsUrl}/comment`)
      .then((response) => response.json())
      .then((json) => json);

    return fetch(data.sasUrl, {
      headers: {
        Accept: "application/json;odata=nometadata",
        "Accept-Charset": "UTF-8",
      },
    })
      .then((response) => response.json())
      .then((json) => json.value);
  } catch (error) {
    // let everything continue
    console.warn("warning: no comments returned from api because of error!");
    return Promise.resolve([]);
  }
}

async function buildPageModel(model: any, path: string) {
  const today = new Date().toLocaleDateString();

  const log = await git.log({ file: `${viewsPath}/${path}` });

  const pageModel = {
    ...JSON.parse(model),
    createdDate: log.all.slice(-1)[0]
      ? new Date(log.all.slice(-1)[0].date).toLocaleDateString()
      : today,
    modifiedDate: log.latest
      ? new Date(log.latest.date).toLocaleDateString()
      : today,
  };

  if (!pageModel.guid) {
    // add guid to any new pages/posts
    pageModel.guid = uuidv4();

    // keep this json formatted same as on save b/c stored in git
    const { createdDate, modifiedDate, ...store } = pageModel;

    await writeFile(
      `${viewDataPath}/${path.split(".")[0]}.json`,
      JSON.stringify(store, null, 2),
      "utf8"
    );
  }

  if (path != "posts/index.ejs") {
    pageModel.partialHtml = await ejs.renderFile(`${viewsPath}/${path}`, {
      model: {
        ...pageModel,
        environment: { [environment]: config[environment] },
      },
    });
  }

  pageModel.slug = pathPretty(path);

  return pageModel;
}

async function getViewData(
  indexPath: string[],
  postPaths: string[],
  pagePaths: string[]
) {
  const viewData = await [...postPaths, ...pagePaths].reduce(
    async (viewData: any, path) => ({
      ...(await viewData),
      [path]: await readFile(
        `${viewDataPath}/${path.split(".")[0]}.json`,
        "utf8"
      ).then(async (model) => {
        return await buildPageModel(model, path);
      }),
    }),
    Promise.resolve({})
  );

  viewData["posts/index.ejs"].posts = Object.keys(viewData)
    .filter(
      (key) => key.indexOf(indexPath[0]) < 0 && postPaths.indexOf(key) > -1
    )
    .map((key) => ({ ...viewData[key], slug: pathClean(key) }))
    .sort(
      (first, second) =>
        new Date(second.createdDate).getTime() -
        new Date(first.createdDate).getTime()
    );

  viewData["posts/index.ejs"].partialHtml = await ejs.renderFile(
    `${viewsPath}/posts/index.ejs`,
    {
      model: {
        ...viewData["posts/index.ejs"],
        environment: { [environment]: config[environment] },
      },
    }
  );

  return viewData;
}

async function getPostmetaTemplate(
  pageModel: any,
  path: string,
  indexPath: string[],
  postPaths: string[],
  pagePaths: string[]
) {
  const postmetaTemplate = ejs.renderFile(
    `${viewsPath}/partials/postMeta.ejs`,
    {
      model: {
        createdDate: pageModel.createdDate,
        modifiedDate: pageModel.modifiedDate,
      },
    }
  );
  return isNonIndexPost(path, indexPath, postPaths) ? postmetaTemplate : null;
}

async function getCommentTemplate(
  pageModel: any,
  comments: IComment[],
  path: string,
  indexPath: string[],
  postPaths: string[],
  pagePaths: string[]
) {
  // reverse assuming comments are in chronological order
  // todo: sort by timestamp
  const commentTemplate = ejs.renderFile(`${viewsPath}/partials/comments.ejs`, {
    model: {
      comments: comments
        .reverse()
        .filter(
          (comment) =>
            comment.PartitionKey == pageModel.guid && comment.status == 1
        ),
    },
    pageModel: pageModel,
  });
  return isNonIndexPost(path, indexPath, postPaths) ? commentTemplate : null;
}

(async function main() {
  const [comments, [indexPath, pagePaths, postPaths]]: [
    IComment[],
    [string[], string[], string[]]
  ] = await Promise.all([getComments(), getPaths()]);

  const viewData = await getViewData(indexPath, postPaths, pagePaths);

  try {
    // cache bust es modules
    await fsExtra.move(`built/dist`, `built/scripts/${config.version}`, {
      overwrite: true,
    });
  } catch (error) {
    console.warn("warning: scripts already processed");
  }

  await Promise.all([
    writeSiteMap([...pagePaths, ...postPaths]),
    Promise.all(
      [...pagePaths, ...postPaths].map(async (path) => {
        await createOutputFolders(path);

        // todo: create json file with default props if not exists
        const pageModel = viewData[path];

        // create static api json file
        await writeFile(
          `built/api/${
            pathPretty(path).indexOf("404") < 0
              ? pathPretty(path) + "/index"
              : pathPretty(path)
          }.json`,
          JSON.stringify(pageModel),
          "utf8"
        );

        // prevent duplicate content
        pageModel.canonical = config.production.domain;

        pageModel.footerYear = new Date().getFullYear();

        pageModel.version = config.version;

        pageModel.environment = { [environment]: config[environment] };

        // only want a comment form on non-index posts
        // todo: yes only postMeta on posts but remove duplicate check
        const renderedFile = await ejs.renderFile(
          `${viewsPath}/${indexPath[0]}`,
          {
            postMeta: await getPostmetaTemplate(
              pageModel,
              path,
              indexPath,
              postPaths,
              pagePaths
            ),
            mainContent: pageModel.partialHtml,
            comments: await getCommentTemplate(
              pageModel,
              comments,
              path,
              indexPath,
              postPaths,
              pagePaths
            ),
            model: pageModel,
            rmwhitespace: true,
          }
        );

        // this is writing the actual html file
        await writeFile(
          `built/${
            pathPretty(path).indexOf("404") < 0
              ? pathPretty(path) + "/index"
              : pathPretty(path)
          }.html`,
          renderedFile,
          "utf8"
        );
      })
    ),
  ]);
})();
