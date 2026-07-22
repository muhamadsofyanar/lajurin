import Link from "next/link";
import { and, desc, eq, isNull, ne, or } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { MessageCircle } from "lucide-react";
import { Nav } from "@/components/nav";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/order";
import { conversationMessages, conversations, products, users } from "@/lib/schema";

export default async function InboxPage() {
  const user = await requireUser();
  const merchantUsers = alias(users, "inbox_merchants");
  const memberUsers = alias(users, "inbox_members");
  const rows = await db.select({ conversation: conversations, productName: products.name, merchantName: merchantUsers.name, memberName: memberUsers.name })
    .from(conversations).innerJoin(products, eq(conversations.productId, products.id))
    .innerJoin(merchantUsers, eq(conversations.merchantId, merchantUsers.id)).innerJoin(memberUsers, eq(conversations.memberId, memberUsers.id))
    .where(user.role === "ADMIN" ? undefined : or(eq(conversations.merchantId, user.id), eq(conversations.memberId, user.id))).orderBy(desc(conversations.updatedAt));
  const data = await Promise.all(rows.map(async (row) => {
    const [latest] = await db.select().from(conversationMessages).where(eq(conversationMessages.conversationId, row.conversation.id)).orderBy(desc(conversationMessages.createdAt)).limit(1);
    const unread = user.role === "ADMIN" ? [] : await db.select({ id: conversationMessages.id }).from(conversationMessages).where(and(eq(conversationMessages.conversationId, row.conversation.id), ne(conversationMessages.senderId, user.id), isNull(conversationMessages.readAt)));
    return { ...row, latest, unread: unread.length };
  }));
  return <div className="app"><Nav app /><main className="app-main"><div className="shell inbox-shell"><div className="page-head"><div><span className="eyebrow">Percakapan privat</span><h1 className="display">Inbox</h1><p>Pesan antara merchant dan member tetap terpisah untuk setiap produk.</p></div></div><section className="panel"><div className="panel-head"><h2><MessageCircle size={18} /> Percakapan</h2><span className="muted">{data.length} percakapan</span></div>{data.length ? data.map((row) => <Link className="conversation-row" href={`/inbox/${row.conversation.id}`} key={row.conversation.id}><span className="conversation-avatar">{(user.id === row.conversation.merchantId ? row.memberName : row.merchantName).slice(0, 1).toUpperCase()}</span><span><strong>{user.role === "ADMIN" ? `${row.merchantName} ↔ ${row.memberName}` : user.id === row.conversation.merchantId ? row.memberName : row.merchantName}</strong><small>{row.productName}</small><p>{row.latest?.body ?? "Belum ada pesan."}</p></span><span className="conversation-meta"><small>{formatDate(row.latest?.createdAt ?? row.conversation.createdAt)}</small>{row.unread > 0 && <b>{row.unread}</b>}</span></Link>) : <div className="empty"><MessageCircle size={34} /><h2>Belum ada percakapan</h2><p>Member dapat menghubungi merchant dari halaman kelas. Merchant dapat memulai percakapan dari menu Pelanggan.</p></div>}</section></div></main></div>;
}
