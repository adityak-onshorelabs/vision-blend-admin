import type { Metadata } from "next";
import Image from "next/image";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <main className="grid min-h-svh place-items-center px-5 py-12">
      <div className="grid w-full max-w-[420px] gap-8 bg-paper px-7 pb-9 pt-8 sm:px-10">
        <div className="grid gap-5">
          <Image src="/images/logo-brown.png" alt="Vision Blend" width={130} height={26} className="h-[26px] w-auto justify-self-start" priority />
          <div className="grid gap-2">
            <h1 className="t-h2">
              Sign in<span className="stop">.</span>
            </h1>
            <p className="text-[0.95rem] text-muted-foreground">Edit the work, the series, the hero and the studio details.</p>
          </div>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
