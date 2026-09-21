import { loadEnv, requireDatabaseUrl } from "@opensourcex/shared";
import { createPool } from "./client";
import { migrate } from "./migrate";

const pool = createPool(requireDatabaseUrl(loadEnv()));
migrate(pool)
  .then((ran) => console.log(ran.length ? `applied: ${ran.join(", ")}` : "up to date"))
  .catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
