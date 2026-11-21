"use client";

import {
  Baby,
  School,
  User,
  Users,
  Wind,
  Bike,
  Car,
  TrainFront,
  Home,
  Flame,
  DoorOpen,
  Fan,
  Sparkles,
  Check,
} from "lucide-react";
import {
  MEMBER_LABELS,
  COMMUTE_LABELS,
  HOME_LABELS,
  type FamilyProfile,
  type FamilyMember,
  type CommuteMode,
  type HomeContext,
} from "@/types";
import { cn } from "@/lib/utils";

const MEMBER_ICONS: Record<FamilyMember, React.ReactNode> = {
  toddlers: <Baby className="h-4 w-4" />,
  schoolKids: <School className="h-4 w-4" />,
  adults: <User className="h-4 w-4" />,
  seniors: <Users className="h-4 w-4" />,
  asthma: <Wind className="h-4 w-4" />,
};

const COMMUTE_ICONS: Record<CommuteMode, React.ReactNode> = {
  twoWheelerWalk: <Bike className="h-4 w-4" />,
  car: <Car className="h-4 w-4" />,
  publicTransit: <TrainFront className="h-4 w-4" />,
  workFromHome: <Home className="h-4 w-4" />,
};

const HOME_ICONS: Record<HomeContext, React.ReactNode> = {
  hasPurifier: <Fan className="h-4 w-4" />,
  usesIncense: <Sparkles className="h-4 w-4" />,
  hasBalconyWindows: <DoorOpen className="h-4 w-4" />,
  gasStoveCooking: <Flame className="h-4 w-4" />,
};

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
        active
          ? "border-foreground bg-foreground text-background shadow-sm"
          : "border-border bg-background text-foreground hover:border-foreground/40"
      )}
      aria-pressed={active}
    >
      {active ? <Check className="h-3.5 w-3.5" /> : null}
      {children}
    </button>
  );
}

export function ProfileConfigurator({
  profile,
  onChange,
}: {
  profile: FamilyProfile;
  onChange: (p: FamilyProfile) => void;
}) {
  const toggleMember = (m: FamilyMember) => {
    const members = profile.members.includes(m)
      ? profile.members.filter((x) => x !== m)
      : [...profile.members, m];
    onChange({ ...profile, members });
  };

  const toggleHome = (h: HomeContext) => {
    const homeContext = profile.homeContext.includes(h)
      ? profile.homeContext.filter((x) => x !== h)
      : [...profile.homeContext, h];
    onChange({ ...profile, homeContext });
  };

  return (
    <section className="card space-y-5">
      <div>
        <h2 className="text-lg font-bold">Family & Home Profile</h2>
        <p className="text-xs text-muted-foreground">
          The AI tailors warnings and hacks to exactly who lives here.
        </p>
      </div>

      <div className="space-y-2">
        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          Household members
        </p>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(MEMBER_LABELS) as FamilyMember[]).map((m) => (
            <Chip key={m} active={profile.members.includes(m)} onClick={() => toggleMember(m)}>
              {MEMBER_ICONS[m]}
              {MEMBER_LABELS[m]}
            </Chip>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          Commute mode
        </p>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(COMMUTE_LABELS) as CommuteMode[]).map((c) => (
            <Chip
              key={c}
              active={profile.commute === c}
              onClick={() => onChange({ ...profile, commute: c })}
            >
              {COMMUTE_ICONS[c]}
              {COMMUTE_LABELS[c]}
            </Chip>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          Home context
        </p>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(HOME_LABELS) as HomeContext[]).map((h) => (
            <Chip key={h} active={profile.homeContext.includes(h)} onClick={() => toggleHome(h)}>
              {HOME_ICONS[h]}
              {HOME_LABELS[h]}
            </Chip>
          ))}
        </div>
      </div>
    </section>
  );
}
