import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-2 text-center px-4">
      <h1 className="text-2xl font-semibold text-slate-900">Page not found</h1>
      <p className="text-sm text-slate-500">The page you&apos;re looking for doesn&apos;t exist.</p>
      <Link href="/dashboard" className="text-brand-600 text-sm hover:underline mt-2">
        Back to dashboard
      </Link>
    </div>
  );
}
