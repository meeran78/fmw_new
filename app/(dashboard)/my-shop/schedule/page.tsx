"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { minutesToTimeLabel } from "@/lib/appointment-scheduling";
import { SCHED_ZONE, startOfWeekMondayEastern } from "@/lib/eastern-scheduling";
import { DateTime } from "luxon";

const WEEKDAY_OPTIONS = [
  { value: "0", label: "Sunday" },
  { value: "1", label: "Monday" },
  { value: "2", label: "Tuesday" },
  { value: "3", label: "Wednesday" },
  { value: "4", label: "Thursday" },
  { value: "5", label: "Friday" },
  { value: "6", label: "Saturday" },
];

const DEFAULT_MF = [1, 2, 3, 4, 5].map((weekday) => ({
  weekday,
  startTime: "09:00",
  endTime: "17:00",
  slotMinutes: 30,
}));

type Row = {
  localId: string;
  weekday: number;
  startTime: string;
  endTime: string;
  slotMinutes: number;
};

function newRow(partial?: Partial<Row>): Row {
  return {
    localId:
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random()}`,
    weekday: partial?.weekday ?? 1,
    startTime: partial?.startTime ?? "09:00",
    endTime: partial?.endTime ?? "17:00",
    slotMinutes: partial?.slotMinutes ?? 30,
  };
}

export default function SellerSchedulePage() {
  const [shopId, setShopId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [weekMondayEt, setWeekMondayEt] = useState(() =>
    startOfWeekMondayEastern(DateTime.now().setZone(SCHED_ZONE))
  );

  const easternDayLabelForWeekday = (weekday: number): string => {
    const d =
      weekday === 0
        ? weekMondayEt.minus({ days: 1 })
        : weekMondayEt.plus({ days: weekday - 1 });
    return d.toFormat("ccc MMM d");
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/appointments/schedule");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not load schedule");
      setShopId(data.shopId ?? null);
      const rules = data.rules as
        | {
            weekday: number;
            startMinute: number;
            endMinute: number;
            slotMinutes: number;
          }[]
        | undefined;
      if (rules?.length) {
        setRows(
          rules.map((r) =>
            newRow({
              weekday: r.weekday,
              startTime: minutesToTimeLabel(r.startMinute),
              endTime: minutesToTimeLabel(r.endMinute),
              slotMinutes: r.slotMinutes,
            })
          )
        );
      } else {
        setRows([]);
      }
    } catch (e: unknown) {
      toast({
        title: "Could not load availability",
        description: e instanceof Error ? e.message : "Try again later.",
        variant: "destructive",
      });
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    if (!shopId) {
      toast({
        title: "No shop",
        description: "Create your shop before setting availability.",
        variant: "destructive",
      });
      return;
    }
    setSaving(true);
    try {
      const humanRules = rows.map((r) => ({
        weekday: r.weekday,
        startTime: r.startTime,
        endTime: r.endTime,
        slotMinutes: r.slotMinutes,
      }));
      const res = await fetch("/api/appointments/schedule", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ humanRules }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      toast({
        title: "Availability saved",
        description: `${data.count ?? humanRules.length} Eastern-time window(s); repeats weekly.`,
        variant: "success",
      });
      await load();
    } catch (e: unknown) {
      toast({
        title: "Could not save",
        description: e instanceof Error ? e.message : "Try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const applyTemplate = () => {
    setRows(DEFAULT_MF.map((r) => newRow(r)));
  };

  return (
    <main className="container mx-auto px-4 pt-3 pb-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Booking availability
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Set repeating weekly hours in US Eastern Time ({SCHED_ZONE}). DST is
              handled automatically. Buyers book using Eastern dates and times.
            </p>
          </div>
          <Button variant="outline" asChild>
            <Link href="/my-shop">Back to shop</Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Weekly windows (Eastern time)</CardTitle>
            <CardDescription>
              24-hour times are US Eastern (handles DST). Slots repeat every week.
              Use “focus week” to map weekdays to calendar dates while editing.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader className="h-9 w-9 animate-spin text-muted-foreground" />
              </div>
            ) : !shopId ? (
              <p className="text-sm text-muted-foreground py-6">
                You need a shop before publishing availability.{" "}
                <Link href="/my-shop" className="text-primary underline">
                  Open My Shop
                </Link>
                .
              </p>
            ) : (
              <>
                <div className="rounded-lg border p-4 space-y-3 bg-muted/30">
                  <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
                    <div className="space-y-1 flex-1 min-w-[200px]">
                      <Label htmlFor="focus-week">Focus week (pick any Eastern date)</Label>
                      <Input
                        id="focus-week"
                        type="date"
                        value={weekMondayEt.toFormat("yyyy-MM-dd")}
                        onChange={(e) => {
                          const v = e.target.value;
                          if (!v) return;
                          const picked = DateTime.fromISO(v, {
                            zone: SCHED_ZONE,
                          }).startOf("day");
                          setWeekMondayEt(startOfWeekMondayEastern(picked));
                        }}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setWeekMondayEt((w: DateTime) => w.minus({ weeks: 1 }))
                        }
                      >
                        Previous week
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setWeekMondayEt((w: DateTime) => w.plus({ weeks: 1 }))
                        }
                      >
                        Next week
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Reference week:{" "}
                    <strong>
                      {weekMondayEt.toFormat("MMM d")} –{" "}
                      {weekMondayEt.plus({ days: 6 }).toFormat("MMM d, yyyy")}
                    </strong>
                  </p>
                </div>

                {rows.length === 0 ? (
                  <div className="space-y-4 py-4">
                    <p className="text-sm text-muted-foreground">
                      No windows yet — buyers will not see any slots until you add
                      availability.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" variant="secondary" onClick={applyTemplate}>
                        Mon–Fri 09:00–17:00 Eastern (30 min slots)
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setRows([newRow()])}
                      >
                        Add custom row
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={saving}
                        onClick={() => void save()}
                      >
                        Save — turn off booking (no windows)
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {rows.map((row, index) => (
                      <div
                        key={row.localId}
                        className="flex flex-col gap-3 rounded-lg border p-4 md:flex-row md:flex-wrap md:items-end"
                      >
                        <div className="space-y-1 md:w-[160px]">
                          <Label>Weekday</Label>
                          <p className="text-[11px] text-muted-foreground tabular-nums">
                            {easternDayLabelForWeekday(row.weekday)}
                          </p>
                          <Select
                            value={String(row.weekday)}
                            onValueChange={(v) => {
                              const weekday = Number(v);
                              setRows((prev) =>
                                prev.map((r, i) =>
                                  i === index ? { ...r, weekday } : r
                                )
                              );
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {WEEKDAY_OPTIONS.map((w) => (
                                <SelectItem key={w.value} value={w.value}>
                                  {w.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2 md:w-[120px]">
                          <Label>Start</Label>
                          <Input
                            type="time"
                            value={row.startTime}
                            onChange={(e) => {
                              const startTime = e.target.value;
                              setRows((prev) =>
                                prev.map((r, i) =>
                                  i === index ? { ...r, startTime } : r
                                )
                              );
                            }}
                          />
                        </div>
                        <div className="space-y-2 md:w-[120px]">
                          <Label>End</Label>
                          <Input
                            type="time"
                            value={row.endTime}
                            onChange={(e) => {
                              const endTime = e.target.value;
                              setRows((prev) =>
                                prev.map((r, i) =>
                                  i === index ? { ...r, endTime } : r
                                )
                              );
                            }}
                          />
                        </div>
                        <div className="space-y-2 md:w-[100px]">
                          <Label>Slot (min)</Label>
                          <Input
                            type="number"
                            min={15}
                            max={180}
                            step={15}
                            value={row.slotMinutes}
                            onChange={(e) => {
                              const slotMinutes = Number(e.target.value) || 30;
                              setRows((prev) =>
                                prev.map((r, i) =>
                                  i === index ? { ...r, slotMinutes } : r
                                )
                              );
                            }}
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-destructive md:mb-0.5"
                          onClick={() =>
                            setRows((prev) => prev.filter((_, i) => i !== index))
                          }
                          aria-label="Remove row"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1"
                      onClick={() => setRows((prev) => [...prev, newRow()])}
                    >
                      <Plus className="h-4 w-4" />
                      Add window
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
          {shopId && !loading && rows.length > 0 ? (
            <CardFooter className="flex flex-wrap gap-2 border-t pt-6">
              <Button disabled={saving} onClick={() => void save()}>
                {saving ? (
                  <Loader className="h-4 w-4 animate-spin" />
                ) : (
                  "Save availability"
                )}
              </Button>
              <Button type="button" variant="secondary" onClick={applyTemplate}>
                Reset to Mon–Fri Eastern template
              </Button>
            </CardFooter>
          ) : null}
        </Card>
      </div>
    </main>
  );
}
