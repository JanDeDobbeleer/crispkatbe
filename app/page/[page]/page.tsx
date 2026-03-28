// app/page/[page]/page.tsx — paginated homepage
import { getAllPostMeta, paginate } from "@/lib/posts";
import PostCard from "@/components/PostCard";
import Pagination from "@/components/Pagination";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

const PAGE_SIZE = 10;

export async function generateStaticParams() {
  const posts = getAllPostMeta();
  const totalPages = Math.ceil(posts.length / PAGE_SIZE);
  // page 1 is handled by app/page.tsx; generate from 2 onwards
  return Array.from({ length: totalPages - 1 }, (_, i) => ({
    page: String(i + 2),
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ page: string }>;
}): Promise<Metadata> {
  const { page } = await params;
  return { title: `Posts — Page ${page}` };
}

export default async function PaginatedPage({
  params,
}: {
  params: Promise<{ page: string }>;
}) {
  const { page } = await params;
  const pageNum = parseInt(page, 10);
  const allPosts = getAllPostMeta();
  const { items, currentPage, totalPages } = paginate(allPosts, pageNum, PAGE_SIZE);

  if (!items.length) notFound();

  return (
    <>
      <h2 className="mb-6 font-serif italic text-sm text-[#999594] text-center">
        Page {currentPage}
      </h2>
      <div>
        {items.map((post) => (
          <PostCard key={post.slug} post={post} />
        ))}
      </div>
      <Pagination currentPage={currentPage} totalPages={totalPages} basePath="/page" />
    </>
  );
}
