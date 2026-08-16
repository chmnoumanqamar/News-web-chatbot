export default function Footer() {
  return (
    <footer className="border-t border-umber/15 dark:border-white/10 mt-16">
      <div className="max-w-6xl mx-auto px-5 md:px-8 py-10 flex flex-col md:flex-row items-center justify-between gap-4">
        <p className="font-display italic text-xl text-slate dark:text-oatmeal">Pulse</p>
        <p className="text-xs text-umber dark:text-oatmeal/50 text-center">
          Headlines refresh automatically every few minutes. Powered by{" "}
          <a
            href="https://newsapi.org"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-slate dark:hover:text-oatmeal"
          >
            NewsAPI.org
          </a>
          .
        </p>
      </div>
    </footer>
  );
}
