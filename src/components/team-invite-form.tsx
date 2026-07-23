"use client";

import { useActionState } from "react";
import { createWorkspaceInvitationAction, type TeamInviteState } from "@/app/actions/workspace";

const initialState: TeamInviteState = { ok: false, message: "" };

export function TeamInviteForm() {
  const [state, action, pending] = useActionState(createWorkspaceInvitationAction, initialState);
  return <form className="form panel-form" action={action}>
    <div className="field"><label htmlFor="memberEmail">Email anggota</label><input className="input" id="memberEmail" name="email" type="email" required placeholder="nama@email.com" /></div>
    <div className="field"><label htmlFor="memberRole">Peran</label><select className="input" id="memberRole" name="role" defaultValue="STAFF"><option value="OWNER">Owner</option><option value="ADMIN">Admin</option><option value="FINANCE">Finance</option><option value="STAFF">Staff</option></select></div>
    <button className="btn btn-primary" type="submit" disabled={pending}>{pending ? "Membuat undangan..." : "Undang anggota"}</button>
    {state.message && <p className={state.ok ? "alert alert-success" : "alert"} aria-live="polite">{state.message}</p>}
    {state.inviteUrl && <div className="field"><label htmlFor="inviteUrl">Tautan undangan</label><input className="input" id="inviteUrl" value={state.inviteUrl} readOnly onFocus={(event) => event.currentTarget.select()} /><small className="field-hint">Klik kolom lalu salin. Tautan berlaku 7 hari.</small></div>}
  </form>;
}
