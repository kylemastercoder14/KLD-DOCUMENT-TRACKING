import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type FormState = {
  errors?: {
    email?: string[];
    password?: string[];
    remember?: string[];
    token?: string[];
  };
  message: string;
  success?: boolean;
  redirect?: string;
  user?: {
    role: string;
    id: string;
  };
  twoFactorRequired?: boolean;
  twoFactorUserId?: string;
  twoFactorRemember?: boolean;
  twoFactorEmail?: string;
};

export const initialState: FormState = {
  errors: {},
  message: "",
  success: false,
};

export type TwoFactorFormState = {
  errors?: {
    token?: string[];
  };
  message: string;
  success?: boolean;
  redirect?: string;
};

export const initialTwoFactorState: TwoFactorFormState = {
  errors: {},
  message: "",
  success: false,
};
