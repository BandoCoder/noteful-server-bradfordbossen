const { expect } = require("chai");
const knex = require("knex");
const supertest = require("supertest");
const xss = require("xss");
const app = require("../src/app");
const { makeNotesArray } = require("./notes.fixtures.js");
const { makeFoldersArray } = require("./folders.fixtures.js");

describe("Noteful Endpoints", function () {
  // SETUP TESTS
  let db;

  before("make knex instance", () => {
    db = knex({
      client: "pg",
      connection: process.env.TEST_DB_URL,
    });
    app.set("db", db);
  });

  after("disconnect from db", () => db.destroy());

  before("clean the table", () =>
    db.raw("TRUNCATE noteful_folders, noteful_notes RESTART IDENTITY CASCADE")
  );

  afterEach("cleanup", () =>
    db.raw("TRUNCATE noteful_folders, noteful_notes RESTART IDENTITY CASCADE")
  );

  //ENDPOINT TESTS
  describe("GET api/notes", () => {
    context(`Given no notes`, () => {
      it(`responsae with 200 and an empty list`, () => {
        return supertest(app).get("/api/notes").expect(200, []);
      });
    });
    context(`Given notes in the database`, () => {
      const testNotes = makeNotesArray();
      const testFolders = makeFoldersArray();
      beforeEach("insert notes", () => {
        return db
          .into("noteful_folders")
          .insert(testFolders)
          .then(() => {
            return db.into("noteful_notes").insert(testNotes);
          });
      });
      it("responds with 200 and all of the articles", () => {
        return supertest(app).get("/api/notes").expect(200, testNotes);
      });
    });
    context(`Given XSS attack note`, () => {
      const testFolders = makeFoldersArray();
      const maliciousNote = {
        id: 1,
        name: 'Naughty naughty very naughty <script>alert("xss");</script>',
        content: `Bad image <img src="https://url.to.file.which/does-not.exist" onerror="alert(document.cookie);">. But not <strong>all</strong> bad.`,
        date_modified: "2029-02-22T16:28:32.615Z",
        folder_id: 1,
      };
      beforeEach("Insert Malicious Note", () => {
        return db
          .into("noteful_folders")
          .insert(testFolders)
          .then(() => {
            return db.into("noteful_notes").insert([maliciousNote]);
          });
      });
      it("removes XSS attack", () => {
        return supertest(app)
          .get(`/api/notes`)
          .expect(200)
          .expect((res) => {
            expect(res.body[0].name).to.eql(xss(maliciousNote.name));
            expect(res.body[0].content).to.eql(xss(maliciousNote.content));
          });
      });
    });
  });

  describe(`GET /api/notes/:id`, () => {
    context(`given no notes`, () => {
      it(`responds with 404`, () => {
        const id = 111111111;
        return supertest(app)
          .get(`/api/notes/${id}`)
          .expect(404, { error: { message: `Note not found` } });
      });
    });
    context(`Given notes in the database`, () => {
      const testFolders = makeFoldersArray();
      const testNotes = makeNotesArray();
      beforeEach("insert notes", () => {
        return db
          .into("noteful_folders")
          .insert(testFolders)
          .then(() => {
            return db.into("noteful_notes").insert(testNotes);
          });
      });
      it("responds 200 and specific note", () => {
        const id = 2;
        const expectedNote = testNotes[id - 1];
        return supertest(app).get(`/api/notes/${id}`).expect(200, expectedNote);
      });
    });

    context(`Given an xss attack note`, () => {
      const testFolders = makeFoldersArray();
      const maliciousNote = {
        id: 911,
        name: 'Naughty naughty very naughty <script>alert("xss");</script>',
        content: `Bad image <img src="https://url.to.file.which/does-not.exist" onerror="alert(document.cookie);">. But not <strong>all</strong> bad.`,
        date_modified: "2029-02-22T16:28:32.615Z",
        folder_id: 1,
      };
      beforeEach("Insert Malicious Note", () => {
        return db
          .into("noteful_folders")
          .insert(testFolders)
          .then(() => {
            return db.into("noteful_notes").insert([maliciousNote]);
          });
      });
      it("removes XSS attack content", () => {
        return supertest(app)
          .get(`/api/notes/${maliciousNote.id}`)
          .expect(200)
          .expect((res) => {
            expect(res.body.name).to.eql(xss(maliciousNote.name));
            expect(res.body.content).to.eql(xss(maliciousNote.content));
          });
      });
    });
  });
  describe(`POST /api/notes`, () => {
    const testFolders = makeFoldersArray();
    beforeEach("insert folders", () => {
      return db.into("noteful_folders").insert(testFolders);
    });

    it(`Creates note, responds with 201 and new note`, () => {
      const newNote = {
        name: "Figs",
        content: "Figs Figs Figs Figs Figs Figs Figs Figs Figs ",
        folder_id: 1,
      };
      return supertest(app)
        .post("/api/notes")
        .send(newNote)
        .expect(201)
        .expect((res) => {
          expect(res.body.name).to.eql(newNote.name);
          expect(res.body.content).to.eql(newNote.content);
          expect(res.body.folder_id).to.eql(newNote.folder_id);
          expect(res.body).to.have.property("id");
          expect(res.headers.location).to.eql(`/api/notes/${res.body.id}`);
          const expected = new Intl.DateTimeFormat("en-US").format(new Date());
          const actual = new Intl.DateTimeFormat("en-US").format(
            new Date(res.body.date_modified)
          );
          expect(actual).to.eql(expected);
        })
        .then((res) =>
          supertest(app).get(`/api/notes/${res.body.id}`).expect(res.body)
        );
    });
    const requiredFields = ["name", "content", "folder_id"];
    requiredFields.forEach((field) => {
      const newNote = {
        name: "Figs",
        content: "Figs Figs Figs Figs Figs Figs Figs Figs Figs ",
        folder_id: 1,
      };

      it(`responds with 400 and error when the '${field}' is missing`, () => {
        delete newNote[field];
        return supertest(app)
          .post("/api/notes")
          .send(newNote)
          .expect(400, {
            error: { message: `Missing '${field}' in request body` },
          });
      });
    });
    it("removes XSS attack content from response", () => {
      const maliciousNote = {
        id: 911,
        name: 'Naughty naughty very naughty <script>alert("xss");</script>',
        content: `Bad image <img src="https://url.to.file.which/does-not.exist" onerror="alert(document.cookie);">. But not <strong>all</strong> bad.`,
        date_modified: "2029-02-22T16:28:32.615Z",
        folder_id: 1,
      };
      return supertest(app)
        .post(`/api/notes`)
        .send(maliciousNote)
        .expect(201)
        .expect((res) => {
          expect(res.body.name).to.eql(xss(maliciousNote.name));
          expect(res.body.content).to.eql(xss(maliciousNote.content));
        });
    });
  });
  describe(`DELETE /api/notes/:id`, () => {
    context(`Given no notes`, () => {
      it(`responds with 404`, () => {
        const id = 5555;
        return supertest(app)
          .delete(`/api/notes/${id}`)
          .expect(404, { error: { message: "Note not found" } });
      });
    });
    context(`Given notes are inside the database`, () => {
      const testFolders = makeFoldersArray();
      const testNotes = makeNotesArray();
      beforeEach("insert notes", () => {
        return db
          .into("noteful_folders")
          .insert(testFolders)
          .then(() => {
            return db.into("noteful_notes").insert(testNotes);
          });
      });
      it(`responds with 204 and removes note`, () => {
        const idToRemove = 1;
        const expectedNotes = testNotes.filter((note) => {
          return note.id !== idToRemove;
        });
        return supertest(app)
          .delete(`/api/notes/${idToRemove}`)
          .expect(204)
          .then((res) => {
            return supertest(app).get(`/api/notes`).expect(expectedNotes);
          });
      });
    });
  });
  describe(`PATCH /api/notes/:id`, () => {
    context(`Given no notes`, () => {
      it(`responds with 404`, () => {
        const id = 123456;
        return supertest(app)
          .delete(`/api/notes/${id}`)
          .expect(404, { error: { message: `Note not found` } });
      });
    });

    context(`Given notes exist within database`, () => {
      const testFolders = makeFoldersArray();
      const testNotes = makeNotesArray();
      beforeEach("insert notes", () => {
        return db
          .into("noteful_folders")
          .insert(testFolders)
          .then(() => {
            return db.into("noteful_notes").insert(testNotes);
          });
      });
      it(`responds with 204 and updates the note`, () => {
        const idToUpdate = 3;
        const updateNote = {
          name: "updated",
          content: "content updated",
          folder_id: 2,
        };
        const expectedNote = {
          ...testNotes[idToUpdate - 1],
          ...updateNote,
        };
        return supertest(app)
          .patch(`/api/notes/${idToUpdate}`)
          .send(updateNote)
          .expect(204)
          .then((res) => {
            return supertest(app)
              .get(`/api/notes/${idToUpdate}`)
              .expect(expectedNote);
          });
      });
      it(`responds with 400 when no required fields supplied`, () => {
        const idToUpdate = 2;
        return supertest(app)
          .patch(`/api/notes/${idToUpdate}`)
          .send({ beware: "oblivion is at hand" })
          .expect(400, {
            error: {
              message: `Request must contain a valid datatype either name, content, or folder_id`,
            },
          });
      });
      it(`responds with 204 when updating only a subset of fields`, () => {
        const idToUpdate = 3;
        const updateNote = {
          content: "WAKA WAKA",
        };
        const expectedNote = {
          ...testNotes[idToUpdate - 1],
          ...updateNote,
        };
        return supertest(app)
          .patch(`/api/notes/${idToUpdate}`)
          .send({
            ...updateNote,
            fieldToIgnore: "shold not be in GET response",
          })
          .expect(204)
          .then((res) =>
            supertest(app).get(`/api/notes/${idToUpdate}`).expect(expectedNote)
          );
      });
    });
  });
});
