import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign Up | User Organiser",
  description: "Create a new User Organiser account"
};

export default function SignUpLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
} 