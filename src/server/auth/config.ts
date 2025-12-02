import { type DefaultSession, type NextAuthConfig } from "next-auth";
import GitHubProvider from "next-auth/providers/github";
import { OnChainDBAdapter } from "./onchaindb-adapter";

/**
 * Module augmentation for `next-auth` types. Allows us to add custom properties to the `session`
 * object and keep type safety.
 *
 * @see https://next-auth.js.org/getting-started/typescript#module-augmentation
 */
declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      // ...other properties
      // role: UserRole;
    } & DefaultSession["user"];
  }

  // interface User {
  //   // ...other properties
  //   // role: UserRole;
  // }
}

/**
 * Options for NextAuth.js used to configure adapters, providers, callbacks, etc.
 *
 * @see https://next-auth.js.org/configuration/options
 */
export const authConfig = {
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
      authorization: {
        params: {
          // Request repo scope for read access to private repositories
          scope: "read:user user:email repo",
        },
      },
      profile(profile) {
        return {
          id: profile.id.toString(),
          name: profile.name ?? profile.login,
          email: profile.email,
          image: profile.avatar_url,
          githubId: profile.id.toString(),
          githubLogin: profile.login, // GitHub username for profile URL
          githubCreated: new Date(profile.created_at),
        };
      },
    }),
  ],
  adapter: OnChainDBAdapter(),
  // Use JWT strategy to avoid eventual consistency issues with OnChainDB
  // The adapter is still used for user/account storage, but sessions are in JWT
  session: {
    strategy: "jwt",
  },
  callbacks: {
    // JWT callback - called when JWT is created or updated
    jwt: async ({ token, user }) => {
      if (user) {
        // First time sign in - add user id to token
        token.id = user.id;
      }
      return token;
    },
    // Session callback - called when session is checked
    session: ({ session, token }) => ({
      ...session,
      user: {
        ...session.user,
        id: token.id as string,
      },
    }),
  },
  pages: {
    signIn: "/auth",
    error: "/auth", // Redirect errors back to auth page
  },
  debug: process.env.NODE_ENV === "development",
} satisfies NextAuthConfig;
