const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

require("dotenv").config();

const app = express();

const port = process.env.PORT || 3000;

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://b10a11-ostitter-anondo.web.app",
      "https://b10a11-ostitter-anondo.firebaseapp.com",
    ],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

const verifyToken = (req, res, next) => {
  const token = req.cookies.b10a11token;
  if (!token) {
    return res.status(401).send({ message: "unauthorized access" });
  }
  jwt.verify(token, process.env.TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "unauthorized access" });
    }
    req.user = decoded;
    next();
  });
};

// mongo setup

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.aye3q.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: false,
    deprecationErrors: true,
  },
});

const database = client.db("blogSite");

const userCol = database.collection("users");
const wishlistCol = database.collection("wishlist");
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
  const wishlist = await wishlistCol.findOne(query);
  res.send({ user, wishlist });
});

// signup call

app.post("/newuser", async (req, res) => {
  const newWishlist = { uid: req.body.uid, wishlist: [] };
  const wishlistData = await wishlistCol.insertOne(newWishlist);
  const newUser = {
    uid: req.body.uid,
    email: req.body.email,
    name: req.body.name,
    photo: req.body.photo,
    wishlistId: wishlistData.insertedId,
  };
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
  const wishlist = await wishlistCol.findOne(filter);
  res.send({ result, user, wishlist });
});

// update user name/photo

app.put("/updatedata/:id", async (req, res) => {
  const filter = { uid: req.params.id };
  const updatedUser = { $set: req.body };
  const options = { upsert: false };
  const result = await userCol.updateOne(filter, updatedUser, options);
  const user = await userCol.findOne(filter);
  res.send({ result, user });
});

// json web token handling

app.post("/jwt", async (req, res) => {
  const user = req.body;
  const token = jwt.sign(user, process.env.TOKEN_SECRET, { expiresIn: "5h" });
  const userData = await userCol.findOne(user);
  const wishlist = await wishlistCol.findOne(user);
  res
    .cookie(`b10a11token`, token, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
    })
    .send({ userData, wishlist });
});

app.post("/logout", (req, res) => {
  res
    .clearCookie(`b10a11token`, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
    })
    .send({ success: true });
});

app.get("/jwtverify", verifyToken, async (req, res) => {
  if (req.user.uid != req.query.uid) {
    return res.status(403).send({ message: "forbidden" });
  }

  res.send("verification success");
});

// blog calls

app.get("/blogs", async (req, res) => {
  const options = { projection: { blog: 0 } };
  const cursor = blogCol.find({}, options);
  const result = await cursor.toArray();
  res.send(result);
});

app.get("/myblogs/:id", async (req, res) => {
  const query = { uid: req.params.id };
  const options = {
    projection: { blog: 0, summary: 0 },
  };
  const cursor = blogCol.find(query, options);
  const result = await cursor.toArray();
  res.send(result);
});

app.delete("/deleteblog/:id", async (req, res) => {
  const query = { _id: new ObjectId(req.params.id) };
  const result = await blogCol.deleteOne(query);
  console.log(result);
  res.send(result);
});

app.get("/blog/:id", async (req, res) => {
  const query = { _id: new ObjectId(req.params.id) };
  const result = await blogCol.findOne(query);
  res.send(result);
});

app.get("/recentblogs", async (req, res) => {
  const query = {};
  const options = { sort: { time: -1 } };
  const cursor = blogCol.find(query, options).limit(6);
  const result = await cursor.toArray();
  res.send(result);
});

app.get("/filterblogs", async (req, res) => {
  const searchQuery = req.query;
  let query = {};
  searchQuery.search === ""
    ? (query = {})
    : (query.$text = { $search: `\"${searchQuery.search}\"` });
  searchQuery.category === "All"
    ? console.log("No Cat")
    : (query.category = searchQuery.category);
  console.log(query);
  await blogCol.createIndex({
    blog: "text",
    summary: "text",
    title: "text",
  });
  const cursor = blogCol.find(query);
  const result = await cursor.toArray();
  res.send(result);
});

app.post("/newblog", async (req, res) => {
  const newBlog = req.body;
  console.log(`adding new blog with data`, newBlog.title);
  const result = await blogCol.insertOne(newBlog);
  res.send(result);
});

app.put("/editblog/:id", async (req, res) => {
  const filter = { _id: new ObjectId(req.params.id) };
  const options = { upsert: false };
  const updatedBlog = { $set: req.body };
  const result = await blogCol.updateOne(filter, updatedBlog, options);
  console.log(result);
  res.send(result);
});

app.get("/featured", async (req, res) => {
  const query = {};
  const options = {
    sort: { size: -1 },
    projection: { blog: 0, summary: 0 },
  };
  const cursor = blogCol.find(query, options).limit(10);
  const result = await cursor.toArray();
  res.send(result);
});

// wishlist codes

app.get("/getwishlist", verifyToken, async (req, res) => {
  if (req.query.wishlist) {
    const query = req.query.wishlist
      .split(",")
      .map((data) => ObjectId.createFromHexString(data));
    const cursor = blogCol.find({ _id: { $in: query } });
    const result = await cursor.toArray();
    res.send(result);
  } else {
    res.send([]);
  }
});

app.post("/newwishlist", async (req, res) => {
  const filter = { uid: req.body.uid };
  const options = { upsert: false };
  const newWishlist = { uid: req.body.uid, wishlist: req.body.wishlist };
  const wishlistData = await wishlistCol.insertOne(newWishlist);
  const updatedUser = {
    $set: {
      wishlistId: wishlistData.insertedId,
    },
  };
  const result = await userCol.updateOne(filter, updatedUser, options);
  const wishlist = await wishlistCol.findOne(filter);
  const user = await userCol.findOne(filter);
  console.log(result, wishlistData);
  res.send({ result, wishlistData, wishlist, user });
});

app.put("/addtowishlist", async (req, res) => {
  const filter = { uid: req.body.uid };
  const updatedWishlist = { $set: { wishlist: req.body.wishlist } };
  const options = { upsert: false };
  const result = await wishlistCol.updateOne(filter, updatedWishlist, options);
  const newWishlist = await wishlistCol.findOne(filter);
  res.send({ result, newWishlist });
});

// comment stuff

app.get("/comments/:id", async (req, res) => {
  const query = { articleId: req.params.id };
  const options = { sort: { time: -1 } };
  const cursor = commentCol.find(query, options);
  const result = await cursor.toArray();
  res.send(result);
});

app.post("/addcomment", async (req, res) => {
  const newComment = req.body;
  const result = await commentCol.insertOne(newComment);
  const query = { articleId: req.body.articleId };
  const options = { sort: { time: -1 } };
  const cursor = commentCol.find(query, options);
  const comments = await cursor.toArray();
  console.log(result, comments);
  res.send({ result, comments });
});

app.delete("/deletecomment/:id", async (req, res) => {
  const query = { _id: new ObjectId(req.params.id) };
  const result = await commentCol.deleteOne(query);
  console.log(result);
  res.send(result);
});
