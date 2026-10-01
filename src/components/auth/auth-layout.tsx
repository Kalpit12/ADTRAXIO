"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { AuthBackground } from "@/components/auth/auth-background";
import { AuthBrandPanel } from "@/components/auth/auth-brand-panel";
import { AuthCard } from "@/components/auth/auth-card";

interface AuthLayoutProps {
  mode: "login" | "signup";
  children: React.ReactNode;
}

export function AuthLayout({ mode, children }: AuthLayoutProps) {
  return (
    <div className="relative min-h-screen">
      <AuthBackground />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-8 lg:px-8 lg:py-12">
        <Link
          href="/"
          className="mb-6 inline-flex w-fit items-center gap-2 rounded-md text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-adtraxio-accent/50"
        >
          <ArrowLeft className="size-4 shrink-0" aria-hidden />
          Back to home
        </Link>

        {/* Mobile branding */}
        <div className="mb-8 lg:hidden">
          <AuthBrandPanel />
        </div>

        <div className="grid flex-1 items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <div className="hidden lg:block">
            <AuthBrandPanel />
          </div>

          <AuthCard>
            <AnimatePresence mode="wait">
              <motion.div
                key={mode}
                initial={{ opacity: 0, x: mode === "login" ? -12 : 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: mode === "login" ? 12 : -12 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </AuthCard>
        </div>
      </div>
    </div>
  );
}
