import "./globals.css";

export const metadata = {
  title: "Pulse — News, as it happens",
  description:
    "Pulse is a live news feed with real-time headlines, smart categories, and a reading list that follows you.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Runs before React hydrates so the page never flashes the wrong
            theme on load. Reads the saved preference, falling back to the
            OS-level color-scheme setting if the user hasn't chosen yet. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("pulse-theme");var d=t?t==="dark":window.matchMedia("(prefers-color-scheme: dark)").matches;if(d)document.documentElement.classList.add("dark");}catch(e){}})();`,
          }}
        />
      </head>
      <body className="font-body antialiased bg-slate-50 dark:bg-[#0B0F17] text-slate-900 dark:text-slate-100 min-h-screen selection:bg-indigo-500 selection:text-white transition-colors duration-300">
        {children}
      </body>
    </html>
  );
}

