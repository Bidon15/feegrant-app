import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { Secp256k1, sha256 } from "@cosmjs/crypto";
import { Secp256k1Signature } from "@cosmjs/crypto";
import { fromBech32, toBech32 } from "@cosmjs/encoding";

export const userRouter = createTRPCRouter({
  me: protectedProcedure
    .query(async ({ ctx }) => {
      const user = await ctx.db.user.findUnique({
        where: { id: ctx.session.user.id },
        include: { address: true },
      });

      return user;
    }),

  bindAddress: protectedProcedure
    .input(z.object({
      address: z.string(),
      signedNonce: z.string(),
      publicKey: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { address, signedNonce, publicKey } = input;

      // Validate Celestia address format
      try {
        const decoded = fromBech32(address);
        if (decoded.prefix !== "celestia") {
          throw new Error("Invalid prefix");
        }
      } catch {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid Celestia address format.",
        });
      }

      // Check if address is already bound
      const existingAddress = await ctx.db.address.findUnique({
        where: { bech32: address },
      });

      if (existingAddress) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Address is already bound to another user.",
        });
      }

      // Check if user already has an address bound
      const userAddress = await ctx.db.address.findUnique({
        where: { userId: ctx.session.user.id },
      });

      if (userAddress) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "User already has an address bound.",
        });
      }

      // Generate nonce message for verification
      const nonce = `Bind address to Para Demo account: ${ctx.session.user.id}`;
      
      // Create message hash for signature verification
      const messageHash = sha256(Buffer.from(nonce, 'utf-8'));
      
      // Verify the signature
      console.log("Verifying signature...");
    console.log("Public key (hex):", publicKey);
    console.log("Signature (hex):", signedNonce);
    console.log("Message hash (hex):", Buffer.from(messageHash).toString('hex'));

    try {
      const publicKeyBytes = Buffer.from(publicKey, 'hex');
      const signatureBytes = Buffer.from(signedNonce, 'hex');
      
      console.log("Public key bytes length:", publicKeyBytes.length);
      console.log("Signature bytes length:", signatureBytes.length);
      
      let isValid;
      
      // Handle raw 64-byte signature (r + s concatenated) from Para SDK
      if (signatureBytes.length === 64) {
        const r = signatureBytes.slice(0, 32);
        const s = signatureBytes.slice(32, 64);
        const signature = new Secp256k1Signature(r, s);
        
        isValid = Secp256k1.verifySignature(
          signature,
          messageHash,
          publicKeyBytes
        );
      } else {
        // Try DER format for other signature types
        isValid = Secp256k1.verifySignature(
          Secp256k1Signature.fromDer(signatureBytes),
          messageHash,
          publicKeyBytes
        );
      }
      
      console.log("Signature verification result:", isValid);
      
      if (!isValid) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid signature",
        });
      }
    } catch (verifyError) {
      console.error("Signature verification failed:", verifyError);
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Signature verification failed",
      });
    }

      // Bind address to user
      const newAddress = await ctx.db.address.create({
        data: {
          userId: ctx.session.user.id,
          bech32: address,
        },
      });

      return { success: true, address: newAddress };
    }),

  getNonce: protectedProcedure
    .query(({ ctx }) => {
      return {
        nonce: `Bind address to Para Demo account: ${ctx.session.user.id}`,
      };
    }),
});
