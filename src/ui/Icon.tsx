import type { ComponentType } from "react";
import type { IconProps as AnimateIconProps } from "@animate-ui/react/icons";
import { Activity } from "@/components/animate-ui/icons/activity";
import { Archive } from "@/components/animate-ui/icons/archive";
import { ArrowDown } from "@/components/animate-ui/icons/arrow-down";
import { ArrowUp } from "@/components/animate-ui/icons/arrow-up";
import { Bell } from "@/components/animate-ui/icons/bell";
import { Blocks } from "@/components/animate-ui/icons/blocks";
import { Calendar } from "@/components/animate-ui/icons/calendar";
import { ChartLine } from "@/components/animate-ui/icons/chart-line";
import { Check } from "@/components/animate-ui/icons/check";
import { ChevronDown } from "@/components/animate-ui/icons/chevron-down";
import { Download } from "@/components/animate-ui/icons/download";
import { ChevronLeft } from "@/components/animate-ui/icons/chevron-left";
import { ChevronUpDown } from "@/components/animate-ui/icons/chevron-up-down";
import { CircleCheckBig } from "@/components/animate-ui/icons/circle-check-big";
import { ClipboardList } from "@/components/animate-ui/icons/clipboard-list";
import { Clock } from "@/components/animate-ui/icons/clock";
import { ExternalLink } from "@/components/animate-ui/icons/external-link";
import { FileText } from "@/components/animate-ui/icons/file-text";
import { Flag } from "@/components/animate-ui/icons/flag";
import { Layers } from "@/components/animate-ui/icons/layers";
import { LayoutDashboard } from "@/components/animate-ui/icons/layout-dashboard";
import { ListFilter } from "@/components/animate-ui/icons/list-filter";
import { LogOut } from "@/components/animate-ui/icons/log-out";
import { MapPin } from "@/components/animate-ui/icons/map-pin";
import { Menu } from "@/components/animate-ui/icons/menu";
import { MessageSquare } from "@/components/animate-ui/icons/message-square";
import { PanelRightClose } from "@/components/animate-ui/icons/panel-right-close";
import { Pause } from "@/components/animate-ui/icons/pause";
import { Phone } from "@/components/animate-ui/icons/phone";
import { PhoneIncoming } from "@/components/animate-ui/icons/phone-incoming";
import { PhoneOutgoing } from "@/components/animate-ui/icons/phone-outgoing";
import { RefreshCw } from "@/components/animate-ui/icons/refresh-cw";
import { Route } from "@/components/animate-ui/icons/route";
import { Search } from "@/components/animate-ui/icons/search";
import { Settings } from "@/components/animate-ui/icons/settings";
import { ShoppingBag } from "@/components/animate-ui/icons/shopping-bag";
import { Sparkle } from "@/components/animate-ui/icons/sparkle";
import { ThumbsUp } from "@/components/animate-ui/icons/thumbs-up";
import { TriangleAlert } from "@/components/animate-ui/icons/triangle-alert";
import { UserRoundCog } from "@/components/animate-ui/icons/user-round-cog";
import { Users } from "@/components/animate-ui/icons/users";
import { UsersRound } from "@/components/animate-ui/icons/users-round";
import { Wallet } from "@/components/animate-ui/icons/wallet";
import { X } from "@/components/animate-ui/icons/x";
import { Zap } from "@/components/animate-ui/icons/zap";

// Animate UI (Lucide) icons, keyed by the dashboard's semantic names so call sites stay stable.
// Each icon file lives in src/components/animate-ui/icons/ (from the @animate-ui registry).
const ICONS = {
  overview: LayoutDashboard,
  live: Activity,
  requests: ClipboardList,
  orders: ShoppingBag,
  customers: Users,
  employees: UserRoundCog,
  analytics: ChartLine,
  bell: Bell,
  settings: Settings,
  search: Search,
  close: X,
  chevron: ChevronLeft,
  chevronDown: ChevronDown,
  collapse: PanelRightClose,
  menu: Menu,
  arrowUp: ArrowUp,
  arrowDown: ArrowDown,
  clock: Clock,
  alert: TriangleAlert,
  check: Check,
  checkCircle: CircleCheckBig,
  inbox: Archive,
  pause: Pause,
  money: Wallet,
  smile: ThumbsUp,
  users: UsersRound,
  bolt: Zap,
  layers: Layers,
  filter: ListFilter,
  phone: Phone,
  message: MessageSquare,
  file: FileText,
  flag: Flag,
  pin: MapPin,
  target: Route,
  sort: ChevronUpDown,
  calendar: Calendar,
  logout: LogOut,
  refresh: RefreshCw,
  database: Blocks,
  external: ExternalLink,
  incoming: PhoneIncoming,
  outgoing: PhoneOutgoing,
  sparkle: Sparkle,
  download: Download,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- each icon has its own animation-name union
} satisfies Record<string, ComponentType<AnimateIconProps<any>>>;

export type IconName = keyof typeof ICONS;

/** Animates when hovered, or when an `<AnimateIcon animateOnHover>` ancestor (nav link, KPI card) is hovered. */
export default function Icon({
  name,
  size = 18,
  className,
  strokeWidth = 1.6,
  animate,
  animateOnHover,
}: {
  name: IconName;
  size?: number;
  className?: string;
  strokeWidth?: number;
  animate?: boolean;
  animateOnHover?: boolean;
}) {
  const Cmp = ICONS[name];
  return <Cmp size={size} className={className} strokeWidth={strokeWidth} animate={animate} animateOnHover={animateOnHover ?? true} aria-hidden />;
}
