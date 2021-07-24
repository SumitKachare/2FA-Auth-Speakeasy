const express = require("express");
const speak = require("speakeasy");
const uuid = require("uuid");
const dotenv = require("dotenv");
const { JsonDB } = require("node-json-db");
const { Config } = require("node-json-db/dist/lib/JsonDBConfig");

//Load env Variables
dotenv.config();

// Define PORT
const PORT = process.env.PORT || 3000;

//Initialize express
const app = express();

// JSON Parser
app.use(express.json());

//initiate DB
const db = new JsonDB(new Config("myDatabase", true, true, "/"));

//Dummy API
app.get("/api", (req, res) => {
  res
    .status(200)
    .json({ successcv: true, message: "Welcome to two factor Auth" });
});

//Route where user will register and recieve temp secret
app.post("/api/register", (req, res) => {
  const id = uuid.v4();
  try {
    const path = `user/${id}`;
    const temp_secret = speak.generateSecret();
    db.push(path, { id, temp_secret });
    res
      .status(200)
      .json({ success: true, data: { id, secret: temp_secret.base32 } });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, error: error.message });
  }
});

//Route to get token from authentixcator and verify token
app.post("/api/verify", (req, res) => {
  //console.log("req body", req.body);
  const { token, userId } = req.body;

  try {
    if (!token || !userId) {
      throw new Error("No token or user ID found");
    }

    const path = `/user/${userId}`;
    const user = db.getData(path);

    if (!user) {
      throw new Error("No user found");
    }

    const { base32: secret } = user.temp_secret;

    const verified = speak.totp.verify({ secret, encoding: "base32", token });

    if (verified) {
      db.push(path, { id: userId, secret: user.temp_secret });
      res.status(200).json({ verified: true });
    } else {
      res.status(400).json({ verified: false });
    }
  } catch (error) {
    res.status(400).json({ verified: false, error: error.message });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
