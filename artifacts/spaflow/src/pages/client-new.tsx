import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCreateClient, getListClientsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout/Layout";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, Lock } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

const schema = z.object({
  name: z.string().min(1, "Name required"),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  membershipStatus: z.enum(["none", "one_time", "six_month"]),
  dob: z.string().optional(),
  address: z.string().optional(),
  documentNumber: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function ClientNewPage() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const createClient = useCreateClient();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      membershipStatus: "none",
      dob: "",
      address: "",
      documentNumber: "",
      notes: "",
    },
  });

  async function onSubmit(values: FormValues) {
    createClient.mutate({
      data: {
        name: values.name,
        email: values.email || undefined,
        phone: values.phone || undefined,
        membershipStatus: values.membershipStatus,
        dob: values.dob || undefined,
        address: values.address || undefined,
        documentNumber: values.documentNumber || undefined,
        notes: values.notes || undefined,
      },
    }, {
      onSuccess: (client) => {
        toast({ title: "Client created" });
        queryClient.invalidateQueries({ queryKey: getListClientsQueryKey({}) });
        setLocation(`/clients/${client.id}`);
      },
      onError: () => toast({ title: "Failed to create client", variant: "destructive" }),
    });
  }

  return (
    <Layout>
      <div className="p-6 max-w-2xl space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/clients">
            <a className="text-muted-foreground hover:text-foreground transition-colors">
              <ChevronLeft size={20} />
            </a>
          </Link>
          <h1 className="text-2xl font-bold">New Client</h1>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Basic Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name *</FormLabel>
                    <FormControl><Input data-testid="input-name" placeholder="Jane Smith" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl><Input data-testid="input-email" type="email" placeholder="jane@example.com" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="phone" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl><Input data-testid="input-phone" placeholder="+1 (555) 000-0000" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="membershipStatus" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Membership</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-membership">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="one_time">One-time</SelectItem>
                        <SelectItem value="six_month">6-month</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="notes" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl><Textarea data-testid="input-notes" placeholder="Any relevant notes..." {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  Identification
                  <Badge variant="secondary" className="gap-1">
                    <Lock size={10} />
                    Encrypted at rest
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField control={form.control} name="dob" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date of Birth</FormLabel>
                    <FormControl><Input data-testid="input-dob" type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="address" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl><Input data-testid="input-address" placeholder="123 Main St, New York, NY 10001" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="documentNumber" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Document / ID Number</FormLabel>
                    <FormControl><Input data-testid="input-document" placeholder="Driver's license or passport #" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </CardContent>
            </Card>

            <div className="flex gap-3 justify-end">
              <Link href="/clients">
                <Button type="button" variant="outline">Cancel</Button>
              </Link>
              <Button data-testid="button-submit" type="submit" disabled={createClient.isPending}>
                {createClient.isPending ? "Creating..." : "Create Client"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </Layout>
  );
}
