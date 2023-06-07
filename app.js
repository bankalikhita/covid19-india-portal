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

app.post("/login/", async (request, response) => {
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
      const jwtToken = jwt.sign(payload, "secret");
      console.log(jwtToken);
      response.send({ jwtToken });
    }
  }
});

const authenticateToken = (request, response, next) => {
  let jwtToken;
  const authHeader = request.headers["authorization"];
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "secret", async (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        next();
      }
    });
  }
};

const convertallstates = (each) => {
  return {
    stateId: each.state_id,
    stateName: each.state_name,
    population: each.population,
  };
};

app.get("/states/", authenticateToken, async (request, response) => {
  const getallstatesquery = `select * from state;`;
  const allstates = await db.all(getallstatesquery);
  response.send(allstates.map((each) => convertallstates(each)));
});

app.get("/states/:stateId/", authenticateToken, async (request, response) => {
  const { stateId } = request.params;
  const getstate = `select * from state where state_id=${stateId};`;
  const statedet = await db.get(getstate);
  response.send(convertallstates(statedet));
});

app.post("/districts/", authenticateToken, async (request, response) => {
  const { districtName, stateId, cases, cured, active, deaths } = request.body;
  const createdistrict = `insert into district (district_name,
  state_id,
  cases,
  cured,
  active,
  deaths) values('${districtName}',
  ${stateId},
  ${cases},
  ${cured},
  ${active},
  ${deaths});`;
  await db.run(createdistrict);
  response.send("District Successfully Added");
});

const convertdistricts = (each) => {
  return {
    districtId: each.district_id,
    districtName: each.district_name,
    stateId: each.state_id,
    cases: each.cases,
    cured: each.cured,
    active: each.active,
    deaths: each.deaths,
  };
};
app.get(
  "/districts/:districtId/",
  authenticateToken,
  async (request, response) => {
    const { districtId } = request.params;
    const getdistrict = `select * from district where district_id=${districtId};`;
    const distdetails = await db.get(getdistrict);
    response.send(convertdistricts(distdetails));
  }
);

app.delete(
  "/districts/:districtId/",
  authenticateToken,
  async (request, response) => {
    const { districtId } = request.params;
    const deldistrict = `delete from district where district_id=${districtId};`;
    await db.run(deldistrict);
    response.send("District Removed");
  }
);

app.put(
  "/districts/:districtId/",
  authenticateToken,
  async (request, response) => {
    const { districtId } = request.params;
    const {
      districtName,
      stateId,
      cases,
      cured,
      active,
      deaths,
    } = request.body;
    const updatedis = `update district set district_name='${districtName}',state_id=${stateId},cases=${cases},cured=${cured},active=${active},deaths=${deaths} where district_id=${districtId};`;
    await db.run(updatedis);
    response.send("District Details Updated");
  }
);

app.get(
  "/states/:stateId/stats/",
  authenticateToken,
  async (request, response) => {
    const { stateId } = request.params;
    const stats = `select SUM(cases) as totalCases, SUM(cured) as totalCured, SUM(active) as totalActive, SUM(deaths) as totalDeaths from district where state_id=${stateId};`;
    const statsdet = await db.all(stats);
    response.send({
      totalCases: statsdet["SUM(cases)"],
      totalCured: statsdet["SUM(cured)"],
      totalActive: statsdet["SUM(active)"],
      totalDeaths: statsdet["SUM(deaths)"],
    });
  }
);
module.exports = app;
