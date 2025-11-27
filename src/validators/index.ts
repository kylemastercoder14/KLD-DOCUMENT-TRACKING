import { z } from "zod";

export const designationSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  documentCategoryIds: z.array(z.string().min(1)).catch([]),
});

const documentCategoryShape = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
});

export const documentCategorySchema = z.object({
  categories: z.array(documentCategoryShape).min(1, "At least one category"),
  designationIds: z.array(z.string().min(1)).catch([]),
});

export const accountSchema = z
  .object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    email: z.string().email("Valid email is required"),
    password: z.string().optional(),
    contactNumber: z.string().min(1, "Contact number is required"),
    image: z.string().optional(),
    designationId: z.string().min(1, "Designation is required"),
  })
  .refine(
    (data) => !data.password || data.password.trim() === "" || data.password.length >= 6,
    {
      message: "Password must be at least 6 characters",
      path: ["password"],
    }
  )
  .transform((data) => ({
    ...data,
    password: data.password && data.password.trim() !== "" ? data.password : undefined,
  }));

export const documentSchema = z.object({
  fileCategoryId: z.string().min(1, "File category is required"),
  attachments: z
    .array(z.string())
    .min(1, "An attachment is required")
    .max(1, "Only one attachment is allowed"),
  remarks: z.string().optional(),
  fileDate: z.string().min(1, "File date is required"),
  priority: z.enum(["Low", "Medium", "High"]),
  assignatories: z
    .union([z.array(z.string().min(1)), z.tuple([] as const)])
    .transform((val) => (Array.isArray(val) ? [...val] : [])),
});
