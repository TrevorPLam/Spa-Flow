import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useSearchParams, Link } from "wouter";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Waves, ArrowLeft, CheckCircle2 } from "lucide-react";

const confirmResetSchema = z.object({
  token: z.string().min(1, "Reset token is required"),
  newPassword: z.string()
    .min(15, "Password must be at least 15 characters long")
    .max(64, "Password must be no more than 64 characters long"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type ConfirmResetForm = z.infer<typeof confirmResetSchema>;

export default function PasswordResetConfirmPage() {
  const [searchParams] = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const form = useForm<ConfirmResetForm>({
    resolver: zodResolver(confirmResetSchema),
    defaultValues: { 
      token: searchParams.get("token") || "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  // Update token field when URL parameter changes
  useEffect(() => {
    const token = searchParams.get("token");
    if (token) {
      form.setValue("token", token);
    }
  }, [searchParams, form]);

  async function onSubmit(values: ConfirmResetForm) {
    setError(null);
    setIsPending(true);
    try {
      const response = await fetch("/auth/password-reset/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: values.token,
          newPassword: values.newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to reset password");
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset password");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left panel */}
      <div className="hidden lg:flex w-1/2 bg-sidebar items-center justify-center p-16">
        <div className="max-w-xs text-center">
          <div className="w-20 h-20 bg-primary/20 rounded-2xl flex items-center justify-center mx-auto mb-8">
            <Waves size={40} className="text-sidebar-foreground/80" />
          </div>
          <h1 className="text-3xl font-bold text-sidebar-foreground mb-4">SpaFlow</h1>
          <p className="text-sidebar-foreground/60 text-sm leading-relaxed">
            The spa management system that keeps your front desk calm and in control — even on the busiest days.
          </p>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <Waves size={20} className="text-primary" />
            </div>
            <span className="text-xl font-bold text-foreground">SpaFlow</span>
          </div>

          <Link href="/login" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6">
            <ArrowLeft size={16} className="mr-2" />
            Back to sign in
          </Link>

          {!success ? (
            <>
              <h2 className="text-2xl font-bold text-foreground mb-1">Set new password</h2>
              <p className="text-muted-foreground text-sm mb-8">
                Enter your new password below. Passwords must be at least 15 characters long.
              </p>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="token"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Reset Token</FormLabel>
                        <FormControl>
                          <Input
                            data-testid="input-token"
                            type="text"
                            placeholder="Enter your reset token"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="newPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>New Password</FormLabel>
                        <FormControl>
                          <Input
                            data-testid="input-new-password"
                            type="password"
                            placeholder="At least 15 characters"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm Password</FormLabel>
                        <FormControl>
                          <Input
                            data-testid="input-confirm-password"
                            type="password"
                            placeholder="Confirm your password"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {error && (
                    <p data-testid="text-error" className="text-sm text-destructive">{error}</p>
                  )}

                  <Button
                    data-testid="button-submit"
                    type="submit"
                    className="w-full"
                    disabled={isPending}
                  >
                    {isPending ? "Resetting..." : "Reset password"}
                  </Button>
                </form>
              </Form>

              <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground">
                  <strong>Password Requirements (NIST 2025):</strong>
                </p>
                <ul className="text-xs text-muted-foreground mt-2 space-y-1">
                  <li>• Minimum 15 characters</li>
                  <li>• Maximum 64 characters</li>
                  <li>• No mandatory complexity rules (uppercase, numbers, symbols)</li>
                  <li>• Use a long passphrase for best security</li>
                </ul>
              </div>
            </>
          ) : (
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 size={32} className="text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Password reset successful</h2>
              <p className="text-muted-foreground text-sm mb-8">
                Your password has been reset successfully. All existing sessions have been invalidated.
              </p>
              <Link href="/login">
                <Button className="w-full">
                  Sign in with new password
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
