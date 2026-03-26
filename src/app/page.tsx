import { createClient } from "@/lib/supabase/server";
import LogoutButton from "@/components/LogoutButton";
import ThemeToggle from "@/components/ThemeToggle";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Navbar */}
      <header className="border-b border-grey-200 bg-white px-6 py-3 dark:border-dsg-800 dark:bg-dsg-900">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <h1 className="text-lg font-semibold text-dsg-800 dark:text-dsg-100">
            HP Prompt Chain
          </h1>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <span className="text-sm text-grey-500 dark:text-grey-400">
              {user?.email}
            </span>
            <LogoutButton />
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-dsg-900 dark:text-dsg-50">
            Prompt Chain Steps
          </h2>
          <p className="mt-1 text-sm text-grey-500 dark:text-grey-400">
            Manage and execute prompt chain steps against the class database.
          </p>
        </div>

        {/* Placeholder — prompt chain UI goes here */}
        <div className="rounded-xl border border-dashed border-grey-300 bg-grey-50 p-16 text-center dark:border-dsg-700 dark:bg-dsg-900">
          <p className="text-sm text-grey-400 dark:text-grey-500">
            Prompt chain steps will appear here once configured.
          </p>
        </div>
      </main>
    </div>
  );
}
