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
});
