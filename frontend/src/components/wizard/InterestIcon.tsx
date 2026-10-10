import React from 'react';
import {
  Cpu,
  Binary,
  Atom,
  HeartPulse,
  TrendingUp,
  Palette,
  MessageSquareText,
  Leaf,
  Wrench,
  Users,
  Trophy,
  Compass,
  Sparkles,
  HelpCircle
} from 'lucide-react';

interface InterestIconProps {
  name: string;
  className?: string;
}

export const InterestIcon: React.FC<InterestIconProps> = ({ name, className = 'w-5 h-5' }) => {
  switch (name) {
    case 'Cpu':
      return <Cpu className={className} />;
    case 'Binary':
      return <Binary className={className} />;
    case 'Atom':
      return <Atom className={className} />;
    case 'HeartPulse':
      return <HeartPulse className={className} />;
    case 'TrendingUp':
      return <TrendingUp className={className} />;
    case 'Palette':
      return <Palette className={className} />;
    case 'MessageSquareText':
      return <MessageSquareText className={className} />;
    case 'Leaf':
      return <Leaf className={className} />;
    case 'Wrench':
      return <Wrench className={className} />;
    case 'Users':
      return <Users className={className} />;
    case 'Trophy':
      return <Trophy className={className} />;
    case 'Compass':
      return <Compass className={className} />;
    case 'Sparkles':
      return <Sparkles className={className} />;
    default:
      return <HelpCircle className={className} />;
  }
};
