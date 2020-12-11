const path = require("path");
const express = require("express");
const xss = require("xss");
const NotesService = require("./notes-service");
const { json } = require("express");

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
  })
  .post(jsonParser, (req, res, next) => {
    const { name, content, folder_id } = req.body;
    const newNote = { name, content, folder_id };

    for (const [key, value] of Object.entries(newNote)) {
      if (value == null) {
        return res.status(400).json({
          error: { message: `Missing '${key}' in request body` },
        });
      }
    }
    NotesService.insertNote(req.app.get("db"), newNote)
      .then((note) => {
        res
          .status(201)
          .location(`/api/notes/${note.id}`)
          .json(serializeNote(note));
      })
      .catch(next);
  });

notesRouter
  .route("/:id")
  .all((req, res, next) => {
    NotesService.getById(req.app.get("db"), req.params.id)
      .then((note) => {
        if (!note) {
          return res.status(404).json({
            error: { message: `Note not found` },
          });
        }
        res.note = note;
        next();
      })
      .catch(next);
  })
  .get((req, res, next) => {
    res.json(serializeNote(res.note));
  })
  .delete((req, res, next) => {
    NotesService.removeNote(req.app.get("db"), req.params.id)
      .then(() => {
        res.status(204).end();
      })
      .catch(next);
  })
  .patch(jsonParser, (req, res, next) => {
    const { name, content, folder_id } = req.body;
    const noteToUpdate = { name, content, folder_id };

    const numberOfValues = Object.values(noteToUpdate).filter(Boolean).length;
    if (numberOfValues === 0) {
      return res.status(400).json({
        error: {
          message: `Request must contain a valid datatype either name, content, or folder_id`,
        },
      });
    }

    NotesService.editNote(req.app.get("db"), req.params.id, noteToUpdate)
      .then((numRowsAffected) => {
        return res.status(204).end();
      })
      .catch(next);
  });

module.exports = notesRouter;
