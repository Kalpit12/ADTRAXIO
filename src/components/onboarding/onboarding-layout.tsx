"use client";

import { AuthBackground } from "@/components/auth/auth-background";
import { AuthBrandPanel } from "@/components/auth/auth-brand-panel";
import { AuthCard } from "@/components/auth/auth-card";
import { cn } from "@/lib/utils";

interface OnboardingLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export function OnboardingLayout({ children, className }: OnboardingLayoutProps) {
  return (
    <div className="relative min-h-screen">
      <AuthBackground />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-5xl flex-col px-6 py-8 lg:px-8 lg:py-12">
        <div className="mb-6 lg:mb-8">
          <AuthBrandPanel compact />
        </div>

        <AuthCard className={cn("mx-auto w-full max-w-2xl", className)}>
          {children}
        </AuthCard>
      </div>
    </div>
  );
}
