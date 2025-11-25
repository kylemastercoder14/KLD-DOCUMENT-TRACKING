"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowRight, Eye, EyeOff, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useActionState } from "react";
import { FormState, initialState, initialTwoFactorState } from "@/lib/utils";
import { loginAction, verifyTwoFactorAction } from "@/actions/auth";
import { useFormStatus } from "react-dom";
import { Label } from "@/components/ui/label";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="primary"
      className="w-full h-11 text-base font-medium transition-all"
      disabled={pending}
    >
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Signing in...
        </>
      ) : (
        <>
          Sign In
          <ArrowRight className="ml-2 h-4 w-4" />
        </>
      )}
    </Button>
  );
}

function TwoFactorSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="primary"
      className="w-full h-11 text-base font-medium transition-all"
      disabled={pending}
    >
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Verifying...
        </>
      ) : (
        <>
          Verify & Sign In
          <ArrowRight className="ml-2 h-4 w-4" />
        </>
      )}
    </Button>
  );
}

const Page = () => {
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const [state, formAction] = useActionState<FormState, FormData>(
    loginAction,
    initialState
  );
  const [twoFactorState, twoFactorAction] = useActionState(
    verifyTwoFactorAction,
    initialTwoFactorState
  );

  React.useEffect(() => {
    if (state?.success) {
      setIsRedirecting(true);
      const timer = setTimeout(() => {
        router.push(state.redirect!);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [state, router]);

  React.useEffect(() => {
    if (twoFactorState?.success && twoFactorState.redirect) {
      setIsRedirecting(true);
      const timer = setTimeout(() => {
        router.push(twoFactorState.redirect!);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [twoFactorState, router]);

  return (
    <div className="mt-10">
      {isRedirecting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-lg font-medium">
              Redirecting to your dashboard...
            </p>
          </div>
        </div>
      )}
      {!state?.twoFactorRequired && (
        <form action={formAction} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email">
              Email Address <span className="text-destructive">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              name="email"
              placeholder="email@kld.edu.ph"
              required
              className="h-11"
            />
            {state?.errors?.email && (
              <p className="text-sm text-red-500">{state.errors.email[0]}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">
              Password <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                required
                className="h-11"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
            {state?.errors?.password && (
              <p className="text-sm text-red-500">{state.errors.password[0]}</p>
            )}
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Checkbox id="remember" name="remember" className="rounded-none" />
              <Label
                htmlFor="remember"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Remember Me
              </Label>
            </div>
            <a
              href="/forgot-password"
              className="text-sm font-medium text-primary hover:underline"
            >
              Forgot password?
            </a>
          </div>

          <SubmitButton />
        </form>
      )}

      {state?.twoFactorRequired && (
        <div className="mt-6 space-y-4 rounded-xl border bg-muted/40 p-5">
          <div>
            <h3 className="text-lg font-semibold">Two-Factor Authentication</h3>
            <p className="text-sm text-muted-foreground">
              {state.twoFactorEmail
                ? `Enter the authentication code from your authenticator app for ${state.twoFactorEmail}.`
                : "Enter the authentication code from your authenticator app."}
            </p>
          </div>
          <form action={twoFactorAction} className="space-y-4">
            <input
              type="hidden"
              name="userId"
              value={state.twoFactorUserId ?? ""}
            />
            <input
              type="hidden"
              name="remember"
              value={state.twoFactorRemember ? "true" : "false"}
            />
            <div className="space-y-2">
              <Label htmlFor="token">
                Authentication Code <span className="text-destructive">*</span>
              </Label>
              <Input
                id="token"
                name="token"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={10}
                placeholder="000000"
                className="h-11 text-center text-2xl tracking-widest font-mono"
                required
              />
              {twoFactorState?.errors?.token && (
                <p className="text-sm text-red-500">
                  {twoFactorState.errors.token[0]}
                </p>
              )}
            </div>
            {twoFactorState?.message && !twoFactorState?.success && (
              <p className="text-sm text-muted-foreground">
                {twoFactorState.message}
              </p>
            )}
            <TwoFactorSubmitButton />
          </form>
        </div>
      )}

      <div className="text-center text-sm mt-5 text-muted-foreground">
        <p>Don&apos;t have an account? Contact your administrator</p>
      </div>
    </div>
  );
};

export default Page;
