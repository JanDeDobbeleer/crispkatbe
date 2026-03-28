// components/PostCard.tsx
import Link from "next/link";
import type { PostMeta } from "@/lib/types";

interface Props {
  post: PostMeta;
}

/** Document icon — matches the Sobe theme's "standard" post-format indicator */
function DocumentIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="white"
      width="26"
      height="26"
      aria-hidden="true"
    >
      <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 14H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
    </svg>
  );
}

/** Heart icon */
function HeartIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="white"
      width="22"
      height="22"
      aria-hidden="true"
    >
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
  );
}

export default function PostCard({ post }: Props) {
  const date = new Date(post.date).toLocaleDateString("nl-BE", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <article className="bg-white mb-8 relative" style={{ paddingTop: "3em", paddingBottom: "3em", paddingLeft: "5rem", paddingRight: "2rem" }}>
      {/* Post-format badge — document icon (Sobe theme style) */}
      <div className="absolute" style={{ left: "1.5rem", top: "-1.125rem" }}>
        {/* Document badge: sharp top-left, rounded other corners */}
        <div
          className="w-14 h-14 flex items-center justify-center bg-[#a4aeb3]"
          style={{ borderRadius: "3px 54px 54px 54px" }}
        >
          <DocumentIcon />
        </div>
        {/* Heart badge below */}
        <div className="mt-2 w-12 h-12 flex items-center justify-center bg-[#e57667] rounded-full mx-auto">
          <HeartIcon />
        </div>
      </div>

      {/* Category links */}
      <div className="flex flex-wrap gap-3 mb-2">
        {post.categories.map((cat) => {
          const slug = cat.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
          return (
            <Link
              key={cat}
              href={`/category/${slug}`}
              className="text-xs font-bold uppercase tracking-widest text-[#999594] hover:text-[#e57667] transition-colors"
            >
              {cat}
            </Link>
          );
        })}
      </div>

      <Link href={`/posts/${post.slug}`}>
        <h2 className="font-serif font-bold text-[#a4aeb3] text-2xl leading-snug hover:text-[#e57667] transition-colors mb-1">
          {post.title || "(untitled)"}
        </h2>
      </Link>

      <time
        className="block text-xs font-bold uppercase tracking-widest text-[#999594] mb-4"
        dateTime={post.date}
      >
        {date}
      </time>

      {post.excerpt && (
        <p className="text-sm text-[#666] leading-relaxed mb-6">{post.excerpt}</p>
      )}

      <Link
        href={`/posts/${post.slug}`}
        className="inline-block border-2 border-[#999594] rounded-full text-[#999594] text-xs font-bold uppercase tracking-widest px-6 py-2 hover:bg-[#e57667] hover:border-[#e57667] hover:text-white transition-all"
      >
        Read more
      </Link>
    </article>
  );
}
