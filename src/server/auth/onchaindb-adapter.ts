/**
 * NextAuth adapter for OnChainDB
 * Implements the NextAuth Adapter interface using OnChainDB
 */

import type { Adapter, AdapterUser, AdapterAccount, AdapterSession, VerificationToken } from "next-auth/adapters";
import type { OnChainDB } from "~/lib/onchaindb";
import { createAppPaymentProof } from "~/lib/onchaindb";

export function OnChainDBAdapter(db: OnChainDB): Adapter {
  return {
    async createUser(user: Omit<AdapterUser, "id">): Promise<AdapterUser> {
      const newUser = await db.create<AdapterUser>('users', user, createAppPaymentProof());
      return newUser;
    },

    async getUser(id: string): Promise<AdapterUser | null> {
      const user = await db.findUnique<AdapterUser>('users', { id });
      return user;
    },

    async getUserByEmail(email: string): Promise<AdapterUser | null> {
      const user = await db.findUnique<AdapterUser>('users', { email });
      return user;
    },

    async getUserByAccount(providerAccountId: { provider: string; providerAccountId: string }): Promise<AdapterUser | null> {
      // Find account by provider and providerAccountId
      const account = await db.findUnique<AdapterAccount & { userId: string }>('accounts', {
        provider: providerAccountId.provider,
        providerAccountId: providerAccountId.providerAccountId,
      });

      if (!account) return null;

      // Get the user
      const user = await db.findUnique<AdapterUser>('users', { id: account.userId });
      return user;
    },

    async updateUser(user: Partial<AdapterUser> & Pick<AdapterUser, "id">): Promise<AdapterUser> {
      const updated = await db.update<AdapterUser>(
        'users',
        { id: user.id },
        user,
        createAppPaymentProof()
      );
      return updated!;
    },

    async deleteUser(id: string): Promise<void> {
      await db.delete('users', { id }, createAppPaymentProof());
    },

    async linkAccount(account: AdapterAccount): Promise<void> {
      await db.create<AdapterAccount>('accounts', account, createAppPaymentProof());
    },

    async unlinkAccount(providerAccountId: { provider: string; providerAccountId: string }): Promise<void> {
      await db.delete('accounts', {
        provider: providerAccountId.provider,
        providerAccountId: providerAccountId.providerAccountId,
      }, createAppPaymentProof());
    },

    async createSession(session: { sessionToken: string; userId: string; expires: Date }): Promise<AdapterSession> {
      const newSession = await db.create<AdapterSession>('sessions', session, createAppPaymentProof());
      return newSession;
    },

    async getSessionAndUser(sessionToken: string): Promise<{ session: AdapterSession; user: AdapterUser } | null> {
      // Find session by token
      const session = await db.findUnique<AdapterSession>('sessions', { sessionToken });
      if (!session) return null;

      // Get the user
      const user = await db.findUnique<AdapterUser>('users', { id: session.userId });
      if (!user) return null;

      return { session, user };
    },

    async updateSession(session: Partial<AdapterSession> & Pick<AdapterSession, "sessionToken">): Promise<AdapterSession> {
      const updated = await db.update<AdapterSession>(
        'sessions',
        { sessionToken: session.sessionToken },
        session,
        createAppPaymentProof()
      );
      return updated!;
    },

    async deleteSession(sessionToken: string): Promise<void> {
      await db.delete('sessions', { sessionToken }, createAppPaymentProof());
    },

    async createVerificationToken(verificationToken: VerificationToken): Promise<VerificationToken> {
      const token = await db.create<VerificationToken>('verification_tokens', verificationToken, createAppPaymentProof());
      return token;
    },

    async useVerificationToken(params: { identifier: string; token: string }): Promise<VerificationToken | null> {
      // Find the token
      const token = await db.findUnique<VerificationToken>('verification_tokens', {
        identifier: params.identifier,
        token: params.token,
      });

      if (!token) return null;

      // Delete the token (use once)
      await db.delete('verification_tokens', {
        identifier: params.identifier,
        token: params.token,
      }, createAppPaymentProof());

      return token;
    },
  };
}
