import React from "react";
import { Trophy, Crown, Medal, GitMerge, Swords, Eye, CheckCircle, Clock } from "lucide-react";

interface TournamentIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
  className?: string;
}

export const TournamentCupIcon: React.FC<TournamentIconProps> = ({ size = 20, className = "", ...props }) => (
  <Trophy size={size} className={className} aria-hidden="true" {...props} />
);

export const ChampionCrownIcon: React.FC<TournamentIconProps> = ({ size = 20, className = "", ...props }) => (
  <Crown size={size} className={className} aria-hidden="true" {...props} />
);

export const RunnerUpMedalIcon: React.FC<TournamentIconProps> = ({ size = 20, className = "", ...props }) => (
  <Medal size={size} className={className} aria-hidden="true" {...props} />
);

export const BracketTreeIcon: React.FC<TournamentIconProps> = ({ size = 20, className = "", ...props }) => (
  <GitMerge size={size} className={className} aria-hidden="true" {...props} />
);

export const SwordsClashIcon: React.FC<TournamentIconProps> = ({ size = 20, className = "", ...props }) => (
  <Swords size={size} className={className} aria-hidden="true" {...props} />
);

export const SpectatorEyeIcon: React.FC<TournamentIconProps> = ({ size = 18, className = "", ...props }) => (
  <Eye size={size} className={className} aria-hidden="true" {...props} />
);

export const CheckInBadgeIcon: React.FC<TournamentIconProps> = ({ size = 18, className = "", ...props }) => (
  <CheckCircle size={size} className={className} aria-hidden="true" {...props} />
);

export const CountdownClockIcon: React.FC<TournamentIconProps> = ({ size = 18, className = "", ...props }) => (
  <Clock size={size} className={className} aria-hidden="true" {...props} />
);
