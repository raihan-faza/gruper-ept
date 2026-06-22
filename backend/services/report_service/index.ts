import { startServer } from "./src/server/start.js";

async function main() {
  require("dotenv").config();
  console.log("Hello via Bun!");
  startServer();
}

main();
