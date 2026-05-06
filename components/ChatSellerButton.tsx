"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader, MessageSquareText } from "lucide-react";
import { useRouter } from "next/navigation";
import useLoginDialog from "@/hooks/use-login-dialog";
import useCurrentUser from "@/hooks/api/use-current-user";
import { toast } from "@/hooks/use-toast";

interface ChatSellerButtonProps {
  displayTitle?: string;
  shopOwnerUserId?: string;
  shopName?: string;
}

const ChatSellerButton = ({
  shopOwnerUserId,
  shopName,
  displayTitle,
}: ChatSellerButtonProps) => {
  const router = useRouter();
  const { onOpen } = useLoginDialog();
  const { data: userData, isPending } = useCurrentUser();
  const user = userData?.user;

  const [isLoading, setIsLoading] = useState(false);

  const sellerMissing = !shopOwnerUserId?.trim() || !shopName?.trim();
  const listingMissing = !displayTitle?.trim();

  const handleStartChat = async () => {
    if (!user) {
      onOpen();
      return;
    }

    const oid = shopOwnerUserId?.trim();
    const nm = shopName?.trim();
    const ttl = displayTitle?.trim();
    if (!oid || !nm || !ttl) {
      toast({
        title: "Chat unavailable",
        description:
          "This listing is missing seller details. Try refreshing the page.",
        variant: "destructive",
      });
      return;
    }

    if (oid === user.$id) {
      toast({
        title: "Chat unavailable",
        description: "You cannot message yourself about your own listing.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/chat/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shopOwnerUserId: oid,
          shopName: nm,
          displayTitle: ttl,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(
          typeof data.error === "string" ? data.error : `Request failed (${res.status})`
        );
      }

      const channelUrl = data.channelUrl as string | undefined;
      if (!channelUrl) {
        throw new Error("No conversation URL returned");
      }

      router.push(
        `/profile-messages?channelUrl=${encodeURIComponent(channelUrl)}`
      );
    } catch (error: unknown) {
      const description =
        error instanceof Error && error.message
          ? error.message
          : "Could not open chat. Check Sendbird configuration and try again.";
      toast({
        title: "Could not start chat",
        description,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <div>
        <Button
          variant="default"
          size="lg"
          className="w-full
             border-primary text-white !gap-1 h-10 text-[15px]
              font-medium disabled:pointer-events-none"
          disabled={
            isLoading || isPending || sellerMissing || listingMissing
          }
          onClick={handleStartChat}
        >
          {isLoading ? (
            <Loader className="!w-5 !h-5 animate-spin" />
          ) : (
            <MessageSquareText className="!w-5 !h-5" />
          )}
          Start chat
        </Button>
      </div>
    </div>
  );
};

export default ChatSellerButton;
