import dotenv from "dotenv";
dotenv.config();
import express from "express";
import { initWs } from "./ws";
import { createServer } from "http";
import cors from "cors";
import { copyS3Folder } from "./aws";

const app = express();
app.use(
  cors({
    origin: "*",
  })
);
app.use(express.json());
const httpServer = createServer(app);

initWs(httpServer);

// initHttp() http.ts

app.get("/project", (req, res) => {
  res.send("/project route");
});

app.post("/project", async (req, res) => {
  const { replId, language } = req.body;

  if (!replId) {
    res.status(400).send("BAD REQUEST❗❗❗");
    return;
  }

  await copyS3Folder(`base/${language}`, `code/${replId}`);

  res.send("PROJECT CREATED ✅✅✅");
});

const port = process.env.PORT || 8080;

httpServer.listen(port, () => {
  console.log(`SERVER RUNNING ON PORT ${port} ✅✅✅`);
});
