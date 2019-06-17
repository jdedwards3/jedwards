import { config } from "../config";
import ejs = require("ejs");
import fs = require("fs");
import globstd = require("glob");
import util = require("util");
import uuidv4 = require("uuid/v4");
const glob = util.promisify(globstd);
const mkdir = util.promisify(fs.mkdir);
const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);
const viewsPath = "./views";
const viewDataPath = "./viewData";

async function writeSiteMap(paths: string[]) {
  await writeFile(
    "sitemap.txt",
    paths.map(path => (path = config.domain + path)).join("\n"),
    "utf8"
  );
}

(async function initialize() {
  const [indexPath, filePaths]: [string[], string[]] = await Promise.all([
    glob("index.ejs", { cwd: `${viewsPath}` }),
    glob("**/*.ejs", {
      cwd: `${viewsPath}`,
      ignore: ["partials/**/*.ejs", "index.ejs", "layout.ejs"]
    })
  ]).then(paths => paths);

  await mkdir("built/api", { recursive: true });

  await Promise.all([
    await writeSiteMap(
      [...indexPath, ...filePaths].map(item => item.split(".")[0])
    ),
    filePaths.map(async path => {
      const pageModel = await readFile(
        `${viewDataPath}/${path.split(".")[0]}.json`,
        "utf8"
      ).then(model => JSON.parse(model));

      const partialHtml = await ejs
        .renderFile(`${viewsPath}/${path}`, { model: pageModel })
        .then(output => output);

      pageModel.slug = `${path.split("/")[1].split(".")[0]}`;

      pageModel.footerYear = new Date().getFullYear();

      const renderedFile = await ejs
        .renderFile(
          `${viewsPath}/${indexPath[0]}`,
          {
            mainContent: partialHtml,
            model: pageModel
          },
          { rmWhitespace: true }
        )
        .then(output => output);

      pageModel.partialHtml = partialHtml;

      await Promise.all([
        //this is writing the original json file to include partial html to built
        await writeFile(
          `built/api/${path.split("/")[1].split(".")[0]}.json`,
          JSON.stringify(pageModel),
          "utf8"
        ),
        //this is writing the actual html file
        await writeFile(
          `built/${path.split("/")[1].split(".")[0]}.html`,
          renderedFile,
          "utf8"
        )
      ]);
    })
  ]);
})();
