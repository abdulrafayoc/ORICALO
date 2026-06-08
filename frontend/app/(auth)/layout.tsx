import Link from "next/link";
import { BrandMark } from "@/components/ui/brand-mark";

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen bg-background paper-noise flex flex-col">
      <header className="px-6 lg:px-8 h-16 flex items-center">
        <Link href="/" className="flex items-center gap-3 group">
          <BrandMark size={28} />
          <span className="font-serif text-lg leading-tight text-foreground group-hover:text-accent transition-colors">
            Oricalo
          </span>
        </Link>
      </header>
      <main className="flex-1 flex items-center justify-center px-4 pb-12">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
