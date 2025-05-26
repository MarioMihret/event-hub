import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Authentication Error | User Organiser",
  description: "An error occurred during authentication"
};

export default function AuthErrorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
} 