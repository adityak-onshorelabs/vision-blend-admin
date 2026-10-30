import type { Metadata } from "next";
import { requireSession } from "@/lib/cms/auth";
import { listUsers } from "@/lib/cms/db";
import { PageHead } from "../../_components/nav";
import { AddEditorForm, PasswordForm, RemoveEditor } from "./account-forms";

export const metadata: Metadata = { title: "Account" };

export default async function AccountPage() {
  const session = await requireSession();
  const owner = session.role === "owner";
  const users = owner ? await listUsers() : [];

  return (
    <>
      <PageHead title={owner ? "Editors & account" : "Account"} text={owner ? "Who can sign in to the admin, and your own password." : "Change your password."} />

      {owner && (
        <>
          <section className="grid gap-4">
            <h2 className="t-label marker">Editors</h2>
            <ul className="border-t border-border">
              {users.map((u) => (
                <li key={u.email} className="flex flex-wrap items-center justify-between gap-3 border-b border-border py-3.5">
                  <span className="grid gap-0.5">
                    <span>{u.name}</span>
                    <span className="text-[0.88rem] text-muted-foreground">
                      {u.email} · {u.role === "owner" ? "Owner" : "Editor"}
                    </span>
                  </span>
                  {u.email !== session.email && <RemoveEditor email={u.email} name={u.name} />}
                </li>
              ))}
            </ul>
          </section>
          <section className="grid gap-6 bg-paper p-6 sm:p-8">
            <h2 className="t-label marker">Add an editor</h2>
            <AddEditorForm />
          </section>
        </>
      )}

      <section className="grid gap-6 bg-paper p-6 sm:p-8">
        <h2 className="t-label marker">Your password</h2>
        <PasswordForm />
      </section>
    </>
  );
}
