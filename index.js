const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const { MongoClient, ServerApiVersion } = require("mongodb");

require("dotenv").config();

const app = express();

const port = process.env.PORT || 3000;

app.use(
  cors({
    origin: ["http://localhost:5173"],
    credentials: true,
  })
);
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

// login/get user

app.get("/user/:id", async (req, res) => {
  const query = { uid: req.params.id };
  const user = await userCol.findOne(query);
  res.send(user);
});

// signup call

app.post("/newuser", async (req, res) => {
  const newUser = req.body;
  console.log(`creating new user with data`, newUser);
  const result = await userCol.insertOne(newUser);
  res.send(result);
});

// google login handler

app.put("/googleuser", async (req, res) => {
  const filter = { uid: req.body.uid };
  const updatedUser = { $set: req.body };
  const options = { upsert: true };
  console.log(`new google login happens`);
  const result = await userCol.updateOne(filter, updatedUser, options);
  const user = await userCol.findOne(filter);
  res.send({ result, user });
});

// json web token handling

app.post("/jwt", async (req, res) => {
  const user = req.body;
  const token = jwt.sign(user, process.env.TOKEN_SECRET, { expiresIn: "5h" });
  const userData = await userCol.findOne(user);
  res
    .cookie(`b10a11token`, token, { httpOnly: true, secure: false })
    .send(userData);
});

app.post("/logout", (req, res) => {
  res.clearCookie(`b10a11token`, { httpOnly: true, secure: false }).send({success: true});
});

// blog calls

app.get("/blogs", async (req, res)=>{
  const cursor = blogCol.find();
  const result = await cursor.toArray();
  res.send(result);
})

app.post("/newblog", async (req, res) => {
  const newBlog = req.body;
  console.log(`adding new blog with data`, newBlog.title);
  const result = await blogCol.insertOne(newBlog);
  res.send(result);
});