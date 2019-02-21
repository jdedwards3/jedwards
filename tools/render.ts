import ejs = require("ejs");
import fs = require("fs");

ejs.renderFile("views/pages/index.ejs", function(err, partialHtml) {
  if (err) {
    throw err;
  }
  ejs.renderFile(
    "views/index.ejs",
    { main: partialHtml },
    { rmWhitespace: true },
    function(err, html) {
      if (err) {
        throw err;
      }

      fs.mkdir("built/", { recursive: true }, function(err) {
        if (err) {
          throw err;
        }

        fs.writeFile("built/index.html", html, "utf8", function(err) {
          if (err) {
            throw err;
          }
        });
      });
    }
  );
});
