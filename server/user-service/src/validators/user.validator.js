import { z } from "zod";
export const registerProfileSchema = z.object({
  userId: z.string().uuid(),
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name cannot exceed 100 characters"),
  email: z.string().email(),
  // ADMIN removed to prevent self-registration as admin
  role: z.enum(["STUDENT", "INSTRUCTOR", ""]),
});
export const approvalSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
});
export const completeProfileSchema = z.discriminatedUnion("role", [
  // STUDENT
  z.object({
    role: z.literal("STUDENT"),
    university: z
      .string()
      .min(2, "University must be at least 2 characters")
      .max(50, "University cannot exceed 50 characters"),
    rollNo: z.string().regex(/^\d{4}-[A-Z]{2,5}-\d{1,4}$/, {
      message: "Roll number must be in format 2024-CS-44",
    }),
    batch: z.coerce
      .number()

      .int("Batch must be a valid year")

      .min(
        2000,

        "Batch year is too old"
      )

      .max(
        2100,

        "Batch year is invalid"
      ),

    department: z
      .string()

      .min(
        2,

        "Department must be at least 2 characters"
      )

      .max(
        100,

        "Department cannot exceed 100 characters"
      ),

    degreeProgram: z
      .string()

      .min(
        2,

        "Degree program must be at least 2 characters"
      )

      .max(
        100,

        "Degree program cannot exceed 100 characters"
      )

      .optional(),
  }),

  // INSTRUCTOR
  z.object({
    role: z.literal("INSTRUCTOR"),
    employeeId: z.string().min(2).max(50),
    department: z.string().min(2).max(100),
  }),

  // ADMIN
  z.object({
    role: z.literal("ADMIN"),
    university: z.string().min(2).max(50),
  }),
]);
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().optional(),
});
