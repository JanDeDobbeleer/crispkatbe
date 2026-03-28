// app/page.tsx  homepage (page 1)
import { getAllPostMeta, paginate } from "@/lib/posts";
import PostCard from "@/components/PostCard";
import Pagination from "@/components/Pagination";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "crispkat  Personal blog",
  description: "Personal blog by Katrien Crispeyn",
};

const PAGE_SIZE = 10;

export default function HomePage() {
  const allPosts = getAllPostMeta();
  const { items, totalPages } = paginate(allPosts, 1, PAGE_SIZE);

  return (
    <>
      <div>
        {items.map((post) => (
          <PostCard key={post.slug} post={post} />
        ))}
      </div>
      <Pagination currentPage={1} totalPages={totalPages} basePath="/page" />
    </>
  );
}
