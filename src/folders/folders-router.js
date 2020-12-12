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

foldersRouter
  .route("/")
  .get((req, res, next) => {
    FoldersService.getAllFolders(req.app.get("db"))
      .then((folders) => {
        res.status(200).json(folders.map(serializeFolders));
      })
      .catch(next);
  })
  .post(jsonParser, (req, res, next) => {
    const { folder_name } = req.body;
    const newFolder = { folder_name };

    if (folder_name === "") {
      return res.status(400).json({
        error: { message: `Missing folder_name in request body` },
      });
    }
    FoldersService.insertFolder(req.app.get("db"), newFolder)
      .then((folder) => {
        res
          .status(201)
          .location(`/api/folders/${folder.id}`)
          .json(serializeFolders(folder));
      })
      .catch(next);
  });

foldersRouter
  .route("/:id")
  .all((req, res, next) => {
    FoldersService.getById(req.app.get("db"), req.params.id)
      .then((folder) => {
        if (!folder) {
          return res.status(404).json({
            error: { message: `Folder not found` },
          });
        }
        res.folder = folder;
        next();
      })
      .catch(next);
  })
  .get((req, res, next) => {
    return res.json(serializeFolders(res.folder));
  })
  .delete((req, res, next) => {
    FoldersService.removeFolder(req.app.get("db"), req.params.id)
      .then(() => {
        res.status(204).end();
      })
      .catch(next);
  })
  .patch(jsonParser, (req, res, next) => {
    const { folder_name } = req.body;
    const folderToUpdate = { folder_name };
    const numberOfValues = Object.values(folderToUpdate).filter(Boolean).length;
    if (numberOfValues === 0) {
      return res.status(400).json({
        error: {
          message: `Request must contain a valid datatype`,
        },
      });
    }
    FoldersService.editFolder(req.app.get("db"), req.params.id, folderToUpdate)
      .then(() => {
        return res.status(204).end();
      })
      .catch(next);
  });

module.exports = foldersRouter;
