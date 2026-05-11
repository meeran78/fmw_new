import Link from "next/link";
import type { Metadata } from "next";
import { CircleDollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Pricing | AHM Auto",
  description:
    "Listing fees and packages — coming soon at AHM Auto.",
};

export default function PricingPage() {
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
              <CircleDollarSign className="h-8 w-8" strokeWidth={1.75} />
            </div>
            <CardTitle className="text-2xl font-semibold tracking-tight">
              Pricing
            </CardTitle>
            <CardDescription className="text-base">
              Transparent pricing for sellers and optional upgrades is on the
              way. We&apos;ll share plans and fees here soon—in the meantime,
              explore what&apos;s listed today.
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
