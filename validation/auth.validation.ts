import { z } from "zod";

export const signupSchema = z
  .object({
    name: z.string().min(1, {
      message: "Name is required",
    }),
    email: z
      .string()
      .email({
        message: "Please enter a valid email address",
      })
      .min(1, {
        message: "Email is required",
      }),
    password: z.string().min(8, {
      message: "Password should be at least 8 characters",
    }),
    accountType: z.enum(["buyer", "seller"]),
    shopName: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.accountType === "seller") {
      const trimmed = (data.shopName ?? "").trim();
      if (trimmed.length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Shop name is required (min 2 characters)",
          path: ["shopName"],
        });
      }
    }
  });

export const loginSchema = z.object({
  email: z
    .string()
    .email({
      message: "Please enter a valid email address",
    })
    .min(1, {
      message: "Email is required",
    }),
  password: z.string().min(1, {
    message: "Password is required",
  }),
});
