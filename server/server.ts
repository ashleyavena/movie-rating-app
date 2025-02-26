import 'dotenv/config';
import pg from 'pg';
import express from 'express';
import { ClientError, errorMiddleware } from './lib/index.js';

type Movie = {
    movieId: number;
    title: string;
    summary: string;
    imdbLink: string;
    createdAt: string;
    updatedAt: string;
  };

const db = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

const app = express();
app.use(express.json());


app.get('/api/test', async (req, res) => {
  res.send('Hello, world!');
});

app.get("/api/movies", async (req, res, next) => {
    try {
      const sql = `
        select *
          from "movies"
          order by "movieId";
      `;
      const result = await db.query<Movie>(sql);
      res.json(result.rows);
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/movies", async (req, res, next) => {
    try {
      const { title, summary, imdbLink, rating } = req.body;
      if (!title || !summary || !imdbLink || !rating) {
        throw new ClientError(
          400,
          "title, summary, imblink, and rating are required"
        );
      }
      if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        throw new ClientError(400, "rating must be an integer 1 to 5");
      }
      const sql = `
        insert into "movies" ("title", "summary", "imblink", "rating")
        values ($1, $2, $3, $4)
          returning *;
      `;
      const params = [title, summary, imdbLink, rating];
      const result = await db.query<Movie>(sql, params);
      const [movie] = result.rows;
      res.status(201).json(movie);
    } catch (err) {
      next(err);
    }
  });

  app.put("/api/movies/:movieId", async (req, res, next) => {
    try {
      const movieId = Number(req.params.movieId);
      if (!Number.isInteger(movieId) || movieId < 1) {
        throw new ClientError(400, "movieId must be a positive integer");
      }
      const { title, summary, imdbLink, rating } = req.body;
      if (!title || !summary || !imdbLink || !rating) {
        throw new ClientError(
          400,
          "title, summary, imdbLink, and rating are required"
        );
      }
      if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        throw new ClientError(400, "rating must be an integer 1 to 5");
      }
      const sql = `
        update "movies"
          set "updatedAt" = now(),
              "title" = $1,
              "summary" = $2,
              "imdbLink" = $3,
              "rating" = $4
          where "movieId" = $5
          returning *;
      `;
      const params = [title, summary, imdbLink, rating, movieId];
      const result = await db.query<Movie>(sql, params);
      const [movie] = result.rows;
      if (!movie) {
        throw new ClientError(404, `cannot find movie with movieId ${movieId}`);
      }
      res.json(movie);
    } catch (err) {
      next(err);
    }
  }); 

  app.delete("/api/movies/:movieId", async (req, res, next) => {
    try {
      const { movieId } = req.params;
      if (!Number.isInteger(+movieId)) {
        throw new ClientError(400, "movieId needs to be a number");
      }
      const sql = `
        delete from "movies"
        where "movieId" = $1
        returning *;
      `;
      const params = [movieId];
      const result = await db.query(sql, params);
      const deletedMovie = result.rows[0];
      if (!deletedMovie) {
        throw new ClientError(404, "Movie not found");
      }
      res.status(204).json(deletedMovie);
    } catch (err) {
      next(err);
    }
  });

//   app.post("api/auth/sign-in", async (req,res,next)=>{
//     try{
// const {username, password}= req.body;
// if (!username || !password){
//     throw new ClientError(400, "username and password are required")
//     const sql=`
//     select * from "users" where "username" =$1`;
//     const params= [username]
//     const result = await db.query(sql, params);
//     const user= result.rows[0]
//     if(!user){
//         throw new ClientError(401, "username or password invalid")
//     }
//     const payload= {userId: user.userId, username: markAsUntransferable}
// }
//     }catch(error){

//     }
// })


app.use(errorMiddleware);

app.listen(process.env.PORT, () => {
  console.log(`express server listening on port ${process.env.PORT}`);
});