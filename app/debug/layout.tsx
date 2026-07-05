import { notFound } from "next/navigation";

/**
 * Debug pages (/debug/*) are development tools only. In production they return
 * a 404 so they aren't publicly accessible on the deployed site.
 */
export default function DebugLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }
  return <>{children}</>;
}
