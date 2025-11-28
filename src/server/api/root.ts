import { userRouter } from "~/server/api/routers/user";
import { walletRouter } from "~/server/api/routers/wallet";
import { blobRouter } from "~/server/api/routers/blob";
import { accountRouter } from "~/server/api/routers/account";
import { adminRouter } from "~/server/api/routers/admin";
import { statsRouter } from "~/server/api/routers/stats";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  user: userRouter,
  wallet: walletRouter,
  blob: blobRouter,
  account: accountRouter,
  admin: adminRouter,
  stats: statsRouter,
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
