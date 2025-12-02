import type { Adapter, AdapterAccount, AdapterUser } from "next-auth/adapters";
import {
  db,
  COLLECTIONS,
  generateId,
  nowISO,
  type User,
  type Account,
  type Session,
  type VerificationToken,
} from "~/server/db";

// Convert our User type to NextAuth AdapterUser
function toAdapterUser(user: User): AdapterUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email ?? "",
    emailVerified: user.emailVerified ? new Date(user.emailVerified) : null,
    image: user.image,
  };
}


export function OnChainDBAdapter(): Adapter {
  return {
    async createUser(data) {
      const id = generateId();
      const now = nowISO();

      // Handle GitHub-specific fields from profile
      const userData = data as AdapterUser & { githubId?: string; githubLogin?: string; githubCreated?: Date };

      const user: User = {
        id,
        githubId: userData.githubId ?? id,
        githubLogin: userData.githubLogin ?? userData.name ?? "unknown",
        githubCreated: userData.githubCreated?.toISOString() ?? now,
        name: data.name ?? null,
        email: data.email ?? null,
        emailVerified: data.emailVerified?.toISOString() ?? null,
        image: data.image ?? null,
        createdAt: now,
        updatedAt: now,
      };

      await db.createDocument(COLLECTIONS.users, user);
      return toAdapterUser(user);
    },

    async getUser(id) {
      const user = await db.findUnique<User>(COLLECTIONS.users, { id });
      return user ? toAdapterUser(user) : null;
    },

    async getUserByEmail(email) {
      const user = await db.findUnique<User>(COLLECTIONS.users, { email });
      return user ? toAdapterUser(user) : null;
    },

    async getUserByAccount({ providerAccountId, provider }) {
      console.log(`[Auth Adapter] getUserByAccount: provider=${provider}, providerAccountId=${providerAccountId}`);
      const account = await db.findUnique<Account>(COLLECTIONS.accounts, {
        provider,
        providerAccountId,
      });

      if (!account) {
        console.log(`[Auth Adapter] Account not found`);
        return null;
      }
      console.log(`[Auth Adapter] Account found for userId=${account.userId}`);

      const user = await db.findUnique<User>(COLLECTIONS.users, { id: account.userId });
      if (!user) {
        console.log(`[Auth Adapter] User not found for account`);
        return null;
      }
      console.log(`[Auth Adapter] User found: ${user.name}`);
      return toAdapterUser(user);
    },

    async updateUser(data) {
      const { id, ...updateData } = data;

      const existingUser = await db.findUnique<User>(COLLECTIONS.users, { id });
      if (!existingUser) throw new Error("User not found");

      const updatedUser: User = {
        ...existingUser,
        name: updateData.name ?? existingUser.name,
        email: updateData.email ?? existingUser.email,
        emailVerified: updateData.emailVerified?.toISOString() ?? existingUser.emailVerified,
        image: updateData.image ?? existingUser.image,
        updatedAt: nowISO(),
      };

      await db.updateDocument<User>(COLLECTIONS.users, { id }, updatedUser);
      return toAdapterUser(updatedUser);
    },

    async deleteUser(userId) {
      // Delete associated data first
      await db.deleteDocument(COLLECTIONS.accounts, { userId });
      await db.deleteDocument(COLLECTIONS.sessions, { userId });
      await db.deleteDocument(COLLECTIONS.users, { id: userId });
    },

    async linkAccount(data) {
      const id = generateId();
      const account: Account = {
        id,
        userId: data.userId,
        type: data.type,
        provider: data.provider,
        providerAccountId: data.providerAccountId,
        refresh_token: data.refresh_token ?? null,
        access_token: data.access_token ?? null,
        expires_at: data.expires_at ?? null,
        token_type: data.token_type ?? null,
        scope: data.scope ?? null,
        id_token: data.id_token ?? null,
        session_state: (data.session_state as string) ?? null,
        refresh_token_expires_in: null,
      };

      await db.createDocument(COLLECTIONS.accounts, account);

      return account as unknown as AdapterAccount;
    },

    async unlinkAccount({ providerAccountId, provider }) {
      await db.deleteDocument(COLLECTIONS.accounts, {
        provider,
        providerAccountId,
      });
    },

    async createSession(data) {
      const id = generateId();
      const session: Session = {
        id,
        sessionToken: data.sessionToken,
        userId: data.userId,
        expires: data.expires.toISOString(),
      };

      console.log(`[Auth Adapter] Creating session for user ${data.userId}`);
      await db.createDocument(COLLECTIONS.sessions, session);
      console.log(`[Auth Adapter] Session created with id ${id}`);

      return {
        id,
        sessionToken: session.sessionToken,
        userId: session.userId,
        expires: new Date(session.expires),
      };
    },

    async getSessionAndUser(sessionToken) {
      console.log(`[Auth Adapter] Getting session for token: ${sessionToken.substring(0, 10)}...`);
      const session = await db.findUnique<Session>(COLLECTIONS.sessions, { sessionToken });
      if (!session) {
        console.log(`[Auth Adapter] Session not found`);
        return null;
      }
      console.log(`[Auth Adapter] Session found for user ${session.userId}`);

      const user = await db.findUnique<User>(COLLECTIONS.users, { id: session.userId });
      if (!user) {
        console.log(`[Auth Adapter] User not found for session`);
        return null;
      }
      console.log(`[Auth Adapter] User found: ${user.name}`);

      return {
        session: {
          id: session.id,
          sessionToken: session.sessionToken,
          userId: session.userId,
          expires: new Date(session.expires),
        },
        user: toAdapterUser(user),
      };
    },

    async updateSession(data) {
      const { sessionToken, ...updateData } = data;

      const existingSession = await db.findUnique<Session>(COLLECTIONS.sessions, { sessionToken });
      if (!existingSession) return null;

      const updatedSession: Session = {
        ...existingSession,
        expires: updateData.expires?.toISOString() ?? existingSession.expires,
        userId: updateData.userId ?? existingSession.userId,
      };

      await db.updateDocument<Session>(COLLECTIONS.sessions, { sessionToken }, updatedSession);

      return {
        id: updatedSession.id,
        sessionToken: updatedSession.sessionToken,
        userId: updatedSession.userId,
        expires: new Date(updatedSession.expires),
      };
    },

    async deleteSession(sessionToken) {
      await db.deleteDocument(COLLECTIONS.sessions, { sessionToken });
    },

    async createVerificationToken(data) {
      const token: VerificationToken = {
        identifier: data.identifier,
        token: data.token,
        expires: data.expires.toISOString(),
      };

      await db.createDocument(COLLECTIONS.verificationTokens, token);

      return {
        identifier: token.identifier,
        token: token.token,
        expires: new Date(token.expires),
      };
    },

    async useVerificationToken({ identifier, token }) {
      const verificationToken = await db.findUnique<VerificationToken>(
        COLLECTIONS.verificationTokens,
        { identifier, token }
      );

      if (!verificationToken) return null;

      await db.deleteDocument(COLLECTIONS.verificationTokens, { identifier, token });

      return {
        identifier: verificationToken.identifier,
        token: verificationToken.token,
        expires: new Date(verificationToken.expires),
      };
    },
  };
}
