export default function SkeletonCard({ featured = false }) {
  return (
    <div
      className={`rounded-2xl overflow-hidden border border-slate-200/90 dark:border-white/[0.08] bg-white dark:bg-[#111827] ${
        featured ? "md:col-span-2 md:row-span-2" : ""
      }`}
    >
      <div className={`shimmer animate-shimmer ${featured ? "h-64 md:h-96" : "h-44"}`} />
      <div className="p-4 sm:p-5 space-y-3">
        <div className="shimmer animate-shimmer h-3 w-16 rounded-full" />
        <div className="shimmer animate-shimmer h-5 w-full rounded-md" />
        <div className="shimmer animate-shimmer h-4 w-3/4 rounded-md" />
      </div>
    </div>
  );
}

