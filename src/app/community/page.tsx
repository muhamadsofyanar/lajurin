import Link from "next/link";
import Image from "next/image";
import { and, asc, desc, eq } from "drizzle-orm";
import { Heart, ImageIcon, Lightbulb, PartyPopper, ShieldAlert } from "lucide-react";
import {
  createCommunityCommentAction,
  createCommunityPostAction,
  createCommunitySpaceAction,
  reportCommunityContentAction,
  reviewCommunityReportAction,
  toggleCommunityHiddenAction,
  toggleCommunityPinAction,
  toggleCommunityReactionAction,
} from "@/app/actions/community";
import { Nav } from "@/components/nav";
import { requireUser } from "@/lib/auth";
import { canModerateSpace, getAccessibleCommunitySpaces } from "@/lib/community";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/order";
import { communityComments, communityPosts, communityReactions, communityReports, products, users } from "@/lib/schema";

const reactionMeta = {
  LIKE: { label: "Suka", icon: Heart },
  INSIGHTFUL: { label: "Bermanfaat", icon: Lightbulb },
  CELEBRATE: { label: "Rayakan", icon: PartyPopper },
};

export default async function CommunityPage({ searchParams }: { searchParams: Promise<{ space?: string; error?: string; success?: string }> }) {
  const user = await requireUser();
  const query = await searchParams;
  const spaces = await getAccessibleCommunitySpaces(user);
  const selected = spaces.find((row) => row.space.id === query.space) ?? spaces.find((row) => !row.space.isArchived) ?? spaces[0];
  if (!selected) return <div className="app"><Nav app /><main className="app-main"><div className="shell"><section className="panel empty"><h1>Komunitas belum tersedia</h1><p>Akses ruang komunitas muncul setelah Anda memiliki kelas aktif.</p></section></div></main></div>;

  const moderator = canModerateSpace(user, selected.space);
  const postRows = await db.select({ post: communityPosts, authorName: users.name, authorRole: users.role }).from(communityPosts)
    .innerJoin(users, eq(communityPosts.authorId, users.id))
    .where(moderator ? eq(communityPosts.spaceId, selected.space.id) : and(eq(communityPosts.spaceId, selected.space.id), eq(communityPosts.isHidden, false)))
    .orderBy(desc(communityPosts.isPinned), desc(communityPosts.createdAt));
  const data = await Promise.all(postRows.map(async (row) => {
    const comments = await db.select({ comment: communityComments, authorName: users.name }).from(communityComments)
      .innerJoin(users, eq(communityComments.authorId, users.id))
      .where(moderator ? eq(communityComments.postId, row.post.id) : and(eq(communityComments.postId, row.post.id), eq(communityComments.isHidden, false)))
      .orderBy(asc(communityComments.createdAt));
    const reactions = await db.select().from(communityReactions).where(eq(communityReactions.postId, row.post.id));
    return { ...row, comments, reactions };
  }));
  const merchantProducts = user.role === "MERCHANT" ? await db.select({ id: products.id, name: products.name }).from(products).where(eq(products.merchantId, user.id)).orderBy(asc(products.name)) : [];
  const openReports = moderator ? await db.select().from(communityReports).where(eq(communityReports.status, "OPEN")).orderBy(desc(communityReports.createdAt)) : [];
  const reports = moderator ? (await Promise.all(openReports.map(async (report) => {
    const [post] = report.postId
      ? await db.select({ id: communityPosts.id, title: communityPosts.title, spaceId: communityPosts.spaceId }).from(communityPosts).where(eq(communityPosts.id, report.postId)).limit(1)
      : await db.select({ id: communityPosts.id, title: communityPosts.title, spaceId: communityPosts.spaceId }).from(communityComments).innerJoin(communityPosts, eq(communityComments.postId, communityPosts.id)).where(eq(communityComments.id, report.commentId!)).limit(1);
    return post?.spaceId === selected.space.id ? { report, post } : null;
  }))).filter((row): row is NonNullable<typeof row> => Boolean(row)) : [];

  return <div className="app"><Nav app /><main className="app-main"><div className="shell community-v2-layout">
    <aside className="panel community-spaces">
      <div className="panel-head"><h2>Ruang</h2><span className="badge">{spaces.filter((row) => !row.space.isArchived).length}</span></div>
      <nav>{spaces.map((row) => <Link className={`space-link ${row.space.id === selected.space.id ? "active" : ""}`} href={`/community?space=${row.space.id}`} key={row.space.id}><strong>{row.space.name}</strong><small>{row.productName ? row.productName : row.merchantBrand ?? row.merchantName ?? "Semua member"}{row.space.isArchived ? " · Diarsipkan" : ""}</small></Link>)}</nav>
      {user.role === "MERCHANT" && <details className="space-create"><summary>+ Buat ruang</summary><form className="form compact-form" action={createCommunitySpaceAction}><input className="input" name="name" required minLength={3} maxLength={80} placeholder="Nama ruang" /><textarea className="input" name="description" maxLength={300} placeholder="Deskripsi singkat" /><select className="input" name="productId"><option value="">Semua pembeli toko</option>{merchantProducts.map((product) => <option value={product.id} key={product.id}>{product.name}</option>)}</select><button className="btn btn-primary" type="submit">Buat ruang</button></form></details>}
    </aside>

    <section className="community-feed"><div className="page-head community-head"><div><span className="eyebrow">{selected.productName ? "Komunitas produk" : selected.merchantBrand ?? selected.merchantName ? "Komunitas merchant" : "Komunitas platform"}</span><h1 className="display">{selected.space.name}</h1><p>{selected.space.description ?? "Diskusi, berbagi progres, dan tumbuh bersama."}</p></div></div>
      {query.error && <p className="alert">{query.error}</p>}{query.success && <p className="success">{query.success}</p>}
      <section className="panel community-composer"><form className="form" action={createCommunityPostAction}><input type="hidden" name="spaceId" value={selected.space.id} /><div className="two-field"><input className="input" name="title" required minLength={4} maxLength={140} placeholder="Judul diskusi" /><label className="input community-file"><ImageIcon size={17} /><span>Tambahkan gambar</span><input name="image" type="file" accept="image/jpeg,image/png,image/webp" /></label></div><textarea className="input" name="content" required minLength={10} maxLength={5000} placeholder="Bagikan pertanyaan, pengalaman, atau kabar terbaru…" /><div className="composer-foot"><small>JPG, PNG, atau WebP maksimal 5 MB.</small><button className="btn btn-primary" type="submit">Publikasikan</button></div></form></section>
      <div className="stack">{data.length ? data.map(({ post, authorName, authorRole, comments, reactions }) => <article className={`panel community-post ${post.isHidden ? "post-hidden" : ""}`} id={`post-${post.id}`} key={post.id}><header><div><div className="post-author"><strong>{authorName}</strong><span className="badge">{authorRole}</span>{post.isPinned && <span className="badge badge-live">Disematkan</span>}{post.isHidden && <span className="badge status-rejected">Disembunyikan</span>}</div><small>{formatDate(post.createdAt)}</small></div>{moderator && <div className="post-tools"><form action={toggleCommunityPinAction.bind(null, post.id)}><button className="btn btn-compact" type="submit">{post.isPinned ? "Lepas sematan" : "Sematkan"}</button></form><form action={toggleCommunityHiddenAction.bind(null, post.id)}><button className="btn btn-compact" type="submit">{post.isHidden ? "Tampilkan" : "Sembunyikan"}</button></form></div>}</header><h2>{post.title}</h2><p className="post-content">{post.content}</p>{post.imageStorageKey && <Image className="community-image" src={`/api/community-media/${post.id}`} alt="Lampiran postingan" width={1200} height={700} unoptimized />}
        <div className="reaction-bar">{Object.entries(reactionMeta).map(([value, meta]) => { const Icon = meta.icon; const count = reactions.filter((reaction) => reaction.reaction === value).length; const active = reactions.some((reaction) => reaction.reaction === value && reaction.userId === user.id); return <form action={toggleCommunityReactionAction.bind(null, post.id, value)} key={value}><button className={`reaction-btn ${active ? "active" : ""}`} type="submit"><Icon size={15} /> {meta.label}{count > 0 ? ` ${count}` : ""}</button></form>; })}<details className="report-menu"><summary>Laporkan</summary><form action={reportCommunityContentAction.bind(null, post.id, null)}><input className="input input-small" name="reason" required minLength={5} maxLength={500} placeholder="Alasan laporan" /><button className="btn btn-compact" type="submit">Kirim</button></form></details></div>
        <div className="comments"><strong>{comments.length} komentar</strong>{comments.map(({ comment, authorName: commenter }) => <div className={`comment ${comment.isHidden ? "post-hidden" : ""}`} key={comment.id}><div><strong>{commenter}</strong><small>{formatDate(comment.createdAt)}</small></div><p>{comment.isHidden ? "Komentar disembunyikan moderator." : comment.content}</p>{!comment.isHidden && <details className="report-menu comment-report"><summary>Laporkan</summary><form action={reportCommunityContentAction.bind(null, post.id, comment.id)}><input className="input input-small" name="reason" required minLength={5} maxLength={500} placeholder="Alasan laporan" /><button className="btn btn-compact" type="submit">Kirim</button></form></details>}</div>)}{!post.isHidden && <form className="comment-form" action={createCommunityCommentAction.bind(null, post.id)}><input className="input" name="content" required minLength={2} maxLength={1200} placeholder="Tulis komentar…" /><button className="btn" type="submit">Kirim</button></form>}</div></article>) : <section className="panel empty"><p>Belum ada postingan di ruang ini. Jadilah yang pertama berbagi.</p></section>}</div>
    </section>

    <aside className="community-side stack">{reports.length > 0 && <section className="panel"><div className="panel-head"><h2><ShieldAlert size={17} /> Laporan</h2><span className="badge status-pending">{reports.length}</span></div>{reports.map(({ report, post }) => <div className="report-card" key={report.id}><strong>{post.title}</strong><p>{report.reason}</p><div><form action={reviewCommunityReportAction.bind(null, report.id, "resolve", true)}><button className="btn btn-compact" type="submit">Sembunyikan</button></form><form action={reviewCommunityReportAction.bind(null, report.id, "dismiss", false)}><button className="btn btn-compact" type="submit">Abaikan</button></form></div></div>)}</section>}
      <section className="panel community-guide"><span className="eyebrow">Panduan</span><h2>Ruang yang tepat, diskusi lebih fokus.</h2><p>Ruang produk hanya dapat dilihat member yang memiliki produk tersebut. Ruang merchant dapat dilihat seluruh pembeli merchant.</p></section>
    </aside>
  </div></main></div>;
}
