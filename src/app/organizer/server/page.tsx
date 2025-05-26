// app/organizer/server/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import OrganizerPage from '../page';

export default async function Page({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/auth/signin");
  }
  
  // Extract the transaction reference from search params
  const txRef = searchParams.tx_ref as string || 
                searchParams.trx_ref as string || 
                searchParams.transaction_ref as string ||
                searchParams.ref as string;

  // Pass both session and txRef to OrganizerPage
  return <OrganizerPage session={session} txRef={txRef} />;
}