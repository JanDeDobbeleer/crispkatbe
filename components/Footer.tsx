// components/Footer.tsx
export default function Footer() {
  return (
    <footer className="mt-8 py-6 text-center">
      <p className="font-serif italic text-sm text-[#999594]">
        &copy; {new Date().getFullYear()} Crispkat &mdash; Personal blog
      </p>
    </footer>
  );
}
