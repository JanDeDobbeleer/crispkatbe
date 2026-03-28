// components/Header.tsx
import Link from "next/link";
import { getAllCategories } from "@/lib/categories";

const NAV_CATEGORY_LIMIT = 6;

export default function Header() {
  // Show only the most-used categories in the nav — matches crispkat.be's curated menu
  const topCategories = getAllCategories()
    .sort((a, b) => b.count - a.count)
    .slice(0, NAV_CATEGORY_LIMIT);

  const navItems = [
    { name: "Home", href: "/" },
    ...topCategories.map((cat) => ({ name: cat.name, href: `/category/${cat.slug}` })),
  ];

  return (
    <header>
      {/* ── Navigation ── at the very top, above the logo */}
      <nav className="bg-transparent border-b border-[#ddd8d0]">
        <div className="px-4 py-3">
          <div className="flex flex-wrap items-center justify-center">
            {navItems.map((item, i) => (
              <span key={item.href} className="flex items-center">
                <Link
                  href={item.href}
                  className="text-sm text-[#999594] hover:text-[#e57667] transition-colors px-1"
                >
                  {item.name}
                </Link>
                {i < navItems.length - 1 && (
                  <span className="text-[#c8b09a] mx-1 select-none">·</span>
                )}
              </span>
            ))}
          </div>
        </div>
      </nav>

      {/* ── Site branding ── large coral title, centred */}
      <div className="text-center py-14 border-b border-[#ddd8d0]">
        <Link href="/" className="inline-block">
          <h1 className="font-serif font-bold text-[#e57667] leading-none tracking-wide"
              style={{ fontSize: "5rem" }}>
            Crispkat
          </h1>
          <p className="font-serif italic text-lg text-[#999594] mt-3">Personal blog</p>
        </Link>
      </div>
    </header>
  );
}
