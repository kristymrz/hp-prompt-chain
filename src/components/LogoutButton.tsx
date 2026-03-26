"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
  }

  return (
    <button
      onClick={handleLogout}
      className="rounded-lg border border-grey-200 bg-white px-3 py-1.5 text-sm font-medium text-grey-700 transition hover:bg-grey-50 dark:border-dsg-700 dark:bg-dsg-800 dark:text-grey-300 dark:hover:bg-dsg-700"
    >
      Sign out
    </button>
  );
}
