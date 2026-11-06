import "dotenv/config";
import { createApp } from "./app";

createApp().listen(3002, "127.0.0.1", () =>
  console.log("Backend - BP | Ing. Adrian Veas | http://localhost:3002"),
);
