import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { notFound } from "next/navigation";
import { Send } from "lucide-react";
import { sendConversationMessageAction } from "@/app/actions/inbox";
import { ConversationReadMarker } from "@/components/conversation-read-marker";
import { Nav } from "@/components/nav";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/order";
import { conversationMessages, conversations, products, users } from "@/lib/schema";

export default async function ConversationPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const { error } = await searchParams;
  const merchantUsers = alias(users, "conversation_merchants");
  const memberUsers = alias(users, "conversation_members");
  const [row] = await db.select({ conversation: conversations, productName: products.name, merchantName: merchantUsers.name, memberName: memberUsers.name })
    .from(conversations).innerJoin(products, eq(conversations.productId, products.id))
    .innerJoin(merchantUsers, eq(conversations.merchantId, merchantUsers.id)).innerJoin(memberUsers, eq(conversations.memberId, memberUsers.id))
    .where(eq(conversations.id, id)).limit(1);
  if (!row || (user.role !== "ADMIN" && user.id !== row.conversation.merchantId && user.id !== row.conversation.memberId)) notFound();
  const messages = await db.select({ message: conversationMessages, senderName: users.name }).from(conversationMessages)
    .innerJoin(users, eq(conversationMessages.senderId, users.id)).where(eq(conversationMessages.conversationId, id)).orderBy(asc(conversationMessages.createdAt));
  const counterpart = user.role === "ADMIN" ? `${row.merchantName} ↔ ${row.memberName}` : user.id === row.conversation.merchantId ? row.memberName : row.merchantName;
  return <div className="app"><Nav app /><main className="app-main"><div className="shell conversation-shell"><ConversationReadMarker conversationId={id} /><div className="conversation-top"><div><Link className="muted" href="/inbox">← Kembali ke inbox</Link><h1>{counterpart}</h1><p>{row.productName}</p></div></div>{error && <p className="alert">{error}</p>}<section className="panel chat-panel"><div className="message-list">{messages.length ? messages.map(({ message, senderName }) => <article className={`message-bubble ${message.senderId === user.id ? "mine" : ""}`} key={message.id}><strong>{senderName}</strong><p>{message.body}</p><small>{formatDate(message.createdAt)}{message.readAt ? " · Dibaca" : ""}</small></article>) : <div className="empty"><p>Mulai percakapan tentang kelas ini.</p></div>}</div>{user.role !== "ADMIN" && <form className="message-form" action={sendConversationMessageAction.bind(null, id)}><textarea className="input" name="body" required maxLength={3000} placeholder="Tulis pesan…" /><button className="btn btn-primary" type="submit"><Send size={17} /> Kirim</button></form>}</section></div></main></div>;
}
