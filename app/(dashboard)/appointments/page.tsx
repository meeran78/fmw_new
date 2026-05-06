"use client";

import React, { useCallback, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { ACTIVE_APPOINTMENT_STATUSES } from "@/lib/appointment-scheduling";
import { SCHED_ZONE } from "@/lib/eastern-scheduling";
import { DateTime } from "luxon";

type AppointmentDoc = {
  $id: string;
  buyerUserId: string;
  sellerUserId: string;
  shopId: string;
  listingId?: string;
  startDatetime: string;
  endDatetime: string;
  status: string;
  notes?: string;
};

async function fetchAppointments(): Promise<{
  asBuyer: AppointmentDoc[];
  asSeller: AppointmentDoc[];
}> {
  const res = await fetch("/api/appointments");
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to load appointments");
  return {
    asBuyer: data.asBuyer ?? [],
    asSeller: data.asSeller ?? [],
  };
}

function formatEtRange(startIso: string, endIso: string) {
  const startEt = DateTime.fromISO(startIso).setZone(SCHED_ZONE);
  const endEt = DateTime.fromISO(endIso).setZone(SCHED_ZONE);
  const date = startEt.toFormat("yyyy-MM-dd");
  const t0 = startEt.toFormat("h:mm a");
  const t1 = endEt.toFormat("h:mm a");
  return `${date} ${t0}–${t1} ET`;
}

function AppointmentList({
  items,
  role,
}: {
  items: AppointmentDoc[];
  role: "buyer" | "seller";
}) {
  const queryClient = useQueryClient();
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const cancel = useCallback(
    async (id: string) => {
      setCancellingId(id);
      try {
        const res = await fetch(`/api/appointments/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "cancel" }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Cancel failed");
        toast({
          title: "Appointment cancelled",
          variant: "success",
        });
        await queryClient.invalidateQueries({ queryKey: ["appointments"] });
      } catch (e: unknown) {
        toast({
          title: "Could not cancel",
          description: e instanceof Error ? e.message : "Try again.",
          variant: "destructive",
        });
      } finally {
        setCancellingId(null);
      }
    },
    [queryClient]
  );

  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-6 text-center">
        No appointments yet.
      </p>
    );
  }

  return (
    <ul className="divide-y rounded-md border">
      {items.map((a) => {
        const start = new Date(a.startDatetime);
        const active = ACTIVE_APPOINTMENT_STATUSES.includes(
          a.status as (typeof ACTIVE_APPOINTMENT_STATUSES)[number]
        );
        const canCancel = active && start.getTime() > Date.now();
        const counterpartyLabel =
          role === "buyer" ? `Shop ${a.shopId}` : `Buyer ${a.buyerUserId}`;
        return (
          <li
            key={a.$id}
            className="flex flex-col gap-2 p-4 text-sm sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="space-y-1">
              <p className="font-medium">
                {formatEtRange(a.startDatetime, a.endDatetime)}
              </p>
              <p className="text-muted-foreground">{counterpartyLabel}</p>
              {a.listingId ? (
                <p className="text-xs text-muted-foreground">
                  Listing {a.listingId}
                </p>
              ) : null}
              {a.notes ? (
                <p className="text-xs text-muted-foreground">{a.notes}</p>
              ) : null}
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                {a.status.replace(/_/g, " ")}
              </p>
            </div>
            {canCancel ? (
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 text-destructive border-destructive/40 hover:bg-destructive/10"
                disabled={cancellingId === a.$id}
                onClick={() => void cancel(a.$id)}
              >
                {cancellingId === a.$id ? (
                  <Loader className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-1 inline" />
                )}
                Cancel
              </Button>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

export default function AppointmentsPage() {
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["appointments"],
    queryFn: fetchAppointments,
  });

  const buyer = useMemo(() => data?.asBuyer ?? [], [data?.asBuyer]);
  const seller = useMemo(() => data?.asSeller ?? [], [data?.asSeller]);

  return (
    <main className="container mx-auto px-4 pt-3 pb-8">
      <div className="max-w-5xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            My appointments
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Times shown in US Eastern ({SCHED_ZONE}).
          </p>
        </div>

        {isPending && (
          <div className="flex justify-center py-16">
            <Loader className="h-10 w-10 animate-spin text-muted-foreground" />
          </div>
        )}

        {isError && (
          <Card>
            <CardContent className="pt-6 flex flex-col items-center gap-4">
              <p className="text-sm text-muted-foreground text-center">
                Could not load appointments.
              </p>
              <Button onClick={() => void refetch()}>Try again</Button>
            </CardContent>
          </Card>
        )}

        {!isPending && !isError && data && (
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>As buyer</CardTitle>
                <CardDescription>
                  Appointments you booked with sellers.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AppointmentList items={buyer} role="buyer" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>As seller</CardTitle>
                <CardDescription>
                  Buyers who booked time with your shop.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AppointmentList items={seller} role="seller" />
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </main>
  );
}
