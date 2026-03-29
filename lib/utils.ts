const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function withBasePath(src: string): string {
  return src.startsWith("/") ? `${basePath}${src}` : src;
}
