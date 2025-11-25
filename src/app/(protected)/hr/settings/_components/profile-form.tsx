"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getCurrentUser, updateProfile, updateProfileImage } from "@/actions/user";
import { toast } from "sonner";
import { Upload, Loader2 } from "lucide-react";
import { useState } from "react";
import { upload } from "@/lib/upload";
import Image from "next/image";

const profileSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  contactNumber: z.string().min(1, "Contact number is required"),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export function ProfileForm() {
  const queryClient = useQueryClient();
  const [isUploading, setIsUploading] = useState(false);

  const { data: user, isLoading } = useQuery({
    queryKey: ["current-user"],
    queryFn: getCurrentUser,
  });

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      contactNumber: user?.contactNumber || "",
    },
    values: user
      ? {
          firstName: user.firstName,
          lastName: user.lastName,
          contactNumber: user.contactNumber,
        }
      : undefined,
  });

  const updateMutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["current-user"] });
      toast.success("Profile updated successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update profile");
    },
  });

  const imageMutation = useMutation({
    mutationFn: updateProfileImage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["current-user"] });
      toast.success("Profile image updated successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update profile image");
    },
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    // Validate file size (800KB)
    if (file.size > 800 * 1024) {
      toast.error("Image size must be less than 800KB");
      return;
    }

    setIsUploading(true);
    try {
      const result = await upload(file);
      imageMutation.mutate(result.url);
    } catch (error) {
      toast.error("Failed to upload image");
    } finally {
      setIsUploading(false);
      // Reset input
      e.target.value = "";
    }
  };

  const onSubmit = (values: ProfileFormValues) => {
    updateMutation.mutate(values);
  };

  if (isLoading) {
    return <div className="space-y-4">Loading...</div>;
  }

  const nameFallback = user
    ? `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`
    : "U";

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-4">
          <Avatar className="size-20">
            <AvatarImage src={user?.image || ""} alt={`${user?.firstName} ${user?.lastName}`} />
            <AvatarFallback className="text-lg">{nameFallback}</AvatarFallback>
          </Avatar>
          <div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => document.getElementById("avatar-upload")?.click()}
              disabled={isUploading || imageMutation.isPending}
            >
              {isUploading || imageMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Change Avatar
                </>
              )}
            </Button>
            <input
              id="avatar-upload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              JPG, GIF or PNG. Max size of 800KB
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="firstName">First Name</Label>
          <Input
            id="firstName"
            {...form.register("firstName")}
            disabled={updateMutation.isPending}
          />
          {form.formState.errors.firstName && (
            <p className="text-xs text-destructive">
              {form.formState.errors.firstName.message}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName">Last Name</Label>
          <Input
            id="lastName"
            {...form.register("lastName")}
            disabled={updateMutation.isPending}
          />
          {form.formState.errors.lastName && (
            <p className="text-xs text-destructive">
              {form.formState.errors.lastName.message}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email Address</Label>
          <Input id="email" value={user?.email || ""} disabled />
          <p className="text-xs text-muted-foreground">
            Email cannot be changed
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="role">Role</Label>
          <Input
            id="role"
            value={user?.role || ""}
            disabled
          />
          <p className="text-xs text-muted-foreground">
            Role cannot be changed
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="contactNumber">Contact Number</Label>
        <Input
          id="contactNumber"
          {...form.register("contactNumber")}
          disabled={updateMutation.isPending}
        />
        {form.formState.errors.contactNumber && (
          <p className="text-xs text-destructive">
            {form.formState.errors.contactNumber.message}
          </p>
        )}
      </div>

      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={updateMutation.isPending}
        >
          {updateMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            "Save Changes"
          )}
        </Button>
      </div>
    </form>
  );
}

