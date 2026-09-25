import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { mapAuthError } from "@/lib/auth/validation";

export type AuthResult = {
  error?: string;
  success?: boolean;
};

export async function signInWithEmail(
  email: string,
  password: string
): Promise<AuthResult> {
  if (!isSupabaseConfigured()) {
    return {
      error:
        "Authentication is not configured yet. Add Supabase environment variables to enable sign in.",
    };
  }

  const supabase = createClient();
  if (!supabase) {
    return { error: "Unable to initialize authentication." };
  }

  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (error) {
    return { error: mapAuthError(error.message) };
  }

  return { success: true };
}

export async function signUpWithEmail(
  email: string,
  password: string,
  fullName: string
): Promise<AuthResult> {
  if (!isSupabaseConfigured()) {
    return {
      error:
        "Authentication is not configured yet. Add Supabase environment variables to enable sign up.",
    };
  }

  const supabase = createClient();
  if (!supabase) {
    return { error: "Unable to initialize authentication." };
  }

  const { error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: {
      data: {
        full_name: fullName.trim(),
      },
    },
  });

  if (error) {
    return { error: mapAuthError(error.message) };
  }

  return { success: true };
}

export async function signInWithGoogle(): Promise<AuthResult> {
  if (!isSupabaseConfigured()) {
    return {
      error:
        "Google sign-in is not configured. Add Supabase environment variables first.",
    };
  }

  const supabase = createClient();
  if (!supabase) {
    return { error: "Unable to initialize authentication." };
  }

  const origin =
    typeof window !== "undefined" ? window.location.origin : undefined;

  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: origin
        ? `${origin}/auth/callback?next=/onboarding`
        : undefined,
    },
  });

  if (error) {
    return { error: mapAuthError(error.message) };
  }

  return { success: true };
}

export async function signOut(): Promise<AuthResult> {
  if (!isSupabaseConfigured()) {
    return { success: true };
  }

  const supabase = createClient();
  if (!supabase) {
    return { error: "Unable to initialize authentication." };
  }

  const { error } = await supabase.auth.signOut();
  if (error) {
    return { error: mapAuthError(error.message) };
  }

  return { success: true };
}
