import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Pencil } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const specialEventSchema = z.object({
  name: z.string().min(1, "Name is required"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  disableSpecials: z.boolean().default(true),
});

type SpecialEventForm = z.infer<typeof specialEventSchema>;

interface SpecialEvent {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  disableSpecials: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function SettingsPage() {
  const { isManager } = useAuth();
  const { toast } = useToast();
  const [events, setEvents] = useState<SpecialEvent[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<SpecialEvent | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteEventId, setDeleteEventId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const form = useForm<SpecialEventForm>({
    resolver: zodResolver(specialEventSchema),
    defaultValues: { name: "", startDate: "", endDate: "", disableSpecials: true },
  });

  // Fetch special events
  const fetchEvents = async () => {
    if (!isManager) return;
    try {
      const response = await fetch("/api/v1/config/special-events", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      if (response.ok) {
        const data = await response.json();
        setEvents(data);
      }
    } catch (error) {
      console.error("Failed to fetch special events", error);
    }
  };

  // Load events on mount
  useState(() => {
    if (isManager) fetchEvents();
  });

  function openNew() {
    form.reset({ name: "", startDate: "", endDate: "", disableSpecials: true });
    setEditingEvent(null);
    setShowForm(true);
  }

  function openEdit(event: SpecialEvent) {
    form.reset({
      name: event.name,
      startDate: event.startDate,
      endDate: event.endDate,
      disableSpecials: event.disableSpecials,
    });
    setEditingEvent(event);
    setShowForm(true);
  }

  async function onSubmit(values: SpecialEventForm) {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const url = editingEvent
        ? `/api/v1/config/special-events/${editingEvent.id}`
        : "/api/v1/config/special-events";
      const method = editingEvent ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(values),
      });

      if (response.ok) {
        toast({ title: editingEvent ? "Event updated" : "Event created" });
        await fetchEvents();
        setShowForm(false);
      } else {
        toast({ title: "Failed to save event", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Failed to save event", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!deleteEventId) return;
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/v1/config/special-events/${deleteEventId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        toast({ title: "Event deleted" });
        await fetchEvents();
        setShowDeleteConfirm(false);
      } else {
        toast({ title: "Failed to delete event", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Failed to delete event", variant: "destructive" });
    } finally {
      setLoading(false);
      setDeleteEventId(null);
    }
  }

  if (!isManager) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <p className="text-muted-foreground">Manager access required</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
            <p className="text-muted-foreground">Manage system configuration and special events</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Special Events</CardTitle>
                <CardDescription>Manage holidays and special events that disable pricing specials</CardDescription>
              </div>
              <Button onClick={openNew}>
                <Plus className="mr-2 h-4 w-4" />
                Add Event
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {events.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No special events configured</p>
            ) : (
              <div className="space-y-4">
                {events.map((event) => (
                  <div key={event.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{event.name}</h3>
                        {event.disableSpecials && (
                          <Badge variant="secondary">Disables Specials</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(event.startDate), "MMM d, yyyy")} - {format(new Date(event.endDate), "MMM d, yyyy")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(event)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setDeleteEventId(event.id);
                          setShowDeleteConfirm(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingEvent ? "Edit Special Event" : "Add Special Event"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Event Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Christmas Holiday" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="disableSpecials"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Disable Specials</FormLabel>
                      <p className="text-sm text-muted-foreground">
                        Disable birthday and 18-24 pricing specials during this event
                      </p>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? "Saving..." : editingEvent ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Special Event</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this special event? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={loading}>
              {loading ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
