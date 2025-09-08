import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { generateRandomNamespace, generateNamespaceFromName } from "~/server/celestia/namespace";

export const namespaceRouter = createTRPCRouter({
  random: publicProcedure
    .query(() => {
      return { namespace: generateRandomNamespace() };
    }),

  fromName: publicProcedure
    .input(z.object({ name: z.string().min(1) }))
    .query(({ input }) => {
      return { namespace: generateNamespaceFromName(input.name) };
    }),
});
