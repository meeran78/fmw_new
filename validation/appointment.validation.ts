import { z } from "zod";

export const appointmentBookSchema = z.object({
  sellerUserId: z.string().min(1),
  shopId: z.string().min(1),
  listingId: z.string().optional(),
  startDatetime: z.string().datetime({ message: "Invalid start time" }),
  endDatetime: z.string().datetime({ message: "Invalid end time" }),
  notes: z.string().max(1000).optional(),
});

export const scheduleRuleSchema = z.object({
  weekday: z.number().int().min(0).max(6),
  startMinute: z.number().int().min(0).max(1439),
  endMinute: z.number().int().min(1).max(1440),
  slotMinutes: z.number().int().min(15).max(180).default(30),
});

export const schedulePutSchema = z.object({
  rules: z.array(scheduleRuleSchema).max(50),
});
