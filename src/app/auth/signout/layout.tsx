import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign Out | User Organiser",
  description: "Signing out of your User Organiser account"
};

export default function SignOutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
} 