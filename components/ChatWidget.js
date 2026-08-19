"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MessageCircle, X, Send, Loader2 } from "lucide-react";
import { proxiedImage } from "@/lib/imageProxy";

export default function ChatWidget({ country = "pk", onResult }) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([
    {
      role: "bot",
      text: "Hello! Ask me for any live news — for example \"today's headlines\", \"top TV news\", or \"cricket updates\". You can also ask in Roman Urdu or Urdu.",
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    });
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    setMessages((prev) => [...prev, { role: "user", text }]);
    setInput("");
    setIsLoading(true);
    scrollToBottom();

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, country }),
      });
      const data = await res.json();

      if (!res.ok) {
        setMessages((prev) => [
          ...prev,
          { role: "bot", text: data.error || "Something went wrong, please try again." },
        ]);
        return;
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "bot",
          text: data.answer,
          videos: data.videos || [],
        },
      ]);

      onResult?.({
        query: text,
        answer: data.answer,
        videos: data.videos || [],
      });
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "bot", text: "Network error — please try again." },
      ]);
    } finally {
      setIsLoading(false);
      scrollToBottom();
    }
  };

  return (
    <>
      <motion.button
        onClick={() => setIsOpen((v) => !v)}
        aria-label={isOpen ? "Close chatbot" : "Open news chatbot"}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.92 }}
        className="fixed bottom-5 right-5 z-50 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-full p-4 shadow-2xl hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors"
      >
        {isOpen ? <X size={22} /> : <MessageCircle size={22} />}
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ type: "spring", damping: 26, stiffness: 300 }}
            className="fixed bottom-24 right-5 z-50 w-[92vw] max-w-sm h-[70vh] max-h-[560px] bg-white/95 dark:bg-[#0F172A]/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-200/90 dark:border-white/10 flex flex-col overflow-hidden"
          >
            <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 dark:from-[#0B0F17] dark:to-[#1E293B] text-white px-4 py-3 flex items-center justify-between border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-white/10 flex items-center justify-center">
                  <MessageCircle size={15} className="text-cyan-400" />
                </div>
                <div>
                  <p className="font-display italic text-lg leading-none font-medium">Pulse Assistant</p>
                  <p className="text-[11px] text-slate-300/70">Live TV News Intelligence</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-300 hover:text-white rounded-full p-1 transition-colors"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto no-scrollbar px-3.5 py-3.5 space-y-3">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-snug ${
                      m.role === "user"
                        ? "bg-indigo-600 text-white rounded-br-sm shadow-sm"
                        : "bg-slate-50 dark:bg-white/[0.06] text-slate-800 dark:text-slate-100 rounded-bl-sm border border-slate-200/80 dark:border-white/[0.08] shadow-sm"
                    }`}
                  >
                    <p>{m.text}</p>

                    {m.videos?.length > 0 && (
                      <div className="mt-3 pt-2.5 border-t border-slate-200/80 dark:border-white/10">
                        <p className="text-[10px] font-bold tracking-wider uppercase text-rose-600 dark:text-rose-400 mb-2 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                          TV News Broadcasts
                        </p>
                        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1">
                          {m.videos.slice(0, 8).map((v) => (
                            <a
                              key={v.id}
                              href={v.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="shrink-0 w-32 group"
                            >
                              <div className="w-32 h-18 rounded-lg overflow-hidden bg-slate-100 dark:bg-white/5 relative border border-slate-200/60 dark:border-white/10">
                                {v.thumbnail && (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={v.thumbnail}
                                    alt=""
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                    onError={(e) => (e.currentTarget.style.display = "none")}
                                  />
                                )}
                                <span className="absolute inset-0 flex items-center justify-center bg-black/30">
                                  <span className="w-6 h-6 rounded-full bg-rose-600 text-white flex items-center justify-center text-[10px]">
                                    ▶
                                  </span>
                                </span>
                                {v.channel && (
                                  <span className="absolute bottom-1 left-1 bg-black/80 text-white text-[9px] px-1.5 py-0.5 rounded font-medium truncate max-w-[90%]">
                                    {v.channel}
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-slate-700 dark:text-slate-300 leading-tight mt-1 line-clamp-2 font-medium">
                                {v.title}
                              </p>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-slate-50 dark:bg-white/[0.06] border border-slate-200/80 dark:border-white/[0.08] rounded-2xl rounded-bl-sm px-3.5 py-2 flex items-center gap-2">
                    <Loader2 size={14} className="animate-spin text-indigo-500" />
                    <span className="text-xs text-slate-500 dark:text-slate-400">Analyzing live broadcasts...</span>
                  </div>
                </div>
              )}
            </div>

            <div className="p-3 border-t border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#0B0F17] flex items-center gap-2">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                placeholder="Ask for any news, anytime..."
                autoFocus
                className="flex-1 bg-slate-50 dark:bg-white/[0.06] rounded-full px-4 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none border border-slate-200 dark:border-white/10 focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 transition-all"
              />
              <button
                onClick={sendMessage}
                disabled={isLoading || !input.trim()}
                aria-label="Send"
                className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-full p-2.5 disabled:opacity-40 shadow-sm hover:shadow transition-all"
              >
                <Send size={15} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}