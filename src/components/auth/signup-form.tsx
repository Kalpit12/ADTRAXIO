"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { AuthInput } from "@/components/auth/auth-input";
import { AuthButton } from "@/components/auth/auth-button";
import { SocialAuthButton } from "@/components/auth/social-auth-button";
import { signInWithGoogle, signUpWithEmail } from "@/lib/auth/auth-service";
import { validateSignup, type FieldErrors } from "@/lib/auth/validation";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const stagger = {
  hidden: { opacity: 0, y: 10 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05, duration: 0.35 },
  }),
};

export function SignupForm() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const configured = isSupabaseConfigured();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");

    const fieldErrors = validateSignup({
      fullName,
      email,
      password,
      confirmPassword,
      termsAccepted,
    });
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) return;

    setLoading(true);
    const result = await signUpWithEmail(email, password, fullName);
    setLoading(false);

    if (result.error) {
      setFormError(result.error);
      return;
    }

    setSuccess(true);
    router.push("/onboarding");
  }

  async function handleGoogle() {
    setFormError("");
    setGoogleLoading(true);
    const result = await signInWithGoogle();
    setGoogleLoading(false);
    if (result.error) setFormError(result.error);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <motion.div custom={0} variants={stagger} initial="hidden" animate="show">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Create your ADTRAXIO account.
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Start building your social growth system.
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
          label="Full name"
          autoComplete="name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          error={errors.fullName}
          placeholder="Alex Morgan"
        />
      </motion.div>

      <motion.div custom={2} variants={stagger} initial="hidden" animate="show">
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

      <motion.div custom={3} variants={stagger} initial="hidden" animate="show">
        <AuthInput
          label="Password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          placeholder="At least 8 characters"
        />
      </motion.div>

      <motion.div custom={4} variants={stagger} initial="hidden" animate="show">
        <AuthInput
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          error={errors.confirmPassword}
          placeholder="Repeat password"
        />
      </motion.div>

      <motion.div custom={5} variants={stagger} initial="hidden" animate="show">
        <label className="flex cursor-pointer items-start gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={termsAccepted}
            onChange={(e) => setTermsAccepted(e.target.checked)}
            className="mt-0.5 size-3.5 rounded border-border accent-adtraxio-accent"
          />
          <span>
            I agree to the{" "}
            <Link href="#" className="text-foreground hover:text-adtraxio-accent">
              Terms
            </Link>{" "}
            and{" "}
            <Link href="#" className="text-foreground hover:text-adtraxio-accent">
              Privacy Policy
            </Link>
          </span>
        </label>
        {errors.terms && (
          <p className="mt-1 text-xs text-red-400" role="alert">
            {errors.terms}
          </p>
        )}
      </motion.div>

      <motion.div custom={6} variants={stagger} initial="hidden" animate="show">
        <AuthButton loading={loading} success={success}>
          Create account
        </AuthButton>
      </motion.div>

      <motion.div
        custom={7}
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

      <motion.div custom={8} variants={stagger} initial="hidden" animate="show">
        <SocialAuthButton
          loading={googleLoading}
          configured={configured}
          onClick={handleGoogle}
        />
      </motion.div>

      <motion.p
        custom={9}
        variants={stagger}
        initial="hidden"
        animate="show"
        className="text-center text-sm text-muted-foreground"
      >
        Already have an account?{" "}
        <Link
          href="/login"
          className={cn(
            "font-medium text-foreground transition-colors hover:text-adtraxio-accent"
          )}
        >
          Log in →
        </Link>
      </motion.p>
    </form>
  );
}
