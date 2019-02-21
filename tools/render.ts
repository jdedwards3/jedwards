import ejs = require("ejs");
import fs = require("fs");

ejs.renderFile("views/index.ejs", function(err, html) {
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
});
