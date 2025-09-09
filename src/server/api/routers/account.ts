import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { getCelestiaClient } from "~/server/celestia/client";

export const accountRouter = createTRPCRouter({
  getAccountInfo: protectedProcedure
    .input(z.object({ address: z.string() }))
    .query(async ({ input }) => {
      const { client } = await getCelestiaClient();
      
      try {
        const account = await client.getAccount(input.address);
        if (!account) {
          throw new Error("Account not found");
        }
        return {
          accountNumber: account.accountNumber.toString(),
          sequence: account.sequence.toString(),
          address: account.address,
        };
      } catch (error) {
        console.error("Failed to fetch account info:", error);
        throw new Error("Failed to fetch account information");
      }
    }),
});
