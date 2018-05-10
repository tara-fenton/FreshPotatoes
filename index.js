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
  let limit = 0,
    offset = 0;
  // find the film from the id in the params in the route
  Film.findById(req.params.id, {})
    .then(film => {
      // use moment.js to calculate range of years +/- 15 years
      let releaseDate = moment(film.release_date);
      console.log('releaseDate ',releaseDate);
      const startDate = releaseDate.subtract("years", 15).format("YYYY-MM-DD");
      releaseDate = moment(film.release_date);
      const endDate = releaseDate.add("years", 15).format("YYYY-MM-DD");
      console.log('startDate ',startDate);
      console.log('endDate ',endDate);

      // find the genre name for the recommended films
      Genre.findById(film.genre_id).then(genre => {

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

            // A minimum of 5 reviews
            const reviewsOverFive = reviewsJSON.filter(review => {
              return review.reviews.length >= 5;
            });
            // console.log(reviewsOverFive);
            // An average rating greater than 4.0
            const reviewsAverage = reviewsOverFive.map(review => {
              // get the total of the review ratings
              const total = review.reviews.reduce((sum, val) => {
                return sum + val.rating;
              }, 0);
              // get the average from the the total ratings
              const averageRating = total / review.reviews.length;
              // set it to the review
              review.average_rating = averageRating;

              return review;
            });
            // console.log(reviewsAverage);
            // An average rating greater than 4.0
            const reviewesOverFourAverage = reviewsAverage.filter(review => {
              return review.average_rating > 4;
            });

            // map the ids to use in the recommendations
            const reviewIds = reviewesOverFourAverage.map(film => {
              return film.film_id;
            });

            Film.all({
              attributes: ["id", "title", "release_date"],
              where: { id: { in: reviewIds } },
              order: ["id"]
            }).then(recommendedFilms => {
              const finalRecommendedFilms = recommendedFilms.map(film => {
                const matchedFilm = reviewesOverFourAverage.filter(element => {
                  // console.log('element', element);
                  // console.log('film', film);
                  return (element.film_id = film.id);
                });

                // console.log('matchedFilm', matchedFilm[0]);

                return {
                  id: matchedFilm[0].film_id,
                  title: film.title,
                  releaseDate: film.release_date,
                  genre: genre.name,
                  averageRating: matchedFilm[0].average_rating,
                  reviews: matchedFilm[0].reviews.length
                };
              });

              res.json({
                recommendations: finalRecommendedFilms,
                meta: {
                  limit: limit,
                  offset: offset
                }
              });
            });
          });
        })

        .catch(error => {
          console.log(error);
        });
      })
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
