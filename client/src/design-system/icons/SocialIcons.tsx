import React from "react";
import { Users, UserPlus, UserMinus, MessageSquare, Flame, Sparkles } from "lucide-react";

interface SocialIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
  className?: string;
}

export const FriendUserIcon: React.FC<SocialIconProps> = ({ size = 18, className = "", ...props }) => (
  <Users size={size} className={className} aria-hidden="true" {...props} />
);

export const AddFriendUserIcon: React.FC<SocialIconProps> = ({ size = 18, className = "", ...props }) => (
  <UserPlus size={size} className={className} aria-hidden="true" {...props} />
);

export const RemoveFriendUserIcon: React.FC<SocialIconProps> = ({ size = 18, className = "", ...props }) => (
  <UserMinus size={size} className={className} aria-hidden="true" {...props} />
);

export const ChatBubbleIcon: React.FC<SocialIconProps> = ({ size = 18, className = "", ...props }) => (
  <MessageSquare size={size} className={className} aria-hidden="true" {...props} />
);

export const StreakFlameIcon: React.FC<SocialIconProps> = ({ size = 16, className = "", ...props }) => (
  <Flame size={size} className={className} aria-hidden="true" {...props} />
);

export const LevelSparkleIcon: React.FC<SocialIconProps> = ({ size = 16, className = "", ...props }) => (
  <Sparkles size={size} className={className} aria-hidden="true" {...props} />
);
