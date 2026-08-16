export default function SkeletonCard({ featured = false }) {
  return (
    <div
      className={`rounded-2xl overflow-hidden border border-umber/10 dark:border-white/10 bg-white/40 dark:bg-white/[0.03] ${
        featured ? "md:col-span-2 md:row-span-2" : ""
      }`}
    >
      <div className={`shimmer animate-shimmer ${featured ? "h-64 md:h-96" : "h-40"}`} />
      <div className="p-4 space-y-2.5">
        <div className="shimmer animate-shimmer h-3 w-16 rounded-full" />
        <div className="shimmer animate-shimmer h-4 w-full rounded-full" />
        <div className="shimmer animate-shimmer h-4 w-3/4 rounded-full" />
      </div>
    </div>
  );
}
