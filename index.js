const sqlite = require("sqlite"),
  Sequelize = require("sequelize"),
  request = require("request"),
  express = require("express"),
  moment = require("moment"),
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
  // find the film from the id in the params in the route
  Film.findById(req.params.id, {})
    .then(film => {
      // use moment.js to calculate range of years +/- 15 years
      const releaseDate = moment(film.release_date);
      const startDate = releaseDate.subtract("years", 15).format("YYYY-MM-DD");
      const endDate = releaseDate.add("years", 15).format("YYYY-MM-DD");

      // Find all the films with The same genre as the parent film and
      // Been released within 15 years, before or after the parent film
      // A sort order based on film id (order by film id)
      Film.findAll({
        where: {
          genre_id: film.genre_id,
          release_date: {
            $between: [startDate, endDate]
          }
        },
        order: ["id"]
      })
        .then(function(films) {
          // map the film ids to create the ids string to use in the API call
          const film_ids = films.map(film => {
            return film.id;
          });

          const film_ids_api = film_ids.join(",");

          // call the reviews API with the ids
          request(`${API}?films=${film_ids_api}`, (err, response, body) => {
            const reviewsJSON = JSON.parse(body);
            console.log(JSON.parse(body));

            // A minimum of 5 reviews
            const reviewsOverFive = reviewsJSON.filter(review => {
              return review.reviews.length >= 5;
            });

            res.json({
              recommendations: reviewsOverFive
            });


            // An average rating greater than 4.0
          });
        })

        .catch(error => {
          console.log(error);
        });
    })
    .catch(error => {
      console.log("film error: ", error);
    });
}
// handles missing routes
app.get("*", (req, res) => {
  res.status(404).json({
    message: '"message" key missing'
  });
});
module.exports = app;
