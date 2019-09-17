production build status (click to see automated builds): [![Build Status](https://dev.azure.com/jamesdedwards3/jamesdedwards3/_apis/build/status/jamesdedwards3-CI?branchName=master)](https://dev.azure.com/jamesdedwards3/jamesdedwards3/_build/latest?definitionId=1&branchName=master)

Welcome! This is my personal website/blog. I hope you will find something of interest.

This site is built with the [JAMstack](https://jamstack.org/) and [TypeScript](https://www.typescriptlang.org/).

In the tools folder you will see the main file which does the rendering of [EJS](https://ejs.co/) templates into HTML with Node.js.

In the functions folder are [Azure Functions](https://azure.microsoft.com/en-us/services/functions/) which are used as a RESTful API to submit and query user generated
comments from [Azure Table Storage](https://azure.microsoft.com/en-us/services/storage/tables/).

If you click the build status link above you can see the build pipelines that are triggered on pushes to the master and dev branches.

These build pipelines automatically rerender the page templates and deploy newly generated files as well as deploy any updates made to the serverless functions.

All of the files are uploaded to [Azure Blob Storage](https://azure.microsoft.com/en-us/services/storage/blobs/), and served from [Azure CDN](https://azure.microsoft.com/en-us/services/cdn/).
