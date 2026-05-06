import Link from "next/link";
import type { Metadata } from "next";
import { Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Services & Repair | Falah Motors",
  description:
    "Vehicle servicing and repair — coming soon at Falah Motors.",
};

export default function ServicesRepairPage() {
  return (
    <div className="container mx-auto px-4 pt-8 pb-16">
      <div className="max-w-lg mx-auto">
        <Card className="border-border/80 shadow-sm text-center">
          <CardHeader className="space-y-4 pb-2">
            <div
              className="mx-auto flex h-16 w-16 items-center justify-center rounded-full
              bg-primary/10 text-primary"
              aria-hidden
            >
              <Wrench className="h-8 w-8" strokeWidth={1.75} />
            </div>
            <CardTitle className="text-2xl font-semibold tracking-tight">
              Services & Repair
            </CardTitle>
            <CardDescription className="text-base">
              We&apos;re putting the finishing touches on our service and repair
              booking experience. Check back soon, or browse listings while you
              wait.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-center">
            <Button asChild variant="default">
              <Link href="/search">Browse cars</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/">Back to home</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
