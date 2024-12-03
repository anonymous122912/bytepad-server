import { Express } from "express";
import { copyS3Folder } from "./aws";

export function initHttp(app: Express) {
  app.post("/project", async (req, res) => {
    // Hit a database to ensure this slug isn't taken already
    const { replId, language } = req.body;

    if (!replId) {
      res.status(400).send("Bad request");
      return;
    }

    await copyS3Folder(`base/${language}`, `code/${replId}`);

    console.log("copy s3 folder completed");

    res.send("Project created");
  });
}
