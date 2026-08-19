import React from "react";
import {
  Home,
  Gamepad2,
  Trophy,
  User,
  Swords,
  Award,
  Users,
  Tv,
  Settings,
  Bell,
  Search,
  ArrowLeft,
  ChevronRight,
  ExternalLink,
  Share2,
  Sparkles,
  Flame,
  Zap,
  Clock,
  Shield,
  Filter,
} from "lucide-react";

interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
  className?: string;
}

export const HomeNavIcon: React.FC<IconProps> = ({ size = 20, className = "", ...props }) => (
  <Home size={size} className={className} aria-hidden="true" {...props} />
);

export const GamesNavIcon: React.FC<IconProps> = ({ size = 20, className = "", ...props }) => (
  <Gamepad2 size={size} className={className} aria-hidden="true" {...props} />
);

export const LeaderboardNavIcon: React.FC<IconProps> = ({ size = 20, className = "", ...props }) => (
  <Trophy size={size} className={className} aria-hidden="true" {...props} />
);

export const ProfileNavIcon: React.FC<IconProps> = ({ size = 20, className = "", ...props }) => (
  <User size={size} className={className} aria-hidden="true" {...props} />
);

export const TournamentsNavIcon: React.FC<IconProps> = ({ size = 20, className = "", ...props }) => (
  <Swords size={size} className={className} aria-hidden="true" {...props} />
);

export const AchievementsNavIcon: React.FC<IconProps> = ({ size = 20, className = "", ...props }) => (
  <Award size={size} className={className} aria-hidden="true" {...props} />
);

export const SocialNavIcon: React.FC<IconProps> = ({ size = 20, className = "", ...props }) => (
  <Users size={size} className={className} aria-hidden="true" {...props} />
);

export const PartyNavIcon: React.FC<IconProps> = ({ size = 20, className = "", ...props }) => (
  <Tv size={size} className={className} aria-hidden="true" {...props} />
);

export const SettingsNavIcon: React.FC<IconProps> = ({ size = 20, className = "", ...props }) => (
  <Settings size={size} className={className} aria-hidden="true" {...props} />
);

export const NotificationNavIcon: React.FC<IconProps> = ({ size = 20, className = "", ...props }) => (
  <Bell size={size} className={className} aria-hidden="true" {...props} />
);

export const SearchNavIcon: React.FC<IconProps> = ({ size = 18, className = "", ...props }) => (
  <Search size={size} className={className} aria-hidden="true" {...props} />
);

export const BackNavIcon: React.FC<IconProps> = ({ size = 18, className = "", ...props }) => (
  <ArrowLeft size={size} className={className} aria-hidden="true" {...props} />
);

export const ChevronRightNavIcon: React.FC<IconProps> = ({ size = 16, className = "", ...props }) => (
  <ChevronRight size={size} className={className} aria-hidden="true" {...props} />
);

export const ExternalLinkNavIcon: React.FC<IconProps> = ({ size = 16, className = "", ...props }) => (
  <ExternalLink size={size} className={className} aria-hidden="true" {...props} />
);

export const ShareNavIcon: React.FC<IconProps> = ({ size = 18, className = "", ...props }) => (
  <Share2 size={size} className={className} aria-hidden="true" {...props} />
);

export const SparklesIcon: React.FC<IconProps> = ({ size = 18, className = "", ...props }) => (
  <Sparkles size={size} className={className} aria-hidden="true" {...props} />
);

export const FlameIcon: React.FC<IconProps> = ({ size = 18, className = "", ...props }) => (
  <Flame size={size} className={className} aria-hidden="true" {...props} />
);

export const LightningIcon: React.FC<IconProps> = ({ size = 18, className = "", ...props }) => (
  <Zap size={size} className={className} aria-hidden="true" {...props} />
);

export const TimeIcon: React.FC<IconProps> = ({ size = 16, className = "", ...props }) => (
  <Clock size={size} className={className} aria-hidden="true" {...props} />
);

export const ShieldNavIcon: React.FC<IconProps> = ({ size = 18, className = "", ...props }) => (
  <Shield size={size} className={className} aria-hidden="true" {...props} />
);

export const FilterNavIcon: React.FC<IconProps> = ({ size = 16, className = "", ...props }) => (
  <Filter size={size} className={className} aria-hidden="true" {...props} />
);
