"use client";

import React, { useEffect, useMemo, useState } from "react";
import { DateTime } from "luxon";
import {
  SCHED_MAX_HORIZON_DAYS,
  SCHED_ZONE,
  easternDateStringFromUtc,
} from "@/lib/eastern-scheduling";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export type BookAppointmentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listingId?: string;
  sellerUserId: string;
  shopId: string;
  shopName: string;
  displayTitle: string;
};

export function BookAppointmentDialog({
  open,
  onOpenChange,
  listingId,
  sellerUserId,
  shopId,
  shopName,
  displayTitle,
}: BookAppointmentDialogProps) {
  const etTodayStr = DateTime.now().setZone(SCHED_ZONE).toFormat("yyyy-MM-dd");
  const etMaxStr = DateTime.now()
    .setZone(SCHED_ZONE)
    .plus({ days: SCHED_MAX_HORIZON_DAYS })
    .toFormat("yyyy-MM-dd");

  const [dayStr, setDayStr] = useState(etTodayStr);
  const [slots, setSlots] = useState<{ start: string; end: string }[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selected, setSelected] = useState<{ start: string; end: string } | null>(
    null
  );
  const [notes, setNotes] = useState("");
  const [booking, setBooking] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSelected(null);
    setDayStr(DateTime.now().setZone(SCHED_ZONE).toFormat("yyyy-MM-dd"));
    const load = async () => {
      setLoadingSlots(true);
      try {
        const et = DateTime.now().setZone(SCHED_ZONE);
        const from = et.minus({ days: 1 }).toFormat("yyyy-MM-dd");
        /** Must match slots API: `to` ≤ today ET + SCHED_MAX_HORIZON_DAYS */
        const to = et.plus({ days: SCHED_MAX_HORIZON_DAYS }).toFormat("yyyy-MM-dd");
        const qs = new URLSearchParams({
          sellerUserId,
          shopId,
          from,
          to,
        });
        const res = await fetch(`/api/appointments/slots?${qs}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Could not load times");
        setSlots(data.slots || []);
        if (!data.windowsConfigured) {
          toast({
            title: "No availability yet",
            description:
              "The seller has not published booking hours. Try again later.",
          });
        }
      } catch (e: unknown) {
        toast({
          title: "Could not load slots",
          description:
            e instanceof Error ? e.message : "Please try again later.",
          variant: "destructive",
        });
        setSlots([]);
      } finally {
        setLoadingSlots(false);
      }
    };
    void load();
  }, [open, sellerUserId, shopId]);

  const slotsForDay = useMemo(
    () =>
      slots.filter(
        (s) => easternDateStringFromUtc(new Date(s.start)) === dayStr
      ),
    [slots, dayStr]
  );

  const handleBook = async () => {
    if (!selected) return;
    setBooking(true);
    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sellerUserId,
          shopId,
          listingId: listingId || undefined,
          startDatetime: selected.start,
          endDatetime: selected.end,
          notes: notes.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Booking failed");
      toast({
        title: "Appointment booked",
        description: `With ${shopName} for ${displayTitle}`,
        variant: "success",
      });
      onOpenChange(false);
      setNotes("");
      setSelected(null);
    } catch (e: unknown) {
      toast({
        title: "Booking failed",
        description:
          e instanceof Error ? e.message : "Please try another time.",
        variant: "destructive",
      });
    } finally {
      setBooking(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Book an appointment</DialogTitle>
          <DialogDescription>
            Dates and times use US Eastern Time ({SCHED_ZONE}) — including
            daylight saving — for <strong>{shopName}</strong> and{" "}
            <strong>{displayTitle}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="appt-day">Date (Eastern)</Label>
            <input
              id="appt-day"
              type="date"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              min={etTodayStr}
              max={etMaxStr}
              value={dayStr}
              onChange={(e) => setDayStr(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Available times (Eastern)</Label>
            {loadingSlots ? (
              <div className="flex justify-center py-6">
                <Loader className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : slotsForDay.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">
                No open slots on this Eastern calendar day. Try another date,
                or another time after the minimum notice period.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                {slotsForDay.map((slot) => {
                  const startEt = DateTime.fromISO(slot.start).setZone(SCHED_ZONE);
                  const endEt = DateTime.fromISO(slot.end).setZone(SCHED_ZONE);
                  const label = `${startEt.toFormat("h:mm a")} – ${endEt.toFormat("h:mm a")}`;
                  const active =
                    selected?.start === slot.start && selected?.end === slot.end;
                  return (
                    <Button
                      key={`${slot.start}-${slot.end}`}
                      type="button"
                      variant={active ? "default" : "outline"}
                      size="sm"
                      className="justify-center text-xs"
                      onClick={() => setSelected(slot)}
                    >
                      {label}
                    </Button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="appt-notes">Notes (optional)</Label>
            <Textarea
              id="appt-notes"
              rows={3}
              placeholder="Anything the seller should know?"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!selected || booking || loadingSlots}
            onClick={() => void handleBook()}
          >
            {booking ? (
              <Loader className="h-4 w-4 animate-spin" />
            ) : (
              "Confirm booking"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
