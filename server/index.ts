import express from "express";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { createApp } from "./app.js";
import { config } from "./config.js";
import { ProfileStore } from "./store.js";

const store = new ProfileStore(config.dataFile);
await store.initialize();
const { app } = createApp(store);
const clientDirectory = resolve(process.cwd(), "dist/client");

if (existsSync(clientDirectory)) {
  app.use(express.static(clientDirectory));
  app.get("/{*splat}", (_request, response) => response.sendFile(resolve(clientDirectory, "index.html")));
}

app.listen(config.port, () => {
  const mode = config.hfToken ? `hosted AI (${config.hfModel})` : "demo AI";
  console.log(`Facet is running at http://localhost:${config.port} using ${mode}.`);
});

