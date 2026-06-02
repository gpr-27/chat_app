import { useEffect, useRef, useState } from "react";
import { useChatStore } from "../../store/useChatStore";
import { ImagePlus, Send, Smile, X } from "lucide-react";
import toast from "react-hot-toast";

const EMOJIS = [
  "😀", "😁", "😂", "🤣", "😊", "😍", "😘", "😎",
  "🤔", "🙄", "😴", "😭", "😅", "😉", "🥳", "🤩",
  "👍", "👎", "🙏", "👏", "🙌", "💪", "🔥", "✨",
  "🎉", "❤️", "💯", "👀", "😜", "🤝", "🫶", "🚀",
];

const TYPING_TIMEOUT_MS = 1500;

const MessageInput = () => {
  const [text, setText] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const [isSending, setIsSending] = useState(false);
  const [showEmojis, setShowEmojis] = useState(false);

  const fileInputRef = useRef(null);
  const typingTimerRef = useRef(null);

  const { sendMessage, notifyTyping, notifyStopTyping, selectedUser } = useChatStore();

  // Stop the typing signal when the conversation changes or we unmount.
  useEffect(() => {
    return () => {
      clearTimeout(typingTimerRef.current);
      notifyStopTyping();
    };
  }, [selectedUser._id, notifyStopTyping]);

  const handleTextChange = (e) => {
    setText(e.target.value);
    notifyTyping();
    clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => notifyStopTyping(), TYPING_TIMEOUT_MS);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (isSending || (!text.trim() && !imagePreview)) return;

    clearTimeout(typingTimerRef.current);
    notifyStopTyping();
    setIsSending(true);
    try {
      await sendMessage({ text: text.trim(), image: imagePreview });
      setText("");
      removeImage();
      setShowEmojis(false);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to send message");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="glass relative border-t border-base-content/10 p-3 sm:p-4">
      {imagePreview && (
        <div className="mb-3 inline-flex">
          <div className="relative">
            <img
              src={imagePreview}
              alt="Preview"
              className="size-20 rounded-2xl object-cover ring-2 ring-primary/20 shadow-sm"
            />
            <button
              type="button"
              onClick={removeImage}
              className="absolute -right-2 -top-2 grid size-6 place-items-center rounded-full bg-base-300 shadow ring-1 ring-base-content/10 transition-colors hover:bg-error hover:text-error-content"
              aria-label="Remove image"
            >
              <X className="size-3.5" />
            </button>
          </div>
        </div>
      )}

      {showEmojis && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setShowEmojis(false)} />
          <div className="glass-card absolute bottom-full left-3 z-20 mb-2 grid w-72 grid-cols-8 gap-1 rounded-2xl border border-base-content/10 p-2 shadow-xl">
            {EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => setText((prev) => prev + emoji)}
                className="grid size-8 place-items-center rounded-lg text-lg transition-transform hover:scale-125 hover:bg-base-200"
              >
                {emoji}
              </button>
            ))}
          </div>
        </>
      )}

      <form onSubmit={handleSendMessage} className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setShowEmojis((v) => !v)}
          className={`btn btn-circle btn-ghost btn-sm ${showEmojis ? "text-primary" : "text-base-content/60"}`}
          aria-label="Insert emoji"
        >
          <Smile className="size-5" />
        </button>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="btn btn-circle btn-ghost btn-sm text-base-content/60"
          aria-label="Attach image"
        >
          <ImagePlus className="size-5" />
        </button>
        <input
          type="file"
          accept="image/*"
          className="hidden"
          ref={fileInputRef}
          onChange={handleImageChange}
        />

        <input
          type="text"
          value={text}
          onChange={handleTextChange}
          placeholder="Type a message…"
          className="input-soft flex-1"
        />

        <button
          type="submit"
          disabled={isSending || (!text.trim() && !imagePreview)}
          className="btn-grad size-11 rounded-full grid place-items-center transition-transform active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Send message"
        >
          <Send className="size-5" />
        </button>
      </form>
    </div>
  );
};

export default MessageInput;
