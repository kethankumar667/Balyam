import React from "react";
import { Mic, MicOff, Volume2, VolumeX, Radio } from "lucide-react";

interface VoiceIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
  className?: string;
}

export const MicOnIcon: React.FC<VoiceIconProps> = ({ size = 18, className = "text-emerald-400", ...props }) => (
  <Mic size={size} className={className} aria-hidden="true" {...props} />
);

export const MicOffIcon: React.FC<VoiceIconProps> = ({ size = 18, className = "text-rose-400", ...props }) => (
  <MicOff size={size} className={className} aria-hidden="true" {...props} />
);

export const SpeakerOnIcon: React.FC<VoiceIconProps> = ({ size = 18, className = "text-stone-300", ...props }) => (
  <Volume2 size={size} className={className} aria-hidden="true" {...props} />
);

export const SpeakerOffIcon: React.FC<VoiceIconProps> = ({ size = 18, className = "text-stone-500", ...props }) => (
  <VolumeX size={size} className={className} aria-hidden="true" {...props} />
);

export const VoiceActiveWaveIcon: React.FC<VoiceIconProps> = ({ size = 18, className = "text-emerald-400 animate-pulse", ...props }) => (
  <Radio size={size} className={className} aria-hidden="true" {...props} />
);
