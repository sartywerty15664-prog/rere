import { redirect } from 'next/navigation';

export const metadata = { title: 'Reset password', robots: { index: false, follow: false } };

export default function Page() {
  redirect('/login');
}
