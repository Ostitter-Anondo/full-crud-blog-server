const express = require("express");
const cors = require("cors");

require("dotenv").config();

const app = express();

const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// mongo setup

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.aye3q.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const database = client.db("blogSite");

const userCol = database.collection("users");
const blogCol = database.collection("blogs");
const commentCol = database.collection("comments");

// general landing

app.get("/", (req, res) => {
  res.send(
    `all your blogses are belong to us. mongodb server is currently functional.`
  );
});

app.listen(port, () => {
  console.log(`we having stuffs happun at ${port}`);
});

// mongodb stuff
