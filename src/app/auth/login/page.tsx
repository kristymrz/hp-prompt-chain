import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import LoginButton from "./LoginButton";
import ThemeToggle from "@/components/ThemeToggle";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/");
  }

  const { error } = await searchParams;

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-grey-50 dark:bg-dsg-950">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm rounded-2xl border border-grey-200 bg-white p-8 shadow-sm dark:border-dsg-800 dark:bg-dsg-900">
        <h1 className="mb-2 text-center text-2xl font-bold text-dsg-900 dark:text-dsg-50">
          Kristy's Prompt Chain Tool
        </h1>
        <p className="mb-8 text-center text-sm text-grey-500 dark:text-grey-400">
          Sign in with your Google account to continue. Access is restricted to
          super admins and matrix admins only.
        </p>

        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">
            {error}
          </div>
        )}

        <LoginButton />
      </div>
    </main>
  );
}
