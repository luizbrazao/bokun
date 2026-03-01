import { getConvexClient } from "../convex/client.ts";

export async function saveLastOptions(args: {
  tenantId: string;
  waUserId: string;
  activityId: string | number;
  date: string;
  optionMap: Array<{ index: number; startTimeId?: string | number }>;
}): Promise<void> {
  const convex = getConvexClient();

  await convex.mutation(
    "conversations:upsertConversationOptionMap" as any,
    {
      tenantId: args.tenantId,
      waUserId: args.waUserId,
      activityId: args.activityId,
      date: args.date,
      optionMap: args.optionMap,
    } as any
  );
}
