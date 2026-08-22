import { useState } from "react";
import { Link } from "react-router-dom";
import AppLayout from "../components/layout/AppLayout";
import {
  TYPOGRAPHY,
  SPACING,
  SURFACES,
  PrimaryButton,
  SecondaryButton,
  TournamentCTAButton,
  RewardButton,
  DangerButton,
  StandardLoungePageLayout,
  SectionHeaderBlock,
  DashboardGrid,
  Breadcrumbs,
} from "../design-system/dls";
import {
  RankTierIcon,
  GameCategoryIcon,
  AchievementRarityBadge,
  TournamentCupIcon,
  ChampionCrownIcon,
  StreakFlameIcon,
  LevelSparkleIcon,
  ShieldNavIcon,
} from "../design-system/icons";
import {
  PremiumCard,
  PremiumStatCard,
  PremiumProgressCard,
  RewardRevealModal,
  EmptyStateIllustration,
  PREMIUM_RANK_COLORS,
} from "../design-system/premium";
import { ArrowLeftIcon } from "../components/auth/authIcons";

export default function DesignSystemCatalogPage() {
  const [showRewardModal, setShowRewardModal] = useState(false);

  return (
    <AppLayout>
      <StandardLoungePageLayout
        backLink={
          <Link
            to="/"
            className="inline-flex items-center gap-2 min-h-[44px] py-2 pr-3 text-xs font-bold text-stone-400 hover:text-stone-100 transition"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            Back to Lounge
          </Link>
        }
        headerAction={
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono font-black text-amber-400 bg-amber-500/10 border border-amber-500/30 px-3 py-1 rounded-full uppercase">
              DLS v1.0.0 Active
            </span>
          </div>
        }
      >
        {/* Page Hero */}
        <div className={SURFACES.cardElevated + " p-6 sm:p-8 relative overflow-hidden"}>
          <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-amber-500/15 blur-3xl pointer-events-none" />
          <div className="space-y-2 relative z-10 max-w-2xl">
            <span className="text-xs font-mono uppercase tracking-widest text-amber-400 font-black">
              DESIGN GOVERNANCE & LIVING CATALOG
            </span>
            <h1 className={TYPOGRAPHY.heroTitle}>BHALYAM Design Language System</h1>
            <p className={TYPOGRAPHY.bodySubtle}>
              Official component standards, spatial hierarchy, gaming aesthetics, and interaction patterns.
            </p>
          </div>
        </div>

        {/* Section 1: Button System */}
        <div className="space-y-4">
          <SectionHeaderBlock
            title="1. Button System"
            subtitle="Standardized button variants with micro-interactions, touch targets, and hover states."
          />
          <div className="flex flex-wrap gap-3 items-center">
            <PrimaryButton>Primary Button</PrimaryButton>
            <SecondaryButton>Secondary Button</SecondaryButton>
            <TournamentCTAButton leftIcon={<TournamentCupIcon size={14} />}>
              Tournament Arena
            </TournamentCTAButton>
            <RewardButton leftIcon={<ChampionCrownIcon size={14} />}>
              Claim Rewards
            </RewardButton>
            <DangerButton>Knockout / Forfeit</DangerButton>
          </div>
        </div>

        {/* Section 2: Competitive Rank Shields */}
        <div className="space-y-4">
          <SectionHeaderBlock
            title="2. Competitive Rank Emblems & Shields"
            subtitle="Distinct vector crests and glowing radiance for all 7 competitive tiers."
          />
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {(["Bronze", "Silver", "Gold", "Platinum", "Diamond", "Master", "Grandmaster"] as const).map(
              (tier) => {
                const colorToken =
                  PREMIUM_RANK_COLORS[tier.toLowerCase() as keyof typeof PREMIUM_RANK_COLORS];
                return (
                  <div
                    key={tier}
                    className="bg-stone-900/90 border border-stone-800 rounded-2xl p-3.5 flex flex-col items-center justify-center space-y-2 shadow-lg group hover:scale-105 transition-transform"
                    style={{ borderColor: `${colorToken.primary}44` }}
                  >
                    <RankTierIcon tier={tier} size={48} />
                    <span
                      className="text-[10px] font-mono font-bold uppercase tracking-wider"
                      style={{ color: colorToken.primary }}
                    >
                      {tier}
                    </span>
                  </div>
                );
              }
            )}
          </div>
        </div>

        {/* Section 3: Achievement Rarity Frames */}
        <div className="space-y-4">
          <SectionHeaderBlock
            title="3. Achievement Rarity System"
            subtitle="Multi-tier rarity frames with glowing border gradients and particle badges."
          />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {(["common", "rare", "epic", "legendary", "mythic"] as const).map((rarity) => (
              <div
                key={rarity}
                className="bg-stone-900/80 border border-stone-800 rounded-2xl p-4 flex flex-col items-center text-center space-y-2"
              >
                <AchievementRarityBadge icon="👑" rarity={rarity} unlocked={true} size={52} />
                <span className="text-xs font-bold capitalize text-stone-200">{rarity} Tier</span>
                <span className="text-[10px] font-mono text-stone-500">Tier Frame Token</span>
              </div>
            ))}
          </div>
        </div>

        {/* Section 4: Game Category Icons */}
        <div className="space-y-4">
          <SectionHeaderBlock
            title="4. Custom Game Category Vectors"
            subtitle="Bespoke SVG gaming vector illustrations replacing generic icon packs."
          />
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {[
              "ludo",
              "uno",
              "rummy",
              "handcricket",
              "chess",
              "carrom",
              "snake",
              "spacewar",
            ].map((game) => (
              <div
                key={game}
                className="bg-stone-900/80 border border-stone-800 rounded-2xl p-3 flex flex-col items-center justify-center space-y-1.5"
              >
                <GameCategoryIcon game={game} size={32} />
                <span className="text-[11px] font-mono text-stone-300 font-bold uppercase">
                  {game}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Section 5: Premium Surface Cards & Stat Badges */}
        <div className="space-y-4">
          <SectionHeaderBlock
            title="5. Premium Cards & Metrics"
            subtitle="Glassmorphic stat panels, progress trackers, and interactive cards."
          />
          <DashboardGrid columns={3}>
            <PremiumStatCard
              label="Win Rate"
              value="78.4%"
              subValue="Top 8% in Lounge"
              icon={<StreakFlameIcon size={16} className="text-amber-400" />}
              accentColor="#F59E0B"
            />
            <PremiumStatCard
              label="Season Rating"
              value="2,450"
              subValue="Grandmaster Tier"
              icon={<ShieldNavIcon size={16} className="text-rose-400" />}
              accentColor="#F43F5E"
            />
            <PremiumProgressCard
              title="Battle Pass"
              subtitle="Season 1 Progression"
              current={480}
              total={600}
              progressPercent={80}
              icon={<LevelSparkleIcon size={16} className="text-amber-400" />}
            />
          </DashboardGrid>
        </div>

        {/* Section 6: Reward Modal & Empty State Demo */}
        <div className="space-y-4">
          <SectionHeaderBlock
            title="6. Reward Modals & Empty State Primitives"
            subtitle="Delightful feedback animations and encouraging empty state layouts."
          />
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <PrimaryButton onClick={() => setShowRewardModal(true)}>
              Preview Reward Reveal Modal
            </PrimaryButton>
          </div>
          <EmptyStateIllustration
            type="tournaments"
            title="Knockout Championship Schedule"
            description="Our bracket engine automatically sets up knockout competitions every evening."
            actionText="Browse Games"
            onAction={() => {}}
          />
        </div>

        {/* Section 7: Flipkart-Style Breadcrumbs */}
        <div className="space-y-4">
          <SectionHeaderBlock
            title="7. Flipkart-Style Breadcrumbs Hierarchy"
            subtitle="Compact, accessible horizontal hierarchy navigation with interactive links and clean chevrons."
          />
          <div className="p-4 rounded-2xl bg-stone-900/60 border border-stone-800 space-y-3">
            <div>
              <div className="text-[11px] font-mono uppercase text-stone-400 mb-1 font-semibold">Catalog Trail Example:</div>
              <Breadcrumbs
                crumbs={[
                  { label: "Home", path: "/" },
                  { label: "All Games", path: "/games" },
                  { label: "Card Games", path: "/games?c=cards" },
                  { label: "Indian Rummy 13-Card" },
                ]}
                className="!py-1.5 !border-0 !bg-stone-950/80 rounded-xl px-3"
                containerClassName="px-0"
              />
            </div>
            <div>
              <div className="text-[11px] font-mono uppercase text-stone-400 mb-1 font-semibold">Account / Profile Trail Example:</div>
              <Breadcrumbs
                crumbs={[
                  { label: "Home", path: "/" },
                  { label: "My Account", path: "/profile" },
                  { label: "Personal Information" },
                ]}
                className="!py-1.5 !border-0 !bg-stone-950/80 rounded-xl px-3"
                containerClassName="px-0"
              />
            </div>
            <div>
              <div className="text-[11px] font-mono uppercase text-stone-400 mb-1 font-semibold">Game Room Trail Example:</div>
              <Breadcrumbs
                crumbs={[
                  { label: "Home", path: "/" },
                  { label: "Game Lounge", path: "/games" },
                  { label: "Ludo Classic", path: "/games" },
                  { label: "Room #BHAL99" },
                ]}
                className="!py-1.5 !border-0 !bg-stone-950/80 rounded-xl px-3"
                containerClassName="px-0"
              />
            </div>
          </div>
        </div>

        {/* Interactive Reward Reveal Modal */}
        <RewardRevealModal
          isOpen={showRewardModal}
          onClose={() => setShowRewardModal(false)}
          title="Victory Celebration!"
          rewardName="Ludo Championship Winner"
          badge="🏆"
          earnedXP={500}
          subtitle="You have defeated the arena bracket and earned 500 XP!"
        />
      </StandardLoungePageLayout>
    </AppLayout>
  );
}
