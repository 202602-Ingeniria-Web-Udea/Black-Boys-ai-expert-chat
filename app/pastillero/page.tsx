import { PillboxApp } from "@/components/pillbox/PillboxApp";
import { AppHeader } from "@/components/site/AppHeader";
import { requireUser } from "@/lib/auth/session";

export const metadata = { title: "Mi pastillero" };
export const dynamic = "force-dynamic";

export default async function PillboxPage() {
  const user = await requireUser("/pastillero");
  return (
    <>
      <AppHeader user={user} current="pastillero" />
      <main id="contenido" className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
        <PillboxApp userId={user.id} userName={user.name} />
      </main>
    </>
  );
}
