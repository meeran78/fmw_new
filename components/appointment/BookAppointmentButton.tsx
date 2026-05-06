"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CalendarClock, Loader } from "lucide-react";
import useLoginDialog from "@/hooks/use-login-dialog";
import useCurrentUser from "@/hooks/api/use-current-user";
import { toast } from "@/hooks/use-toast";
import { BookAppointmentDialog } from "@/components/appointment/BookAppointmentDialog";

export type BookAppointmentButtonProps = {
  listingId?: string;
  sellerUserId?: string;
  shopId?: string;
  shopName?: string;
  displayTitle?: string;
};

export function BookAppointmentButton({
  listingId,
  sellerUserId,
  shopId,
  shopName,
  displayTitle,
}: BookAppointmentButtonProps) {
  const { onOpen: onLoginOpen } = useLoginDialog();
  const { data: userData, isPending } = useCurrentUser();
  const user = userData?.user;

  const [dialogOpen, setDialogOpen] = useState(false);

  const sellerMissing =
    !sellerUserId?.trim() || !shopId?.trim() || !shopName?.trim();
  const listingMissing = !displayTitle?.trim();
  const ownerId = sellerUserId?.trim() ?? "";
  /** Buyers + other sellers: hide only when this listing belongs to the signed-in shop owner. */
  const isOwnerOfThisShop =
    Boolean(user && ownerId.length > 0 && user.$id === ownerId);

  const handleClick = () => {
    if (!user) {
      onLoginOpen();
      return;
    }
    if (sellerMissing || listingMissing) {
      toast({
        title: "Booking unavailable",
        description:
          "This listing is missing shop details. Try refreshing the page.",
        variant: "destructive",
      });
      return;
    }
    setDialogOpen(true);
  };

  if (isOwnerOfThisShop) {
    return null;
  }

  return (
    <>
      <div>
        <Button
          variant="outline"
          size="lg"
          className="w-full !gap-1 h-10 text-[15px] font-medium border-primary text-primary hover:bg-primary/10"
          disabled={isPending || sellerMissing || listingMissing}
          onClick={handleClick}
        >
          {isPending ? (
            <Loader className="!w-5 !h-5 animate-spin" />
          ) : (
            <CalendarClock className="!w-5 !h-5" />
          )}
          Book appointment
        </Button>
      </div>

      {!sellerMissing && !listingMissing && shopId && shopName && (
        <BookAppointmentDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          listingId={listingId}
          sellerUserId={sellerUserId!.trim()}
          shopId={shopId.trim()}
          shopName={shopName.trim()}
          displayTitle={displayTitle!.trim()}
        />
      )}
    </>
  );
}
