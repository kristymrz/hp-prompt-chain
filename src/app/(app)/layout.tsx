import { createClient } from "@/lib/supabase/server";
import Nav from "@/components/Nav";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Nav email={user?.email} />
      <main className="flex-1">{children}</main>
    </div>
  );
}
