import { userRouter } from "~/server/api/routers/user";
import { walletRouter } from "~/server/api/routers/wallet";
import { accountRouter } from "~/server/api/routers/account";
import { adminRouter } from "~/server/api/routers/admin";
import { statsRouter } from "~/server/api/routers/stats";
import { namespaceRouter } from "~/server/api/routers/namespace";
import { githubRouter } from "~/server/api/routers/github";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  user: userRouter,
  wallet: walletRouter,
  account: accountRouter,
  admin: adminRouter,
  stats: statsRouter,
  namespace: namespaceRouter,
  github: githubRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);
