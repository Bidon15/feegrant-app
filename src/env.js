import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  /**
   * Specify your server-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars.
   */
  server: {
    AUTH_SECRET:
      process.env.NODE_ENV === "production"
        ? z.string()
        : z.string().optional(),
    DATABASE_URL: z.string().url(),
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    
    // GitHub OAuth
    GITHUB_ID: z.string(),
    GITHUB_SECRET: z.string(),
    
    // Celestia-specific environment variables
    QUICKNODE_RPC: z.string().url(),
    MOCHA_RECOVERY_WALLET: z.string(),
    CELESTIA_CHAIN_ID: z.string().default("mocha-4"),
    COMMIT_URL: z.string().url(),

    // OnChainDB Configuration
    ONCHAINDB_API_URL: z.string().url(),
    ONCHAINDB_APP_ID: z.string(),
    ONCHAINDB_APP_HASH: z.string().optional(),
    ONCHAINDB_BROKER_ADDRESS: z.string().optional(),
  },

  /**
   * Specify your client-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars. To expose them to the client, prefix them with
   * `NEXT_PUBLIC_`.
   */
  client: {
    NEXT_PUBLIC_PARA_API_KEY: z.string(),
    NEXT_PUBLIC_RPC_ENDPOINT: z.string().url(),
  },

  /**
   * You can't destruct `process.env` as a regular object in the Next.js edge runtimes (e.g.
   * middlewares) or client-side so we need to destruct manually.
   */
  runtimeEnv: {
    AUTH_SECRET: process.env.AUTH_SECRET,
    DATABASE_URL: process.env.DATABASE_URL,
    NODE_ENV: process.env.NODE_ENV,
    GITHUB_ID: process.env.GITHUB_ID,
    GITHUB_SECRET: process.env.GITHUB_SECRET,
    QUICKNODE_RPC: process.env.QUICKNODE_RPC,
    MOCHA_RECOVERY_WALLET: process.env.MOCHA_RECOVERY_WALLET,
    CELESTIA_CHAIN_ID: process.env.CELESTIA_CHAIN_ID,
    COMMIT_URL: process.env.COMMIT_URL,
    ONCHAINDB_API_URL: process.env.ONCHAINDB_API_URL,
    ONCHAINDB_APP_ID: process.env.ONCHAINDB_APP_ID,
    ONCHAINDB_APP_HASH: process.env.ONCHAINDB_APP_HASH,
    ONCHAINDB_BROKER_ADDRESS: process.env.ONCHAINDB_BROKER_ADDRESS,
    NEXT_PUBLIC_PARA_API_KEY: process.env.NEXT_PUBLIC_PARA_API_KEY,
    NEXT_PUBLIC_RPC_ENDPOINT: process.env.NEXT_PUBLIC_RPC_ENDPOINT,
  },
  /**
   * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially
   * useful for Docker builds.
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  /**
   * Makes it so that empty strings are treated as undefined. `SOME_VAR: z.string()` and
   * `SOME_VAR=''` will throw an error.
   */
  emptyStringAsUndefined: true,
});
