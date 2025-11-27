import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { Secp256k1, sha256 } from "@cosmjs/crypto";
import { Secp256k1Signature } from "@cosmjs/crypto";
import { fromBech32 } from "@cosmjs/encoding";
import { serializeSignDoc } from "@cosmjs/amino";
import {
  COLLECTIONS,
  generateId,
  nowISO,
  type User,
  type Address,
} from "~/server/db";

export const userRouter = createTRPCRouter({
  me: protectedProcedure.query(async ({ ctx }) => {
    // Find user by ID
    const userResult = await ctx.db.findUnique<User>(COLLECTIONS.users, {
      id: ctx.session.user.id,
    });

    if (!userResult) {
      return null;
    }

    // Find associated address
    const addressResult = await ctx.db.findUnique<Address>(
      COLLECTIONS.addresses,
      {
        userId: ctx.session.user.id,
      }
    );

    return {
      ...userResult,
      address: addressResult ?? null,
    };
  }),

  bindAddress: protectedProcedure
    .input(
      z.object({
        address: z.string(),
        signedNonce: z.string(),
        publicKey: z.string(),
      })
    )
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
      const existingAddress = await ctx.db.findUnique<Address>(
        COLLECTIONS.addresses,
        { bech32: address }
      );

      if (existingAddress) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Address is already bound to another user.",
        });
      }

      // Check if user already has an address bound
      const userAddress = await ctx.db.findUnique<Address>(
        COLLECTIONS.addresses,
        { userId: ctx.session.user.id }
      );

      if (userAddress) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "User already has an address bound.",
        });
      }

      // Generate nonce message for verification
      const nonce = `Bind address to Para Demo account: ${ctx.session.user.id}`;

      // For Keplr's signArbitrary (ADR-036), we need to create an Amino sign doc
      const signDoc = {
        chain_id: "",
        account_number: "0",
        sequence: "0",
        fee: {
          gas: "0",
          amount: [],
        },
        msgs: [
          {
            type: "sign/MsgSignData",
            value: {
              signer: address,
              data: Buffer.from(nonce, "utf-8").toString("base64"),
            },
          },
        ],
        memo: "",
      };

      // Create message hash for signature verification (ADR-036 format)
      const messageHash = sha256(serializeSignDoc(signDoc));

      // Verify the signature
      console.log("Verifying signature...");
      console.log("Public key (hex):", publicKey);
      console.log("Signature (hex):", signedNonce);
      console.log(
        "Message hash (hex):",
        Buffer.from(messageHash).toString("hex")
      );

      try {
        const publicKeyBytes = Buffer.from(publicKey, "hex");
        const signatureBytes = Buffer.from(signedNonce, "hex");

        console.log("Public key bytes length:", publicKeyBytes.length);
        console.log("Signature bytes length:", signatureBytes.length);

        let isValid;

        // Handle raw 64-byte signature (r + s concatenated) from Keplr
        if (signatureBytes.length === 64) {
          const r = signatureBytes.slice(0, 32);
          const s = signatureBytes.slice(32, 64);
          const signature = new Secp256k1Signature(r, s);

          isValid = await Secp256k1.verifySignature(
            signature,
            messageHash,
            publicKeyBytes
          );
        } else {
          // Try DER format for other signature types
          isValid = await Secp256k1.verifySignature(
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

      // Bind address to user - create in OnChainDB
      const now = nowISO();
      const newAddress: Address = {
        id: generateId(),
        userId: ctx.session.user.id,
        bech32: address,
        isDusted: false,
        hasFeeGrant: false,
        feeAllowanceRemaining: null,
        createdAt: now,
        updatedAt: now,
      };

      await ctx.db.createDocument(COLLECTIONS.addresses, newAddress);

      return { success: true, address: newAddress };
    }),

  getNonce: protectedProcedure.query(({ ctx }) => {
    return {
      nonce: `Bind address to Para Demo account: ${ctx.session.user.id}`,
    };
  }),
});
