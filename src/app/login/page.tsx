import type { Metadata } from "next";
import Image from "next/image";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

/** Split screen: the copper key visual with the wordmark, and the form open on paper (no floating box). */
export default function LoginPage() {
  return (
    <main className="grid min-h-svh bg-paper lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      <section className="relative isolate flex min-h-[200px] flex-col justify-between gap-10 overflow-hidden bg-night px-6 py-7 text-[var(--on-night)] [--brand:var(--brand-soft)] sm:px-10 lg:min-h-svh lg:px-14 lg:py-12">
        <Image src="/images/hero-copper.jpg" alt="" fill priority sizes="(min-width: 1024px) 55vw, 100vw" className="-z-10 object-cover" />
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[linear-gradient(to_top,oklch(0.17_0.006_40/0.75),transparent_60%)]" />
        <span className="t-label marker">Admin</span>
        <div className="grid gap-4">
          <Image src="/images/logo-white.png" alt="Vision Blend" width={900} height={180} className="h-auto w-full max-w-[200px] lg:max-w-[360px]" priority />
          <p className="max-w-[34ch] text-[0.95rem] text-[var(--on-night-muted)] max-lg:hidden">Changes you save here show on visionblend.in on the next visit.</p>
        </div>
      </section>

      <section className="flex items-center px-6 py-12 sm:px-10 lg:px-16">
        <div className="grid w-full max-w-[400px] gap-10">
          <div className="grid gap-3">
            <h1 className="t-h1">
              Sign in<span className="stop">.</span>
            </h1>
            <p className="text-muted-foreground">Edit the hero, the work, the series, the team and the studio details.</p>
          </div>
          <LoginForm />
        </div>
      </section>
    </main>
  );
}
