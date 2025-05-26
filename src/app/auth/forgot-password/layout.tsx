import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reset Password | User Organiser",
  description: "Reset your User Organiser account password"
};

export default function ForgotPasswordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
} 