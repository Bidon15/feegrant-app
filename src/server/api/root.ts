import { userRouter } from "~/server/api/routers/user";
import { authzRouter } from "~/server/api/routers/authz";
import { blobRouter } from "~/server/api/routers/blob";
import { accountRouter } from "~/server/api/routers/account";
import { namespaceRouter } from "~/server/api/routers/namespace";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  user: userRouter,
  authz: authzRouter,
  blob: blobRouter,
  account: accountRouter,
  namespace: namespaceRouter,
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
