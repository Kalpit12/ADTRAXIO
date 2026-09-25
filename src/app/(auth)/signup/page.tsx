import { AuthLayout } from "@/components/auth/auth-layout";
import { SignupForm } from "@/components/auth/signup-form";

export const metadata = {
  title: "Sign up — ADTRAXIO",
  description: "Create your ADTRAXIO account.",
};

export default function SignupPage() {
  return (
    <AuthLayout mode="signup">
      <SignupForm />
    </AuthLayout>
  );
}
