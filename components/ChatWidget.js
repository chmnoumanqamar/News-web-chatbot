"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MessageCircle, X, Send, Loader2 } from "lucide-react";
import { proxiedImage } from "@/lib/imageProxy";

// `onResult` lets the parent page mirror the latest answer's articles +
// videos into the main display, per the "sath display main b show karo"
// requirement — this component only owns the chat bubble UI itself.
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
        whileTap={{ scale: 0.92 }}
        className="fixed bottom-5 right-5 z-50 bg-slate dark:bg-oatmeal text-oatmeal dark:text-slate rounded-full p-4 shadow-2xl hover:bg-slate/90 dark:hover:bg-oatmeal/90 transition-colors"
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
            className="fixed bottom-24 right-5 z-50 w-[92vw] max-w-sm h-[70vh] max-h-[560px] bg-oatmeal dark:bg-slate rounded-2xl shadow-2xl border border-umber/15 dark:border-white/10 flex flex-col overflow-hidden"
          >
            <div className="bg-slate dark:bg-black/20 text-oatmeal px-4 py-3 flex items-center gap-2">
              <MessageCircle size={18} className="text-sea" />
              <div>
                <p className="font-display italic text-lg leading-none">Pulse Assistant</p>
                <p className="text-[11px] text-oatmeal/60">Live TV News Intelligence</p>
              </div>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto no-scrollbar px-3 py-3 space-y-3">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-snug ${
                      m.role === "user"
                        ? "bg-slate dark:bg-oatmeal text-oatmeal dark:text-slate rounded-br-sm"
                        : "bg-white dark:bg-white/10 text-slate dark:text-oatmeal rounded-bl-sm border border-umber/10 dark:border-white/10"
                    }`}
                  >
                    <p>{m.text}</p>

                    {m.videos?.length > 0 && (
                      <div className="mt-3 pt-2 border-t border-umber/10 dark:border-white/10">
                        <p className="text-[10px] font-semibold tracking-wider uppercase text-umber/70 dark:text-oatmeal/60 mb-1.5 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
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
                              <div className="w-32 h-18 rounded-lg overflow-hidden bg-umber/10 dark:bg-white/5 relative">
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
                                  <span className="w-6 h-6 rounded-full bg-red-600/90 text-white flex items-center justify-center text-[10px]">
                                    ▶
                                  </span>
                                </span>
                                {v.channel && (
                                  <span className="absolute bottom-1 left-1 bg-black/80 text-white text-[9px] px-1.5 py-0.5 rounded font-medium truncate max-w-[90%]">
                                    {v.channel}
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-umber dark:text-oatmeal/70 leading-tight mt-1 line-clamp-2">
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
                  <div className="bg-white dark:bg-white/10 border border-umber/10 dark:border-white/10 rounded-2xl rounded-bl-sm px-3 py-2 flex items-center gap-2">
                    <Loader2 size={14} className="animate-spin text-umber dark:text-oatmeal/60" />
                    <span className="text-xs text-umber dark:text-oatmeal/60">Thinking...</span>
                  </div>
                </div>
              )}
            </div>

            <div className="p-2.5 border-t border-umber/15 dark:border-white/10 bg-oatmeal dark:bg-slate flex items-center gap-2">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                placeholder="Ask for any news, anytime..."
                autoFocus
                className="flex-1 bg-white dark:bg-white/10 rounded-full px-4 py-2 text-sm text-slate dark:text-oatmeal placeholder:text-umber/50 dark:placeholder:text-oatmeal/40 outline-none border border-umber/15 dark:border-white/10 focus:border-slate/40 dark:focus:border-oatmeal/40"
              />
              <button
                onClick={sendMessage}
                disabled={isLoading || !input.trim()}
                aria-label="Send"
                className="bg-slate dark:bg-oatmeal text-oatmeal dark:text-slate rounded-full p-2.5 disabled:opacity-40 hover:bg-slate/90 dark:hover:bg-oatmeal/90 transition-colors"
              >
                <Send size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}