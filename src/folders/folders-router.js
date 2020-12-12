const path = require("path");
const express = require("express");
const xss = require("xss");
const FoldersService = require("./folders-service");
const { json } = require("express");

const foldersRouter = express.Router();
const jsonParser = express.json();

//serialize
const serializeFolders = (folder) => ({
  id: folder.id,
  folder_name: xss(folder.folder_name), //sanitize
});

foldersRouter.route("/").get((req, res, next) => {
  FoldersService.getAllFolders(req.app.get("db"))
    .then((folders) => {
      res.status(200).json(folders.map(serializeFolders));
    })
    .catch(next);
});

module.exports = foldersRouter;
