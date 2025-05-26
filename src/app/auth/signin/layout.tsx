import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In | User Organiser",
  description: "Sign in to your User Organiser account"
};

export default function SignInLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
} 