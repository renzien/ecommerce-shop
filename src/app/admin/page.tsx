import type { Metadata } from "next";
import { getAdmin } from "@/lib/auth";
import AdminApp from "@/components/admin-app";
import AdminLogin from "@/components/admin-login";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const metadata: Metadata = { title: "Ruang Admin", robots: { index: false, follow: false } };
export default async function AdminPage() {
  const admin = await getAdmin();
  return admin ? <AdminApp email={admin.email}/> : <AdminLogin/>;
}
