import ejs = require("ejs");
import fs = require("fs");
import globstd = require("glob");
import util = require("util");
const glob = util.promisify(globstd);
const mkdir = util.promisify(fs.mkdir);
const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);

const viewsPath = "./views";
const viewDataPath = "./viewData";

(async function initialize() {
  const [indexPath, filePaths]: [string[], string[]] = await Promise.all([
    glob("index.ejs", { cwd: `${viewsPath}` }),
    glob("**/*.ejs", {
      cwd: `${viewsPath}`,
      ignore: ["partials/**/*.ejs", "index.ejs", "layout.ejs"]
    })
  ]).then(paths => paths);

  await mkdir("built/api/pages", { recursive: true });
  await mkdir("built/api/posts", { recursive: true });

  await Promise.all(
    filePaths.map(async path => {
      const partialHtml = await ejs
        .renderFile(`${viewsPath}/${path}`)
        .then(output => output);

      const pageModel = await readFile(
        `${viewDataPath}/${path.split(".")[0]}.json`,
        "utf8"
      ).then(model => JSON.parse(model));

      const renderedFile = await ejs
        .renderFile(
          `${viewsPath}/${indexPath[0]}`,
          {
            main: partialHtml,
            model: pageModel
          },
          { rmWhitespace: true }
        )
        .then(output => output);

      pageModel.partialHtml = partialHtml;

      //this is writing the original json file to include partial html to built
      await writeFile(
        `built/api/${path.split(".")[0]}.json`,
        JSON.stringify(pageModel),
        "utf8"
      );

      await writeFile(
        `built/${path.split("/")[1].split(".")[0]}.html`,
        renderedFile,
        "utf8"
      );
    })
  );
})();
