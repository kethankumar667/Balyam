import { useRef, useState, type FormEvent } from "react";
import { HandCoins, Send, Smile } from "lucide-react";
import { useTranslation } from "../../../hooks/useTranslation";
import EmojiPicker, { insertAtCaret } from "../EmojiPicker";
import { AlbumButton } from "./AlbumButton";

const CHAT_MAX_LENGTH = 500;

export interface ComposerProps {
  /** The group's name — the placeholder addresses them: "Write a line to Nellore Gang…". */
  groupName: string;
  onSend: (text: string) => void;
  onRequestCoins: () => void;
  coinCoolingDown?: boolean;
  /** phone: emoji picker spans the width, Send is an icon. desktop: Send carries its word. */
  variant: "phone" | "desktop";
}

/**
 * Where a line gets written. One component for both layouts, so the wording,
 * the emoji behaviour and the disabled states can never drift apart.
 */
export function Composer({ groupName, onSend, onRequestCoins, coinCoolingDown, variant }: ComposerProps) {
  const { t } = useTranslation();
  const [text, setText] = useState("");
  const [emojiOpen, setEmojiOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const line = text.trim();
    if (!line) return;
    onSend(line);
    setEmojiOpen(false);
    setText("");
  };

  const addEmoji = (emoji: string) => {
    const result = insertAtCaret(inputRef.current, text, emoji, CHAT_MAX_LENGTH);
    if (!result) return;
    setText(result.next);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.setSelectionRange(result.caret, result.caret);
    });
  };

  const coinLabel = coinCoolingDown ? t("mandali.chat.askCoinsCooldown") : t("mandali.chat.askCoins");

  return (
    <form onSubmit={submit} className="relative flex flex-shrink-0 items-center gap-2 border-t border-album-line bg-album-page px-3 py-3 sm:px-5">
      {/* Called with nothing: passing the handler straight to onClick would hand it the click event. */}
      <AlbumButton variant="ghost" size="icon" onClick={() => onRequestCoins()} aria-label={coinLabel} title={coinLabel} className="relative">
        <HandCoins className="h-5 w-5" aria-hidden="true" />
        {coinCoolingDown && (
          <span aria-hidden="true" className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-album-ribbon ring-2 ring-album-page" />
        )}
      </AlbumButton>

      <div className="relative flex-1">
        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={(event) => setText(event.target.value)}
          maxLength={CHAT_MAX_LENGTH}
          placeholder={variant === "phone" ? t("mandali.chat.placeholderShort") : t("mandali.chat.placeholder", { name: groupName })}
          aria-label={t("mandali.chat.placeholder", { name: groupName })}
          className="album-focus min-h-[48px] w-full rounded-2xl border border-album-line bg-album-field pl-4 pr-12 text-[15px] text-album-ink placeholder:text-album-ink3 focus-visible:border-album-foil"
        />
        <EmojiPicker fullWidth={variant === "phone"} open={emojiOpen} onSelect={addEmoji} onClose={() => setEmojiOpen(false)} />
        <button
          type="button"
          data-emoji-trigger
          onClick={() => setEmojiOpen((open) => !open)}
          aria-expanded={emojiOpen}
          aria-label={t("mandali.chat.emoji")}
          className="album-focus absolute right-0 top-0 flex h-full min-w-[48px] items-center justify-center rounded-2xl text-album-ink3 hover:text-album-foil"
        >
          <Smile className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      <AlbumButton
        type="submit"
        variant="primary"
        size={variant === "desktop" ? "lg" : "icon"}
        disabled={!text.trim()}
        aria-label={t("mandali.chat.send")}
        icon={<Send className="h-[18px] w-[18px]" aria-hidden="true" />}
        className={variant === "phone" ? "min-h-[48px] min-w-[48px]" : ""}
      >
        {variant === "desktop" ? t("mandali.chat.send") : null}
      </AlbumButton>
    </form>
  );
}
