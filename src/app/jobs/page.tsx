import { redirect } from 'next/navigation';

export default function JobsAliasPage() {
  // Alias /jobs -> / (homepage job search)
  redirect('/');
}
