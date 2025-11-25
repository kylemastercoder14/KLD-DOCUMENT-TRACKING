"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Shield,
  CheckCircle2,
  XCircle,
  Copy,
  Download,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  generateTwoFactorSecret,
  verifyAndEnableTwoFactor,
  disableTwoFactor,
  getTwoFactorStatus,
  regenerateBackupCodes,
} from "@/actions/two-factor";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

export function TwoFactorSetup() {
  const queryClient = useQueryClient();
  const [verificationCode, setVerificationCode] = useState("");
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [step, setStep] = useState<"idle" | "generating" | "verifying" | "enabled">("idle");

  const { data: status, isLoading } = useQuery({
    queryKey: ["two-factor-status"],
    queryFn: getTwoFactorStatus,
  });

  const generateSecretMutation = useMutation({
    mutationFn: generateTwoFactorSecret,
    onSuccess: () => {
      setStep("verifying");
      queryClient.invalidateQueries({ queryKey: ["two-factor-status"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to generate 2FA secret");
    },
  });

  const verifyMutation = useMutation({
    mutationFn: verifyAndEnableTwoFactor,
    onSuccess: (data) => {
      setBackupCodes(data.backupCodes);
      setShowBackupCodes(true);
      setStep("enabled");
      queryClient.invalidateQueries({ queryKey: ["two-factor-status"] });
      toast.success("2FA enabled successfully!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Invalid verification code");
    },
  });

  const disableMutation = useMutation({
    mutationFn: disableTwoFactor,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["two-factor-status"] });
      setStep("idle");
      setVerificationCode("");
      toast.success("2FA disabled successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to disable 2FA");
    },
  });

  const regenerateCodesMutation = useMutation({
    mutationFn: regenerateBackupCodes,
    onSuccess: (data) => {
      setBackupCodes(data.backupCodes);
      setShowBackupCodes(true);
      toast.success("Backup codes regenerated");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to regenerate backup codes");
    },
  });

  const handleGenerate = () => {
    setStep("generating");
    generateSecretMutation.mutate();
  };

  const handleVerify = () => {
    if (!verificationCode || verificationCode.length !== 6) {
      toast.error("Please enter a 6-digit code");
      return;
    }
    verifyMutation.mutate(verificationCode);
  };

  const handleCopyBackupCodes = () => {
    const codesText = backupCodes.join("\n");
    navigator.clipboard.writeText(codesText);
    toast.success("Backup codes copied to clipboard");
  };

  const handleDownloadBackupCodes = () => {
    const codesText = backupCodes.join("\n");
    const blob = new Blob([codesText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "2fa-backup-codes.txt";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Backup codes downloaded");
  };

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (status?.enabled) {
    return (
      <div className="space-y-4">
        <Alert className="border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-800 dark:text-green-400">
            Two-Factor Authentication Enabled
          </AlertTitle>
          <AlertDescription className="text-green-700 dark:text-green-500/90">
            Your account is protected with two-factor authentication. You&apos;ll need to enter a
            code from your authenticator app when signing in.
          </AlertDescription>
        </Alert>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => regenerateCodesMutation.mutate()}
            disabled={regenerateCodesMutation.isPending}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Regenerate Backup Codes
          </Button>
          <Button
            variant="destructive"
            onClick={() => disableMutation.mutate()}
            disabled={disableMutation.isPending}
          >
            <XCircle className="h-4 w-4 mr-2" />
            Disable 2FA
          </Button>
        </div>

        {/* Backup Codes Dialog */}
        <Dialog open={showBackupCodes} onOpenChange={setShowBackupCodes}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Save Your Backup Codes</DialogTitle>
              <DialogDescription>
                These codes can be used to access your account if you lose your authenticator
                device. Save them in a safe place.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Each code can only be used once. Store them securely.
                </AlertDescription>
              </Alert>
              <div className="grid grid-cols-2 gap-2 p-4 bg-muted rounded-lg">
                {backupCodes.map((code, index) => (
                  <code
                    key={index}
                    className="text-sm font-mono text-center p-2 bg-background rounded border"
                  >
                    {code}
                  </code>
                ))}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleCopyBackupCodes} className="flex-1">
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </Button>
                <Button variant="outline" onClick={handleDownloadBackupCodes} className="flex-1">
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>
              <Button onClick={() => setShowBackupCodes(false)} className="w-full">
                I&apos;ve Saved These Codes
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  if (step === "generating" || generateSecretMutation.isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (step === "verifying" && generateSecretMutation.data) {
    const { qrCode, manualEntryKey } = generateSecretMutation.data;

    return (
      <div className="space-y-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Scan QR Code</AlertTitle>
          <AlertDescription>
            Open your authenticator app (Google Authenticator, Microsoft Authenticator, etc.) and
            scan this QR code.
          </AlertDescription>
        </Alert>

        <div className="flex flex-col items-center gap-4">
          <div className="border-2 border-dashed rounded-lg p-4 bg-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrCode}
              alt="2FA QR Code"
              className="w-64 h-64 mx-auto"
            />
          </div>

          <div className="w-full space-y-2">
            <Label>Can&apos;t scan? Enter this code manually:</Label>
            <div className="flex items-center gap-2">
              <Input
                value={manualEntryKey}
                readOnly
                className="font-mono text-sm"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  navigator.clipboard.writeText(manualEntryKey);
                  toast.success("Code copied to clipboard");
                }}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="w-full space-y-2">
            <Label>Enter verification code from your app:</Label>
            <Input
              type="text"
              placeholder="000000"
              maxLength={6}
              value={verificationCode}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, "").slice(0, 6);
                setVerificationCode(value);
              }}
              className="text-center text-2xl font-mono tracking-widest"
            />
            <p className="text-xs text-muted-foreground text-center">
              Enter the 6-digit code from your authenticator app
            </p>
          </div>

          <div className="flex gap-2 w-full">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                setStep("idle");
                setVerificationCode("");
              }}
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={handleVerify}
              disabled={verificationCode.length !== 6 || verifyMutation.isPending}
            >
              {verifyMutation.isPending ? "Verifying..." : "Verify & Enable"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertTitle>Two-Factor Authentication</AlertTitle>
        <AlertDescription>
          Add an extra layer of security to your account. You&apos;ll need to enter a code from
          your authenticator app when signing in.
        </AlertDescription>
      </Alert>

      <div className="flex items-center justify-between rounded-xl border bg-muted/40 px-4 py-3">
        <div>
          <p className="font-semibold">Two-Factor Authentication</p>
          <p className="text-sm text-muted-foreground">
            Add an extra layer of security to your account.
          </p>
        </div>
        <Button onClick={handleGenerate} disabled={generateSecretMutation.isPending}>
          <Shield className="h-4 w-4 mr-2" />
          Enable 2FA
        </Button>
      </div>
    </div>
  );
}

