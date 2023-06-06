const express = require("express");
const app = express();
app.use(express.json());
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const dbpath = path.join(__dirname, "covid19IndiaPortal.db");
let db = null;
const initializedb = async () => {
  try {
    db = await open({
      filename: dbpath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running");
    });
  } catch (e) {
    console.log(`DB ERROR:${e.message}`);
    process.exit(1);
  }
};
initializedb();

const middlewareFunction = (request, response, next) => {
  console.log(request.query);
  next();
};

app.post("/login/", middlewareFunction, async (request, response) => {
  const userdet = request.body;
  const { username, password } = userdet;
  let checkuserexist = `select * from user where username='${username}';`;
  const userexistornot = await db.get(checkuserexist);
  if (userexistornot === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const pwdmatch = await bcrypt.compare(password, userexistornot.password);
    if (pwdmatch === false) {
      response.status(400);
      response.send("Invalid password");
    } else {
      const payload = { username: username };
      let jwtToken = jwt.sign(payload, "secret");
      const authHeader = request.headers["authorization"];

      if (authHeader === undefined) {
        response.status(400);
        response.send("Invalid JWT Token");
      } else {
        jwtToken = authHeader.split(" ")[1];
        jwt.verify(jwtToken, "secret", async (error, payload) => {
          if (error) {
            response.status(400);
            response.send("Invalid JWT Token");
          } else {
            response.send({ jwtToken });
          }
        });
      }
    }
  }
});
module.exports = app;
