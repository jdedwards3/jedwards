import { config } from "../config";
import ejs = require("ejs");
import fs = require("fs");
import globstd = require("glob");
import fetch from "node-fetch";
import util = require("util");
import uuidv4 = require("uuid/v4");
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

async function writeSiteMap(paths: string[]) {
  writeFile(
    "built/sitemap.txt",
    paths
      .map(path =>
        path == "index"
          ? config[environment].domain
          : config[environment].domain + path
      )
      .join("\n"),
    "utf8"
  );
}

async function getPaths() {
  return Promise.all([
    glob("index.ejs", { cwd: `${viewsPath}` }),
    glob("pages/*.ejs", {
      cwd: `${viewsPath}`,
      ignore: ["partials/**/*.ejs", "index.ejs", "layout.ejs"]
    }),
    glob("posts/*.ejs", {
      cwd: `${viewsPath}`,
      ignore: ["partials/**/*.ejs", "index.ejs", "layout.ejs"]
    })
  ]).then(paths => paths);
}

async function getComments() {
  try {
    const data = await fetch(`${config[environment].functionsUrl}/comment`)
      .then(response => response.json())
      .then(json => json);

    return fetch(data.sasUrl, {
      headers: {
        Accept: "application/json;odata=nometadata",
        "Accept-Charset": "UTF-8"
      }
    })
      .then(response => response.json())
      .then(json => json.value);
  } catch (error) {
    // let everything continue
    console.warn("warning: no comments returned from api because of error!");
    return Promise.resolve([]);
  }
}

(async function initialize() {
  const [comments, [index, pages, posts]]: [
    IComment[],
    [string[], string[], string[]]
  ] = await Promise.all([getComments(), getPaths()]);

  await mkdir("built/api", { recursive: true });

  console.warn(environment);
  await Promise.all([
    writeSiteMap(
      [...index, ...pages, ...posts].map(item => item.split(".")[0])
    ),
    Promise.all(
      [...pages, ...posts].map(async path => {
        // todo: create json file with default props if not exists
        const pageModel = await readFile(
          `${viewDataPath}/${path.split(".")[0]}.json`,
          "utf8"
        ).then(model => JSON.parse(model));

        pageModel.environment = config[environment];

        if (!pageModel.guid) {
          //add guid to any new pages/posts
          pageModel.guid = uuidv4();

          // keep this json formatted same as on save b/c stored in git
          await writeFile(
            `${viewDataPath}/${path.split(".")[0]}.json`,
            JSON.stringify(pageModel, null, 2),
            "utf8"
          );
        }

        //todo: get real comments
        const commentModel = {
          comments: comments.filter(
            comment =>
              comment.PartitionKey == pageModel.guid && comment.status == 1
          )
        };

        const commentsTemplate = await ejs
          .renderFile(`${viewsPath}/partials/comments.ejs`, {
            model: commentModel,
            pageModel: pageModel
          })
          .then(output => output);

        const partialHtml = await ejs
          .renderFile(`${viewsPath}/${path}`, { model: pageModel })
          .then(output => output);

        pageModel.slug = `${path.split("/")[1].split(".")[0]}`;

        pageModel.footerYear = new Date().getFullYear();

        // only want a comment form on non-index posts
        const renderedFile = await ejs
          .renderFile(
            `${viewsPath}/${index[0]}`,
            {
              mainContent: partialHtml,
              comments:
                path.indexOf(index[0]) < 0 && posts.indexOf(path) > -1
                  ? commentsTemplate
                  : null,
              model: pageModel
            },
            { rmWhitespace: true }
          )
          .then(output => output);

        pageModel.partialHtml = partialHtml;

        await Promise.all([
          //this is writing the original json file to include partial html to built
          writeFile(
            `built/api/${path.split("/")[1].split(".")[0]}.json`,
            JSON.stringify(pageModel),
            "utf8"
          ),
          //this is writing the actual html file
          writeFile(
            `built/${path.split("/")[1].split(".")[0]}.html`,
            renderedFile,
            "utf8"
          )
        ]);
      })
    )
  ]);
})();
