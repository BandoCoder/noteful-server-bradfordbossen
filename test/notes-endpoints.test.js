const { expect } = require("chai");
const knex = require("knex");
const supertest = require("supertest");
const app = require("../src/app");

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
  after("Disconnect", () => db.destroy());
  before("clean the table", () =>
    db.raw("TRUNCATE noteful_notes, noteful_folders RESTART IDENTITY CASCADE")
  );
  afterEach("Cleanup", () => {
    db.raw("TRUNCATE noteful_notes, noteful_folders RESTART IDENTITY CASCADE");
  });

  //ENDPOINT TESTS
  describe("GET api/notes", () => {
    context(`Given no articles`, () => {
      it(`responsae with 200 and an empty list`, () => {
        return supertest(app).get("/api/notes").expect(200, []);
      });
    });
  });
});
