"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import Heading from "@/components/heading";
import { SignaturePad } from "./signature-pad";
import { TwoFactorSetup } from "./two-factor-setup";
import { ProfileForm } from "./profile-form";
import { ChangePasswordForm } from "./change-password-form";
import { Lock, PenTool } from "lucide-react";

export const SettingsClient = () => {
  const [tab, setTab] = useState("general");

  return (
    <div className="space-y-6">
      <Heading
        title="Settings"
        description="Manage your account settings and system preferences."
      />

      <Tabs value={tab} onValueChange={setTab} className="space-y-6">
        <TabsList className="bg-muted/60 w-full sm:w-fit justify-start">
          <TabsTrigger value="general" className="flex-1">
            General
          </TabsTrigger>
          <TabsTrigger value="signature" className="flex-1">
            E-Signature
          </TabsTrigger>
          <TabsTrigger value="security" className="flex-1">
            Security & Access
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <Card className="bg-card/70">
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                Update your profile details and public information.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ProfileForm />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="signature">
          <Card className="bg-card/70">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PenTool className="size-4 text-[#2E845F]" />
                Digital Signature
              </CardTitle>
              <CardDescription>
                Create or upload your official e-signature for document
                approval.
                <span className="text-amber-600 font-medium mt-1 flex items-center gap-1">
                  <Lock className="h-3 w-3" /> Secured with a passcode
                  prevention.
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <SignaturePad />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card className="bg-card/70">
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>
                Manage your password and session settings.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <ChangePasswordForm />
            </CardContent>
          </Card>

          <Card className="bg-card/70">
            <CardHeader>
              <CardTitle>Two-Factor Authentication</CardTitle>
              <CardDescription>
                Add an extra layer of security to your account.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TwoFactorSetup />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
