"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/hero", label: "Hero" },
  { href: "/work", label: "Work" },
  { href: "/series", label: "Series" },
  { href: "/studio", label: "Studio details" },
];

export function AdminNav({ owner }: { owner: boolean }) {
  const pathname = usePathname();
  const items = [...ITEMS, { href: "/account", label: owner ? "Editors & account" : "Account" }];
  return (
    <nav aria-label="Admin" className="grid gap-1">
      {items.map((item) => {
        const current = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={current ? "page" : undefined}
            className={cn(
              "flex min-h-11 items-center gap-3 text-[1.02rem] transition-colors",
              current ? "text-[var(--on-night)]" : "text-[var(--on-night-muted)] hover:text-[var(--on-night)]",
            )}
          >
            <span className={cn("size-1.5 rounded-full transition-colors", current ? "bg-brand" : "bg-white/20")} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

/** Page title, with the brand full stop, and a short note on what this screen changes. */
export function PageHead({ title, text }: { title: string; text: string }) {
  return (
    <header className="grid gap-3 border-b border-border pb-8">
      <h1 className="t-h1">
        {title}
        <span className="stop">.</span>
      </h1>
      <p className="max-w-[56ch] text-muted-foreground">{text}</p>
    </header>
  );
}
