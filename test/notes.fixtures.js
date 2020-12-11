function makeNotesArray() {
  return [
    {
      id: 1,
      name: "Dogs",
      content: "Dogs Dogs Dogs Dogs Dogs Dogs Dogs Dogs Dogs Dogs Dogs Dogs ",
      date_modified: "2029-01-22T16:28:32.615Z",
      folder_id: 1,
    },
    {
      id: 2,
      name: "Cats",
      content:
        "Cats Cats Cats Cats Cats Cats Cats Cats Cats Cats Cats Cats Cats Cats Cats ",
      date_modified: "2029-02-22T16:28:32.615Z",
      folder_id: 1,
    },
    {
      id: 3,
      name: "Birds",
      content:
        "Birds Birds Birds Birds Birds Birds Birds Birds Birds Birds Birds ",
      date_modified: "2029-04-22T16:28:32.615Z",
      folder_id: 2,
    },
    {
      id: 4,
      name: "Beers",
      content:
        "Beers Beers Beers Beers Beers Beers Beers Beers Beers Beers Beers Beers Beers Beers ",
      date_modified: "2029-04-22T16:28:32.615Z",
      folder_id: 2,
    },
  ];
}

module.exports = {
  makeNotesArray,
};
