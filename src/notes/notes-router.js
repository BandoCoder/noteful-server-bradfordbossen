const path = require("path");
const express = require("express");
const xss = require("xss");
const NotesService = require("./notes-service");

const notesRouter = express.Router();
const jsonParser = express.json();

//serialize
const serializeNote = (note) => ({
  id: note.id,
  name: xss(note.name), //sanitize
  content: xss(note.content), //sanitize
  date_modified: note.date_modified,
  folder_id: note.folder_id,
});

notesRouter // Notes endpoint
  .route("/")
  .get((req, res, next) => {
    NotesService.getAllNotes(req.app.get("db"))
      .then((notes) => {
        res.status(200).json(notes.map(serializeNote));
      })
      .catch(next);
  });

module.exports = notesRouter;
