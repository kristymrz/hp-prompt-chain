import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import LogoutButton from "@/components/LogoutButton";
import ThemeToggle from "@/components/ThemeToggle";

export default async function UnauthorizedPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-grey-50 dark:bg-dsg-950">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm rounded-2xl border border-grey-200 bg-white p-8 shadow-sm text-center dark:border-dsg-800 dark:bg-dsg-900">
        <div className="mb-4 text-4xl">🚫</div>
        <h1 className="mb-2 text-xl font-bold text-dsg-900 dark:text-dsg-50">
          Access Denied
        </h1>
        <p className="mb-6 text-sm text-grey-500 dark:text-grey-400">
          Your account ({user.email}) does not have permission to access this
          tool. Please contact an administrator.
        </p>
        <LogoutButton />
      </div>
    </main>
  );
}
