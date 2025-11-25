/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { FormState, TwoFactorFormState } from "@/lib/utils";
import z from "zod";
import prisma from "@/lib/prisma";
import { ROLE_CONFIG, UserRole } from "@/lib/config";
import { logSystemAction } from "@/lib/system-log";
import { getServerSession } from "@/lib/session";
import { verifyTwoFactorToken, verifyBackupCode } from "@/actions/two-factor";

const JWT_SECRET = process.env.JWT_SECRET || "supersecret";

const loginSchema = z.object({
  email: z.email({ message: "Please enter a valid KLD email." }),
  password: z.string().min(1, { message: "Password is required." }),
  remember: z.boolean().default(false),
});

export async function setAuthCookie(
  user: { id: string; role: UserRole },
  remember: boolean
) {
  const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, {
    expiresIn: remember ? "30d" : "1d",
  });

  (await cookies()).set("kld-document-tracking-auth-session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: remember ? 30 * 24 * 60 * 60 : 24 * 60 * 60,
  });
}

export async function loginAction(
  prevState: any,
  formData: FormData
): Promise<FormState> {
  try {
    const validatedFields = loginSchema.safeParse({
      email: formData.get("email"),
      password: formData.get("password"),
      remember: formData.get("remember") === "on",
    });

    if (!validatedFields.success) {
      return {
        errors: validatedFields.error.flatten().fieldErrors,
        message: "Missing Fields. Failed to Login.",
      };
    }

    const { email, password, remember } = validatedFields.data;

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return {
        errors: { email: ["Invalid KLD email or password"] },
        message: "Invalid credentials",
      };
    }

    const passwordMatch = password === user.password;

    if (!passwordMatch) {
      return {
        errors: { password: ["Invalid password"] },
        message: "Invalid credentials",
      };
    }

    if (!user.isActive) {
      return {
        errors: { email: ["Account is not active"] },
        message:
          "Your account is not active. Please contact the administrator.",
      };
    }

    // Check if role exists and is valid
    if (!user.role) {
      return {
        errors: { email: ["User role not found"] },
        message:
          "Your account configuration is invalid. Please contact the administrator.",
      };
    }

    // Check if role name matches a valid role in ROLE_CONFIG
    const roleName = user.role;
    const roleConfig = ROLE_CONFIG[roleName as UserRole];

    if (!roleConfig) {
      console.error(
        `Invalid role: ${roleName}. Valid role: ${Object.keys(ROLE_CONFIG).join(
          ", "
        )}`
      );
      return {
        errors: { email: ["Invalid user role configuration"] },
        message:
          "Your account role is not properly configured. Please contact the administrator.",
      };
    }

    if (user.twoFactorEnabled) {
      return {
        success: false,
        message: "Two-factor authentication required. Enter the code from your authenticator app.",
        twoFactorRequired: true,
        twoFactorUserId: user.id,
        twoFactorRemember: remember ?? false,
        twoFactorEmail: user.email,
      };
    }

    await setAuthCookie({ id: user.id, role: roleName }, remember ?? false);

    await logSystemAction({
      userId: user.id,
      action: "Login",
      status: "Success",
      details: "User logged in",
    });

    // Get redirect URL from form data if it exists
    const redirectUrl = formData.get("redirect")?.toString() || "";

    // Default to role-specific dashboard
    let finalRedirect: (typeof ROLE_CONFIG)[UserRole]["dashboard"] =
      roleConfig.dashboard;

    // Use redirect URL only if it's valid for the user's role and matches a known dashboard
    if (redirectUrl && redirectUrl === roleConfig.dashboard) {
      finalRedirect =
        redirectUrl as (typeof ROLE_CONFIG)[UserRole]["dashboard"];
    }

    return {
      success: true,
      message: "Login successful",
      user: { role: user.role.name, id: user.id },
      redirect: finalRedirect,
    };
  } catch (error) {
    console.error("Login error:", error);
    return {
      message: "An error occurred while logging in",
      errors: {},
    };
  }
}

const twoFactorLoginSchema = z.object({
  userId: z.string().min(1),
  token: z.string().min(4, { message: "Authentication code is required" }),
  remember: z.string().optional(),
});

export async function verifyTwoFactorAction(
  prevState: TwoFactorFormState,
  formData: FormData
): Promise<TwoFactorFormState> {
  try {
    const validated = twoFactorLoginSchema.safeParse({
      userId: formData.get("userId"),
      token: formData.get("token"),
      remember: formData.get("remember"),
    });

    if (!validated.success) {
      return {
        errors: {
          token: validated.error.errors
            .filter((err) => err.path?.[0] === "token")
            .map((err) => err.message),
        },
        message: "Invalid authentication code",
      };
    }

    const { userId, token, remember } = validated.data;
    const normalizedToken = token.replace(/\s+/g, "");
    const rememberBool = remember === "true";

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return {
        message: "User not found. Please try signing in again.",
      };
    }

    if (!user.twoFactorEnabled) {
      return {
        message: "Two-factor authentication is not enabled for this account.",
      };
    }

    let verified = await verifyTwoFactorToken(normalizedToken, userId);

    if (!verified) {
      verified = await verifyBackupCode(normalizedToken, userId);
    }

    if (!verified) {
      return {
        errors: {
          token: ["Invalid authentication code. Please try again."],
        },
        message: "Invalid authentication code. Please try again.",
      };
    }

    const roleName = user.role;
    const roleConfig = ROLE_CONFIG[roleName as UserRole];

    if (!roleConfig) {
      return {
        message: "Your account role is not properly configured. Please contact the administrator.",
      };
    }

    await setAuthCookie({ id: user.id, role: roleName }, rememberBool);

    await logSystemAction({
      userId: user.id,
      action: "Login",
      status: "Success",
      details: "User logged in with 2FA",
    });

    return {
      success: true,
      message: "Login successful",
      redirect: roleConfig.dashboard,
    };
  } catch (error) {
    console.error("Two-factor verification error:", error);
    return {
      message: "An error occurred while verifying two-factor authentication",
    };
  }
}

export async function logoutAction() {
  try {
    const currentUser = await getServerSession();
    const cookieStore = await cookies();

    // Clear the session cookie
    cookieStore.delete("kld-document-tracking-auth-session");

    if (currentUser?.id) {
      await logSystemAction({
        userId: currentUser.id,
        action: "Logout",
        status: "Success",
        details: "User logged out",
      });
    }

    return {
      success: true,
      message: "Logout successful",
      redirect: "/login",
    };
  } catch (error) {
    console.error("Logout error:", error);
    return {
      success: false,
      message: "An error occurred while logging out",
    };
  }
}
