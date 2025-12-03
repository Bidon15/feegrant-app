import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import {
  COLLECTIONS,
  type Account,
} from "~/server/db";

// GitHub API response types
interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  owner: {
    login: string;
  };
  description: string | null;
  private: boolean;
  html_url: string;
  default_branch: string;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
}

export const githubRouter = createTRPCRouter({
  // Get user's GitHub access token from their account
  getAccessToken: protectedProcedure.query(async ({ ctx }) => {
    const account = await ctx.db.findUnique<Account>(COLLECTIONS.accounts, {
      userId: ctx.session.user.id,
      provider: "github",
    });

    if (!account?.access_token) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "GitHub account not linked or missing access token",
      });
    }

    return { hasToken: true };
  }),

  // List all repos the user has access to (including private)
  // Repo linking is now done directly in namespace router (namespace.addRepo)
  listRepos: protectedProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        perPage: z.number().min(1).max(100).default(30),
        type: z.enum(["all", "owner", "member"]).default("all"),
        sort: z.enum(["created", "updated", "pushed", "full_name"]).default("updated"),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const account = await ctx.db.findUnique<Account>(COLLECTIONS.accounts, {
        userId: ctx.session.user.id,
        provider: "github",
      });

      if (!account?.access_token) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "GitHub account not linked. Please re-authenticate.",
        });
      }

      const params = new URLSearchParams({
        page: String(input?.page ?? 1),
        per_page: String(input?.perPage ?? 30),
        type: input?.type ?? "all",
        sort: input?.sort ?? "updated",
        direction: "desc",
      });

      const response = await fetch(
        `https://api.github.com/user/repos?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${account.access_token}`,
            Accept: "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
          },
        }
      );

      if (!response.ok) {
        const error = await response.text();
        console.error("[GitHub API] Error fetching repos:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch repositories from GitHub",
        });
      }

      const repos = (await response.json()) as GitHubRepo[];

      return repos.map((repo) => ({
        id: repo.id,
        name: repo.name,
        fullName: repo.full_name,
        owner: repo.owner.login,
        description: repo.description,
        isPrivate: repo.private,
        htmlUrl: repo.html_url,
        defaultBranch: repo.default_branch,
        language: repo.language,
        stargazersCount: repo.stargazers_count,
        forksCount: repo.forks_count,
      }));
    }),

  // Get repo contents (for viewing what they're building)
  getRepoContents: protectedProcedure
    .input(
      z.object({
        owner: z.string(),
        repo: z.string(),
        path: z.string().default(""),
      })
    )
    .query(async ({ ctx, input }) => {
      const account = await ctx.db.findUnique<Account>(COLLECTIONS.accounts, {
        userId: ctx.session.user.id,
        provider: "github",
      });

      if (!account?.access_token) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "GitHub account not linked",
        });
      }

      const response = await fetch(
        `https://api.github.com/repos/${input.owner}/${input.repo}/contents/${input.path}`,
        {
          headers: {
            Authorization: `Bearer ${account.access_token}`,
            Accept: "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
          },
        }
      );

      if (!response.ok) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Repository or path not found",
        });
      }

      return (await response.json()) as unknown;
    }),
});
