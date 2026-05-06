"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader } from "lucide-react";
import useCurrentUser from "@/hooks/api/use-current-user";
import { toast } from "@/hooks/use-toast";

/**
 * Buyers have no shop document; only sellers should access /my-shop routes.
 */
export default function SellerShopGate({
  children,
}: {
  children: ReactNode;
}) {
  const router = useRouter();
  const { data, isPending, isError } = useCurrentUser();

  useEffect(() => {
    if (isPending || isError) return;
    if (!data?.user) return;
    if (!data.shop) {
      toast({
        title: "Seller tools unavailable",
        description:
          "This area is for dealers with a shop. Browse listings to book appointments.",
      });
      router.replace("/");
    }
  }, [isPending, isError, data?.user, data?.shop, router]);

  if (isPending) {
    return (
      <div className="flex justify-center py-16">
        <Loader className="h-10 w-10 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="container mx-auto px-4 py-12 text-center text-sm text-muted-foreground">
        Could not verify your account. Refresh the page or sign in again.
      </div>
    );
  }

  if (!data?.shop) {
    return null;
  }

  return <>{children}</>;
}
