import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Verify Email | User Organiser",
  description: "Verify your email to complete the sign-in process"
};

export default function VerifyRequestLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
} 