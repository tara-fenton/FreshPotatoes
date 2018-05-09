const sqlite = require("sqlite"),
  Sequelize = require("sequelize"),
  request = require("request"),
  express = require("express"),
  app = express();

const {
  PORT = 3000,
  NODE_ENV = "development",
  DB_PATH = "./db/database.db"
} = process.env;
const API =
  "http://credentials-api.generalassemb.ly/4576f55f-c427-4cfc-a11c-5bfe914ca6c1";

// START SERVER
Promise.resolve()
  .then(() =>
    app.listen(PORT, () => console.log(`App listening on port ${PORT}`))
  )
  .catch(err => {
    if (NODE_ENV === "development") console.error(err.stack);
  });

const sequelize = new Sequelize("database", "username", "password", {
  host: "host",
  dialect: "sqlite",
  storage: DB_PATH,
  define: {
    timestamps: false
  }
});

sequelize
  .authenticate()
  .then(() => {
    console.log("Connection established successfully");
  })
  .catch(err => {
    console.error("Unable to connect to the database:", err);
  });

const Genre = sequelize.define("genres", {
  name: {
    type: Sequelize.STRING
  }
});
const Film = sequelize.define("films", {
  title: {
    type: Sequelize.STRING
  },
  release_date: {
    type: Sequelize.DATE
  },
  tagline: {
    type: Sequelize.STRING
  },
  budget: {
    type: Sequelize.BIGINT
  },
  runtime: {
    type: Sequelize.BIGINT
  },
  original_language: {
    type: Sequelize.STRING
  },
  status: {
    type: Sequelize.STRING
  },
  genre_id: {
    type: Sequelize.INTEGER
  }
});

// ROUTES
app.get("/films/:id/recommendations", getFilmRecommendations);

// ROUTE HANDLER
function getFilmRecommendations(req, res) {
  // WORKS
  // sequelize
  // .query('SELECT * FROM genres', { type: Sequelize.QueryTypes.SELECT })
  // .then(genre => {
  //   res.json(genre);
  // });

  Film.findById("10306", {})
    .then(genre => {
      console.log(genre.title);
      //res.send(genre);
    })
    .catch(error => {
      console.log(error);
    });
  Genre.findById("2", {})
    .then(genre => {
      console.log(genre.name);
      res.send(genre);
    })
    .catch(error => {
      console.log(error);
    });
}
// handles missing routes
app.get("*", (req, res) => {
  res.status(404).json({
    message: '"message" key missing'
  });
});
module.exports = app;
