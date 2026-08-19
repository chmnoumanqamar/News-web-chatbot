export default function Footer() {
  return (
    <footer className="border-t border-slate-200/80 dark:border-white/[0.08] mt-16 bg-white/50 dark:bg-[#0B0F17]/50">
      <div className="max-w-6xl mx-auto px-5 md:px-8 py-10 flex flex-col md:flex-row items-center justify-between gap-4">
        <p className="font-display italic font-bold text-xl text-slate-900 dark:text-white">Pulse</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
          Headlines refresh automatically every few minutes. Powered by{" "}
          <a
            href="https://newsapi.org"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            NewsAPI.org
          </a>
          .
        </p>
      </div>
    </footer>
  );
}

