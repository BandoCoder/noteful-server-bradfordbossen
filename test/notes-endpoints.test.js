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

  before("clean the table", () =>
    db.raw("TRUNCATE noteful_folders, noteful_notes RESTART IDENTITY CASCADE")
  );

  afterEach("cleanup", () =>
    db.raw("TRUNCATE noteful_folders, noteful_notes RESTART IDENTITY CASCADE")
  );

  after("disconnect from db", () => db.destroy());

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
        supertest(app).get("/api/notes").expect(200, testNotes);
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
      it("responds 200 and specific article", () => {
        const id = 2;
        const expectedNote = testNotes[id - 1];
        return supertest(app).get(`/api/notes/${id}`).expect(200, expectedNote);
      });
    });
  });
});
