"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import ThemeToggle from "./ThemeToggle";
import LogoutButton from "./LogoutButton";

const navLinks = [
  { label: "Flavors", href: "/", match: (p: string) => p === "/" || p.startsWith("/humor-flavors") },
  { label: "Captions", href: "/captions", match: (p: string) => p.startsWith("/captions") },
  { label: "Testing", href: "/testing", match: (p: string) => p.startsWith("/testing") },
];

export default function Nav({ email }: { email?: string }) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-grey-200 bg-white dark:border-dsg-800 dark:bg-dsg-900">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-6">

        {/* Title */}
        <span className="shrink-0 font-mono text-xs font-bold tracking-widest text-dsg-700 uppercase dark:text-dsg-200">
          Prompt Chaining by Kristy
        </span>

        {/* Nav links */}
        <nav className="flex items-center gap-1">
          {navLinks.map(({ label, href, match }) => {
            const active = match(pathname);
            return (
              <Link
                key={href}
                href={href}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300"
                    : "text-grey-500 hover:bg-grey-50 hover:text-grey-900 dark:text-grey-400 dark:hover:bg-dsg-800 dark:hover:text-grey-100"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Right side */}
        <div className="ml-auto flex items-center gap-3">
          <ThemeToggle />
          {email && (
            <span className="hidden text-sm text-grey-400 dark:text-grey-500 sm:block">
              {email}
            </span>
          )}
          <LogoutButton />
        </div>

      </div>
    </header>
  );
}
