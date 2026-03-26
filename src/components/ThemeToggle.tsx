"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

const options = [
  {
    value: "light",
    label: "Light",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
      </svg>
    ),
  },
  {
    value: "system",
    label: "System",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <path d="M8 21h8M12 17v4" />
      </svg>
    ),
  },
  {
    value: "dark",
    label: "Dark",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
      </svg>
    ),
  },
] as const;

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch — only render after mount
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="h-8 w-[108px]" />;

  return (
    <div
      className="flex items-center rounded-lg border border-grey-200 bg-grey-50 p-0.5 dark:border-dsg-700 dark:bg-dsg-900"
      role="group"
      aria-label="Theme selector"
    >
      {options.map(({ value, label, icon }) => {
        const active = theme === value;
        return (
          <button
            key={value}
            onClick={() => setTheme(value)}
            aria-label={`${label} theme`}
            title={label}
            className={`flex items-center justify-center rounded-md p-1.5 transition-colors ${
              active
                ? "bg-white text-teal-700 shadow-sm dark:bg-dsg-700 dark:text-teal-300"
                : "text-grey-500 hover:text-grey-800 dark:text-grey-400 dark:hover:text-grey-100"
            }`}
          >
            {icon}
          </button>
        );
      })}
    </div>
  );
}
