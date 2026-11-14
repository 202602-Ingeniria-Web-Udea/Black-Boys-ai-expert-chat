import { AdminTabs } from "@/components/admin/AdminTabs";
import { AppHeader } from "@/components/site/AppHeader";
import { requireAdmin } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin("/admin");
  return (
    <>
      <AppHeader user={user} current="admin" />
      <div className="border-b border-line">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <AdminTabs />
        </div>
      </div>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">{children}</main>
    </>
  );
}
