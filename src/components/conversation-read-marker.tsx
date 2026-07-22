"use client";

import { useEffect, useTransition } from "react";
import { markConversationReadAction } from "@/app/actions/inbox";

export function ConversationReadMarker({ conversationId }: { conversationId: string }) {
  const [, startTransition] = useTransition();
  useEffect(() => { startTransition(() => { void markConversationReadAction(conversationId); }); }, [conversationId, startTransition]);
  return null;
}
