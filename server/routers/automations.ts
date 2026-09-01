import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { approveAutomation, createAutomation, getDashboardData, getInstagramAccountForUser, setAutomationStatus, updateAutomation } from "../db";
import { listInstagramReels } from "../meta";
import { protectedProcedure, router } from "../_core/trpc";

const optionalKeyword = z
  .string()
  .trim()
  .max(512)
  .optional()
  .transform(value => value || undefined);
const blockedWords = z.array(z.string().trim().min(1).max(100)).max(50).optional();

export const automationsRouter = router({
  dashboard: protectedProcedure.query(async ({ ctx }) => getDashboardData(ctx.user.id)),

  listReels: protectedProcedure.input(z.object({ instagramAccountId: z.number().int().positive() })).query(async ({ ctx, input }) => {
    try {
      const account = await getInstagramAccountForUser(ctx.user.id, input.instagramAccountId);
      return await listInstagramReels(account);
    } catch (error) {
      throw new TRPCError({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "Unable to load Reels" });
    }
  }),

  create: protectedProcedure
    .input(
      z.object({
        instagramAccountId: z.number().int().positive(),
        name: z.string().trim().min(2).max(120),
        reelId: z.string().trim().min(1).max(128),
        reelLabel: z.string().trim().max(255).optional(),
        reelPermalink: z.string().trim().url().max(2048).optional(),
        reelThumbnailUrl: z.string().trim().url().max(2048).optional(),
        commentKeyword: optionalKeyword,
        blockedWords,
        promptMessage: z.string().trim().min(1).max(1000),
        confirmationLabel: z.string().trim().min(1).max(20),
        publicReplyMessage: z.string().trim().max(1000).optional(),
        publicReplyOptions: z.array(z.string().trim().min(1).max(1000)).max(3).optional(),
        messageBody: z.string().trim().min(1).max(1000),
        linkUrl: z.string().trim().url().max(2048),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const normalizedKeyword = input.commentKeyword?.normalize("NFKC").toLocaleLowerCase("pt-BR");
      const normalizedBlockedWords = input.blockedWords?.map(word => word.normalize("NFKC").toLocaleLowerCase("pt-BR"));
      try {
        await createAutomation({ ...input, userId: ctx.user.id, normalizedKeyword, blockedWords: normalizedBlockedWords });
        return { success: true } as const;
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error instanceof Error ? error.message : "Unable to create automation",
        });
      }
    }),

  approve: protectedProcedure.input(z.object({ automationId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    await approveAutomation(ctx.user.id, input.automationId);
    return { success: true } as const;
  }),

  update: protectedProcedure
    .input(z.object({
      automationId: z.number().int().positive(),
      name: z.string().trim().min(2).max(120),
      reelId: z.string().trim().min(1).max(128),
      reelLabel: z.string().trim().max(255).optional(),
      reelPermalink: z.string().trim().url().max(2048).optional(),
      reelThumbnailUrl: z.string().trim().url().max(2048).optional(),
      commentKeyword: optionalKeyword,
      blockedWords,
      promptMessage: z.string().trim().min(1).max(1000),
      confirmationLabel: z.string().trim().min(1).max(20),
      publicReplyMessage: z.string().trim().max(1000).optional(),
      publicReplyOptions: z.array(z.string().trim().min(1).max(1000)).max(3).optional(),
      messageBody: z.string().trim().min(1).max(1000),
      linkUrl: z.string().trim().url().max(2048),
    }))
    .mutation(async ({ ctx, input }) => {
      const normalizedKeyword = input.commentKeyword?.normalize("NFKC").toLocaleLowerCase("pt-BR");
      const normalizedBlockedWords = input.blockedWords?.map(word => word.normalize("NFKC").toLocaleLowerCase("pt-BR"));
      try {
        await updateAutomation({ ...input, userId: ctx.user.id, normalizedKeyword, blockedWords: normalizedBlockedWords });
        return { success: true } as const;
      } catch (error) {
        throw new TRPCError({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "Unable to update automation" });
      }
    }),

  setStatus: protectedProcedure
    .input(z.object({ automationId: z.number().int().positive(), status: z.enum(["active", "paused", "archived"]) }))
    .mutation(async ({ ctx, input }) => {
      try {
        await setAutomationStatus({ ...input, userId: ctx.user.id });
        return { success: true } as const;
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error instanceof Error ? error.message : "Unable to update automation",
        });
      }
    }),
});
