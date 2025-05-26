import ApplicationStatusClient from './ApplicationStatusClient';
import { notFound } from 'next/navigation';

export default async function ApplicationStatusPage({ params: rawParams }: { params: { id: string } }) {
  const params = await rawParams; // Re-added await
  const { id } = params;
  
  // Validate ObjectId format (24-character hex string)
  const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(id);
  if (!isValidObjectId) {
    console.warn(`Invalid ObjectId format in URL: ${id}`);
    notFound();
  }
  
  return <ApplicationStatusClient applicationId={id} />;
}