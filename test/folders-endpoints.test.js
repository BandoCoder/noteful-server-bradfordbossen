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
      const testFolders = makeFoldersArray();
      beforeEach("insert notes", () => {
        return db.into("noteful_folders").insert(testFolders);
      });
      it("responds with 200 and all of the articles", () => {
        return supertest(app).get("/api/folders").expect(200, testFolders);
      });
    });
    context(`Given XSS attack folder`, () => {
      const maliciousFolders = [
        {
          id: 2,
          folder_name:
            'Naughty naughty very naughty <script>alert("xss");</script>',
        },
        {
          id: 1,
          folder_name: `Bad image <img src="https://url.to.file.which/does-not.exist" onerror="alert(document.cookie);">. But not <strong>all</strong> bad.`,
        },
      ];
      beforeEach("Insert Malicious Folders", () => {
        return db.into("noteful_folders").insert(maliciousFolders);
      });
      it("removes XSS attack", () => {
        return supertest(app)
          .get(`/api/folders`)
          .expect(200)
          .expect((res) => {
            expect(res.body[0].folder_name).to.eql(
              xss(maliciousFolders[0].folder_name)
            );
            expect(res.body[1].folder_name).to.eql(
              xss(maliciousFolders[1].folder_name)
            );
          });
      });
    });
  });
  describe(`GET /api/folders/:id`, () => {
    context(`Given no folders`, () => {
      it(`responds with 404`, () => {
        const id = 12345987;
        return supertest(app)
          .get(`/api/folders/${id}`)
          .expect(404, { error: { message: `Folder not found` } });
      });
    });
    context(`Given folders in the database`, () => {
      const testFolders = makeFoldersArray();
      beforeEach("insert folders", () => {
        return db.into("noteful_folders").insert(testFolders);
      });
      it("Responds 200 and specific folder", () => {
        const id = 2;
        const expectedFolder = testFolders[id - 1];
        return supertest(app)
          .get(`/api/folders/${id}`)
          .expect(200, expectedFolder);
      });
    });
    context(`Given XSS attack folders`, () => {
      const maliciousFolder = {
        id: 2,
        folder_name: `Bad image <img src="https://url.to.file.which/does-not.exist" onerror="alert(document.cookie);">. But not <strong>all</strong> bad.`,
      };

      beforeEach("Insert Malicious Folder", () => {
        return db.into("noteful_folders").insert([maliciousFolder]);
      });
      it("removes XSS attack", () => {
        return supertest(app)
          .get(`/api/folders/${maliciousFolder.id}`)
          .expect(200)
          .expect((res) => {
            expect(res.body.folder_name).to.eql(
              xss(maliciousFolder.folder_name)
            );
          });
      });
    });
  });
  describe(`POST /api/folders`, () => {
    it(`Creates folder, responds with 201 and new folder`, () => {
      const newFolder = {
        folder_name: "Big ole jackass",
      };
      return supertest(app)
        .post("/api/folders")
        .send(newFolder)
        .expect((res) => {
          expect(res.body.folder_name).to.eql(newFolder.folder_name);
          expect(res.body).to.have.property("id");
        });
    });
    it(`reponds 400 and error when folder is not named`, () => {
      const newFolder = {
        folder_name: "",
      };
      return supertest(app)
        .post(`/api/folders`)
        .send(newFolder)
        .expect(400, {
          error: { message: `Missing folder_name in request body` },
        });
    });
    it("removes XSS attack", () => {
      const maliciousFolder = {
        folder_name: `'Naughty naughty very naughty <script>alert("xss");</script>'`,
      };
      return supertest(app)
        .post(`/api/folders`)
        .send(maliciousFolder)
        .expect(201)
        .expect((res) => {
          expect(res.body.folder_name).to.eql(xss(maliciousFolder.folder_name));
        });
    });
  });
  describe(`DELETE /api/folders/:id`, () => {
    context(`Given no folders`, () => {
      it(`responds with 404`, () => {
        const id = 5555;
        return supertest(app)
          .delete(`/api/folders/${id}`)
          .expect(404, { error: { message: "Folder not found" } });
      });
    });
    context(`Given folders are inside the database`, () => {
      const testFolders = makeFoldersArray();
      beforeEach("insert folders", () => {
        return db.into("noteful_folders").insert(testFolders);
      });
      it(`responds with 204 and removes folder`, () => {
        const idToRemove = 1;
        const expectedFolders = testFolders.filter((folder) => {
          return folder.id !== idToRemove;
        });
        return supertest(app)
          .delete(`/api/folders/${idToRemove}`)
          .expect(204)
          .then((res) => {
            return supertest(app).get(`/api/folders`).expect(expectedFolders);
          });
      });
    });
  });
  describe(`PATCH /api/folders/:id`, () => {
    context(`Given no folders`, () => {
      it(`responds with 404`, () => {
        const id = 123456;
        return supertest(app)
          .delete(`/api/folders/${id}`)
          .expect(404, { error: { message: `Folder not found` } });
      });
    });

    context(`Given folders exist within database`, () => {
      const testFolders = makeFoldersArray();
      beforeEach("insert folders", () => {
        return db.into("noteful_folders").insert(testFolders);
      });
      it(`responds with 204 and updates the note`, () => {
        const idToUpdate = 2;
        const updateFolder = {
          folder_name: "updated",
        };
        const expectedFolder = {
          ...testFolders[idToUpdate - 1],
          ...updateFolder,
        };
        return supertest(app)
          .patch(`/api/folders/${idToUpdate}`)
          .send(updateFolder)
          .expect(204)
          .then((res) => {
            return supertest(app)
              .get(`/api/folders/${idToUpdate}`)
              .expect(expectedFolder);
          });
      });
      it(`responds with 400 when no required fields supplied`, () => {
        const idToUpdate = 2;
        return supertest(app)
          .patch(`/api/folders/${idToUpdate}`)
          .send({ beware: "oblivion is at hand" })
          .expect(400, {
            error: {
              message: `Request must contain a valid datatype`,
            },
          });
      });
    });
  });
});
