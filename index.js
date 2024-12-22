const express = require("express");
const cors = require("cors");

const app = express();

const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send(`all your blogses are belong to us`);
});

app.listen(port, () => {
  console.log(`we having stuffs happun at ${port}`);
});
