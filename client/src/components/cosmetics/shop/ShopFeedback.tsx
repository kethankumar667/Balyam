import { SecondaryButton } from "../../../design-system/dls";
import type { CosmeticsShop } from "../useCosmeticsShop";

export function ShopFeedback({ shop }: { shop: CosmeticsShop }) {
  const walletFailed = shop.walletStatus === "error" || shop.walletStatus === "unavailable";
  if (!shop.errorMessage && !walletFailed) return null;

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-2 px-4 py-3 sm:px-6">
      {shop.errorMessage && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-500/30 bg-surface-1 p-3 text-sm text-rose-700 dark:text-rose-300">
          <p className="min-w-0 flex-1 basis-48 [overflow-wrap:anywhere]">{shop.errorMessage}</p>
          <SecondaryButton size="sm" onClick={() => void shop.retryCatalog()} disabled={shop.isLoading}>Retry shop</SecondaryButton>
        </div>
      )}
      {walletFailed && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--chrome-hairline)] bg-surface-1 p-3 text-sm text-ink-hi">
          <p className="min-w-0 flex-1 basis-48">{shop.walletError || "Your wallet balance is unavailable. Owned styles can still be equipped."}</p>
          <SecondaryButton size="sm" onClick={() => void shop.retryWallet()}>Retry wallet</SecondaryButton>
        </div>
      )}
    </div>
  );
}
