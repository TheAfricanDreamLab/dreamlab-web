import { redirect } from 'next/navigation';

/** /admin is the console's short address; signed-out visitors are sent to /admin/login first (proxy). */
export default function AdminPage(): never {
  redirect('/app/admin');
}
