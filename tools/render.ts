import ejs = require("ejs");
import fs = require("fs");
import globstd = require("glob");
import util = require("util");
const glob = util.promisify(globstd);
const mkdir = util.promisify(fs.mkdir);
const writeFile = util.promisify(fs.writeFile);

const viewsPath = "./views";

(async function initialize() {
  const [indexPath, filePaths]: [string[], string[]] = await Promise.all([
    glob("index.ejs", { cwd: `${viewsPath}` }),
    glob("**/*.ejs", {
      cwd: `${viewsPath}`,
      ignore: ["partials/**/*.ejs", "index.ejs", "layout.ejs"]
    })
  ]).then(paths => paths);

  await mkdir("built/", { recursive: true });

  await Promise.all(
    filePaths.map(async path => {
      const partialHtml = await ejs
        .renderFile(`${viewsPath}/${path}`)
        .then(output => output);

      const renderedFile = await ejs
        .renderFile(
          `${viewsPath}/${indexPath[0]}`,
          { main: partialHtml },
          { rmWhitespace: true }
        )
        .then(output => output);

      await writeFile(
        `built/${path.split("/")[1].split(".")[0]}.html`,
        renderedFile,
        "utf8"
      );
    })
  );
})();
