// components/Pagination.tsx
import Link from "next/link";

interface Props {
  currentPage: number;
  totalPages: number;
  basePath: string; // e.g. "/page" or "/category/personal/page"
}

export default function Pagination({ currentPage, totalPages, basePath }: Props) {
  if (totalPages <= 1) return null;

  const prev = currentPage > 1 ? currentPage - 1 : null;
  const next = currentPage < totalPages ? currentPage + 1 : null;

  function pageHref(n: number) {
    return n === 1 ? "/" : `${basePath}/${n}`;
  }

  return (
    <nav className="mt-8 flex items-center justify-between">
      {prev !== null ? (
        <Link
          href={pageHref(prev)}
          className="border-2 border-[#999594] rounded-full text-[#999594] text-xs font-bold uppercase tracking-widest px-6 py-2 hover:bg-[#e57667] hover:border-[#e57667] hover:text-white transition-all"
        >
          ← Newer posts
        </Link>
      ) : (
        <span />
      )}

      <span className="font-serif italic text-sm text-[#999594]">
        Page {currentPage} of {totalPages}
      </span>

      {next !== null ? (
        <Link
          href={pageHref(next)}
          className="border-2 border-[#999594] rounded-full text-[#999594] text-xs font-bold uppercase tracking-widest px-6 py-2 hover:bg-[#e57667] hover:border-[#e57667] hover:text-white transition-all"
        >
          Older posts →
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
