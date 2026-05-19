import { useState } from "react";
import {
  useListUsers,
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
  getListUsersQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { UserCog, Plus, Trash2, Pencil } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const userSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  password: z.string().min(6).optional().or(z.literal("")),
  role: z.enum(["STAFF", "MANAGER"]),
});

type UserForm = z.infer<typeof userSchema>;

export default function UsersPage() {
  const { isManager, user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [editingUser, setEditingUser] = useState<{ id: number } | null>(null);
  const [showForm, setShowForm] = useState(false);

  const { data: users = [], isLoading } = useListUsers({ query: { queryKey: getListUsersQueryKey() } });
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();

  const form = useForm<UserForm>({
    resolver: zodResolver(userSchema),
    defaultValues: { email: "", name: "", password: "", role: "STAFF" },
  });

  function openNew() {
    form.reset({ email: "", name: "", password: "", role: "STAFF" });
    setEditingUser(null);
    setShowForm(true);
  }

  function openEdit(u: typeof users[0]) {
    form.reset({ email: u.email, name: u.name, password: "", role: u.role as "STAFF" | "MANAGER" });
    setEditingUser({ id: u.id });
    setShowForm(true);
  }

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
  }

  async function onSubmit(values: UserForm) {
    if (editingUser) {
      const updateData: { name?: string; role?: "STAFF" | "MANAGER"; password?: string } = { name: values.name, role: values.role };
      if (values.password) updateData.password = values.password;
      updateUser.mutate({ id: editingUser.id, data: updateData }, {
        onSuccess: () => { toast({ title: "User updated" }); invalidate(); setShowForm(false); },
        onError: () => toast({ title: "Failed to update", variant: "destructive" }),
      });
    } else {
      createUser.mutate({ data: { email: values.email, name: values.name, password: values.password ?? "", role: values.role } }, {
        onSuccess: () => { toast({ title: "User created" }); invalidate(); setShowForm(false); },
        onError: () => toast({ title: "Failed to create", variant: "destructive" }),
      });
    }
  }

  if (!isManager) {
    return <Layout><div className="p-8 text-muted-foreground">Access denied — manager role required</div></Layout>;
  }

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><UserCog size={20} />Staff</h1>
            <p className="text-sm text-muted-foreground">{users.length} users</p>
          </div>
          <Button data-testid="button-new-user" size="sm" onClick={openNew} className="gap-2">
            <Plus size={16} />New User
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center text-sm text-muted-foreground">Loading...</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-6 py-3 text-muted-foreground font-medium">Name</th>
                    <th className="text-left px-6 py-3 text-muted-foreground font-medium">Email</th>
                    <th className="text-left px-6 py-3 text-muted-foreground font-medium">Role</th>
                    <th className="text-left px-6 py-3 text-muted-foreground font-medium">Created</th>
                    <th className="px-6 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {users.map(u => (
                    <tr key={u.id} data-testid={`row-user-${u.id}`}>
                      <td className="px-6 py-4 font-medium">
                        {u.name}
                        {u.id === currentUser?.id && <Badge variant="secondary" className="ml-2 text-xs">You</Badge>}
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">{u.email}</td>
                      <td className="px-6 py-4">
                        <Badge variant={u.role === "MANAGER" ? "default" : "secondary"}>{u.role}</Badge>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground text-xs">{format(new Date(u.createdAt), "MMM d, yyyy")}</td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2 justify-end">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(u)}><Pencil size={14} /></Button>
                          <Button
                            data-testid={`button-delete-user-${u.id}`}
                            variant="ghost"
                            size="sm"
                            disabled={u.id === currentUser?.id}
                            onClick={() => deleteUser.mutate({ id: u.id }, {
                              onSuccess: () => { toast({ title: "User deleted" }); invalidate(); },
                            })}
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingUser ? "Edit User" : "New User"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem><FormLabel>Name</FormLabel><FormControl><Input data-testid="input-user-name" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              {!editingUser && (
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem><FormLabel>Email</FormLabel><FormControl><Input data-testid="input-user-email" type="email" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              )}
              <FormField control={form.control} name="password" render={({ field }) => (
                <FormItem>
                  <FormLabel>{editingUser ? "New Password (leave blank to keep)" : "Password"}</FormLabel>
                  <FormControl><Input data-testid="input-user-password" type="password" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="role" render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger data-testid="select-user-role"><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="STAFF">Staff</SelectItem>
                      <SelectItem value="MANAGER">Manager</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <DialogFooter>
                <Button type="submit" disabled={createUser.isPending || updateUser.isPending}>
                  {editingUser ? "Save" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
