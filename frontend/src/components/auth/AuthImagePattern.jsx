import { MessageSquare } from "lucide-react";

// Decorative chat-bubble mock shown beside the auth forms on large screens.
const FLOATING_BUBBLES = [
  { text: "hey! you made it 🎉", mine: false, delay: "0ms" },
  { text: "just signed up — this looks slick", mine: true, delay: "120ms" },
  { text: "wait till you see read receipts ✨", mine: false, delay: "240ms" },
];

const AuthImagePattern = ({ title, subtitle }) => {
  return (
    <div className="app-bg relative hidden items-center justify-center overflow-hidden p-12 lg:flex">
      <div className="blobs" aria-hidden="true" />

      <div className="relative z-10 w-full max-w-md space-y-10">
        {/* Brand + heading */}
        <div className="space-y-5">
          <div className="grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-primary to-secondary text-primary-content shadow-xl shadow-primary/30">
            <MessageSquare className="size-7" strokeWidth={2.25} />
          </div>
          <div className="space-y-2">
            <h2 className="font-display text-4xl font-bold leading-tight text-base-content">
              {title}
            </h2>
            <p className="text-base-content/60">{subtitle}</p>
          </div>
        </div>

        {/* Floating conversation preview */}
        <div className="space-y-3">
          {FLOATING_BUBBLES.map((bubble, i) => (
            <div
              key={i}
              className={`flex animate-fade-in-up ${bubble.mine ? "justify-end" : "justify-start"}`}
              style={{ animationDelay: bubble.delay }}
            >
              <div
                className={`max-w-[80%] px-4 py-2.5 text-sm shadow-lg ${
                  bubble.mine
                    ? "bubble-sent rounded-2xl rounded-br-md"
                    : "bubble-recv rounded-2xl rounded-bl-md"
                }`}
              >
                {bubble.text}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AuthImagePattern;
