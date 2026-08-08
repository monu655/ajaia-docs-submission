import path from "path";
import fs from "fs";

const testDbPath = path.join(__dirname, "test.db");
for (const suffix of ["", "-wal", "-shm"]) {
  const p = testDbPath + suffix;
  if (fs.existsSync(p)) fs.unlinkSync(p);
}
process.env.DB_FILE = testDbPath;
