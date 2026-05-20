import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "wouter";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Waves, ArrowLeft, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const requestResetSchema = z.object({
  email: z.string().email("Valid email required"),
});

type RequestResetForm = z.infer<typeof requestResetSchema>;

export default function PasswordResetRequestPage() {
  const { toast } = useToast();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const form = useForm<RequestResetForm>({
    resolver: zodResolver(requestResetSchema),
    defaultValues: { email: "" },
  });

  async function onSubmit(values: RequestResetForm) {
    setError(null);
    setIsPending(true);
    try {
      const response = await fetch("/auth/password-reset/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to request password reset");
      }

      setSuccess(true);
      toast({
        title: "Password reset email sent",
        description: "Check your email for password reset instructions",
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to request password reset";
      setError(errorMessage);
      toast({
        variant: "destructive",
        title: "Password reset failed",
        description: errorMessage,
      });
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
              <h2 className="text-2xl font-bold text-foreground mb-1">Reset password</h2>
              <p className="text-muted-foreground text-sm mb-8">
                Enter your email address and we'll send you a link to reset your password.
              </p>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input
                            data-testid="input-email"
                            type="email"
                            placeholder="you@spaflow.com"
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
                    {isPending ? "Sending..." : "Send reset link"}
                  </Button>
                </form>
              </Form>
            </>
          ) : (
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Mail size={32} className="text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Check your email</h2>
              <p className="text-muted-foreground text-sm mb-8">
                If an account with that email exists, we've sent a password reset link to your inbox.
              </p>
              <Link href="/login">
                <Button variant="outline" className="w-full">
                  Back to sign in
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
