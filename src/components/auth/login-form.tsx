"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { AuthInput } from "@/components/auth/auth-input";
import { AuthButton } from "@/components/auth/auth-button";
import { SocialAuthButton } from "@/components/auth/social-auth-button";
import { signInWithEmail, signInWithGoogle } from "@/lib/auth/auth-service";
import { getPostAuthDestination } from "@/lib/onboarding/service";
import { validateLogin, type FieldErrors } from "@/lib/auth/validation";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const stagger = {
  hidden: { opacity: 0, y: 10 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.35 },
  }),
};

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const configured = isSupabaseConfigured();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");

    const fieldErrors = validateLogin({ email, password });
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) return;

    setLoading(true);
    const result = await signInWithEmail(email, password);
    setLoading(false);

    if (result.error) {
      setFormError(result.error);
      return;
    }

    setSuccess(true);
    const destination = await getPostAuthDestination();
    router.push(destination);
  }

  async function handleGoogle() {
    setFormError("");
    setGoogleLoading(true);
    const result = await signInWithGoogle();
    setGoogleLoading(false);
    if (result.error) setFormError(result.error);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <motion.div custom={0} variants={stagger} initial="hidden" animate="show">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Welcome back.
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Continue growing with ADTRAXIO.
        </p>
      </motion.div>

      {formError && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300"
          role="alert"
        >
          {formError}
        </motion.p>
      )}

      <motion.div custom={1} variants={stagger} initial="hidden" animate="show">
        <AuthInput
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
          placeholder="you@company.com"
        />
      </motion.div>

      <motion.div custom={2} variants={stagger} initial="hidden" animate="show">
        <AuthInput
          label="Password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          placeholder="••••••••"
        />
      </motion.div>

      <motion.div
        custom={3}
        variants={stagger}
        initial="hidden"
        animate="show"
        className="flex items-center justify-between gap-4"
      >
        <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="size-3.5 rounded border-border accent-adtraxio-accent"
          />
          Remember me
        </label>
        <Link
          href="#"
          className="text-sm text-muted-foreground transition-colors hover:text-adtraxio-accent"
        >
          Forgot password?
        </Link>
      </motion.div>

      <motion.div custom={4} variants={stagger} initial="hidden" animate="show">
        <AuthButton loading={loading} success={success}>
          Continue
        </AuthButton>
      </motion.div>

      <motion.div
        custom={5}
        variants={stagger}
        initial="hidden"
        animate="show"
        className="relative py-2"
      >
        <div className="absolute inset-x-0 top-1/2 h-px bg-border" />
        <p className="relative mx-auto w-fit bg-adtraxio-surface/90 px-3 text-xs text-muted-foreground">
          or continue with
        </p>
      </motion.div>

      <motion.div custom={6} variants={stagger} initial="hidden" animate="show">
        <SocialAuthButton
          loading={googleLoading}
          configured={configured}
          onClick={handleGoogle}
        />
      </motion.div>

      <motion.p
        custom={7}
        variants={stagger}
        initial="hidden"
        animate="show"
        className="text-center text-sm text-muted-foreground"
      >
        Don&apos;t have an account?{" "}
        <Link
          href="/signup"
          className={cn(
            "font-medium text-foreground transition-colors hover:text-adtraxio-accent"
          )}
        >
          Create one →
        </Link>
      </motion.p>
    </form>
  );
}
