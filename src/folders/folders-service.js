const FoldersService = {
  getAllFolders(knex) {
    return knex.select("*").from("noteful_folders");
  },
  insertFolder(knex, newNote) {
    return knex
      .insert(newNote)
      .into("noteful_folders")
      .returning("*")
      .then((rows) => {
        return rows[0];
      });
  },
  getById(knex, id) {
    return knex.from("noteful_folders").select("*").where("id", id).first();
  },
  removeFolder(knex, id) {
    return knex("noteful_folders").where({ id }).delete();
  },
  editFolder(knex, id, newNoteInfo) {
    return knex("noteful_folders").where({ id }).update(newNoteInfo);
  },
};

module.exports = FoldersService;
