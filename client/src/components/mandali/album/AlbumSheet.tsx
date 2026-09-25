import { useId, type ReactNode } from "react";
import { X } from "lucide-react";
import Modal from "../../Modal.js";
import { useTranslation } from "../../../hooks/useTranslation";
import { AlbumButton } from "./AlbumButton";

export interface AlbumSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** A line under the title in a quieter voice. */
  description?: string;
  children: ReactNode;
  /** Pinned below the scrolling body — the primary action lives here so it never scrolls away. */
  footer?: ReactNode;
}

/**
 * The one shell for every sheet and dialog in the Mandali area.
 *
 * A bottom sheet on a phone, a centred card from tablet up (the shared Modal's
 * `mobileSheet`), always with the same header: the title on the left, a labelled
 * Close on the right. Because they all look alike, a member who has opened one
 * knows how to leave every other. The Modal supplies the focus trap, Escape and
 * backdrop dismissal.
 */
export function AlbumSheet({ open, onClose, title, description, children, footer }: AlbumSheetProps) {
  const { t } = useTranslation();
  const titleId = useId();

  return (
    <Modal open={open} onClose={onClose} mobileSheet ariaLabelledBy={titleId} panelClassName="w-full max-w-md">
      <div className="album-surface flex max-h-[88dvh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl border border-album-line shadow-2xl sm:rounded-3xl">
        <div className="flex flex-shrink-0 items-start gap-3 px-5 pb-3 pt-5">
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="m-0 text-lg font-semibold leading-snug text-album-ink">
              {title}
            </h2>
            {description && <p className="m-0 mt-1 text-sm leading-snug text-album-ink3">{description}</p>}
          </div>
          <AlbumButton variant="ghost" size="icon" onClick={onClose} aria-label={t("mandali.close")} className="-mr-2 -mt-1">
            <X className="h-5 w-5" aria-hidden="true" />
          </AlbumButton>
        </div>

        <div className="album-scroll min-h-0 flex-1 overflow-y-auto px-5 pb-5">{children}</div>

        {footer && (
          <div className="flex-shrink-0 border-t border-album-line bg-album-page px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
            {footer}
          </div>
        )}
      </div>
    </Modal>
  );
}
