import { redirect } from 'next/navigation';

export default async function CreditsPage() {
  redirect('/settings/billing');
}
