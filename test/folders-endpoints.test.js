const { expect } = require("chai");
const knex = require("knex");
const supertest = require("supertest");
const xss = require("xss");
const app = require("../src/app");
const { makeNotesArray } = require("./notes.fixtures.js");
const { makeFoldersArray } = require("./folders.fixtures.js");

describe(`Folders endpoints`, () => {
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

  //ENDPOINTS
  describe(`GET api/folders`, () => {
    context(`Given no folders`, () => {
      it(`responds with 200 and an empty list`, () => {
        return supertest(app).get("/api/folders").expect(200, []);
      });
    });
    context(`Given folders in the database`, () => {
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
        return supertest(app).get("/api/folders").expect(200, testFolders);
      });
    });
  });
});
