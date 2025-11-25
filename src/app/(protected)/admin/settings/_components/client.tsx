"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import Heading from "@/components/heading";
import Image from "next/image";

const generalDefaults = {
  firstName: "Admin",
  lastName: "User",
  email: "admin@college.edu",
  role: "System Administrator",
  department: "Office of the President",
};

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
          <TabsTrigger value="notifications" className="flex-1">
            Notifications
          </TabsTrigger>
          <TabsTrigger value="security" className="flex-1">
            Security & Access
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <Card className="bg-card/70">
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Update your profile details and public information.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-4">
                  <div className="relative size-20 overflow-hidden rounded-full border">
                    <Image
                      src="https://avatar.iran.liara.run/public/10"
                      alt="Avatar"
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div>
                    <Button variant="outline" size="sm">
                      Change Avatar
                    </Button>
                    <p className="mt-1 text-xs text-muted-foreground">
                      JPG, GIF or PNG. Max size of 800K
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>First Name</Label>
                  <Input defaultValue={generalDefaults.firstName} />
                </div>
                <div className="space-y-2">
                  <Label>Last Name</Label>
                  <Input defaultValue={generalDefaults.lastName} />
                </div>
                <div className="space-y-2">
                  <Label>Email Address</Label>
                  <Input defaultValue={generalDefaults.email} disabled />
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Input defaultValue={generalDefaults.role} disabled />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Department / Office</Label>
                <Input defaultValue={generalDefaults.department} />
              </div>

              <div className="flex justify-end">
                <Button className="gap-2">
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="signature">
          <Card className="bg-card/70">
            <CardHeader>
              <CardTitle>Digital Signature</CardTitle>
              <CardDescription>
                Upload your official e-signature for document approval.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-2">
                <p className="text-sm font-semibold text-emerald-700">
                  Secured with passcode prevention.
                </p>
                <div className="rounded-xl border-2 border-dashed py-16 text-center text-sm text-muted-foreground bg-muted/40">
                  Click to upload signature
                </div>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Signature Passcode</Label>
                  <Input placeholder="Enter 4-6 digit PIN" type="password" />
                  <p className="text-xs text-muted-foreground">
                    This is separate from your account password.
                  </p>
                </div>
                <div className="rounded-xl border bg-amber-50 p-4 text-sm text-amber-700">
                  Your e-signature is encrypted. Even admins cannot view or use your signature
                  without this passcode.
                </div>
                <Button className="w-full">Save & Secure Signature</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card className="bg-card/70">
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>Choose how and when you want to be notified.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <p className="text-sm font-semibold text-muted-foreground">Email Notifications</p>
                {[
                  { label: "Document Updates", description: "Receive emails when document status changes" },
                  { label: "New Assignments", description: "Receive emails when a document is assigned to you" },
                  { label: "Weekly Digest", description: "Summary of weekly activities and pending tasks" },
                ].map((item, idx) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between rounded-xl border px-4 py-3"
                  >
                    <div>
                      <p className="font-medium">{item.label}</p>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </div>
                    <Switch defaultChecked={idx < 2} />
                  </div>
                ))}
              </div>
              <div className="flex justify-end">
                <Button>Save Preferences</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card className="bg-card/70">
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>Manage your password and session settings.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2 md:col-span-1">
                  <Label>Current Password</Label>
                  <Input type="password" placeholder="••••••••" />
                </div>
                <div className="space-y-2 md:col-span-1">
                  <Label>New Password</Label>
                  <Input type="password" placeholder="New password" />
                </div>
                <div className="space-y-2 md:col-span-1">
                  <Label>Confirm Password</Label>
                  <Input type="password" placeholder="Confirm new password" />
                </div>
              </div>

              <div className="rounded-xl border bg-muted/40 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">Two-Factor Authentication</p>
                  <p className="text-sm text-muted-foreground">
                    Add an extra layer of security to your account.
                  </p>
                </div>
                <Button variant="outline">Enable 2FA</Button>
              </div>

              <div className="flex justify-end">
                <Button className="gap-2">
                  Update Security
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

