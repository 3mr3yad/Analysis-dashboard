import { AvatarGroup, AvatarGroupTooltip } from "@/components/animate-ui/components/animate/avatar-group";
import type { Employee, EmployeePresence } from "../domain/types";
import { PRESENCE } from "../domain/labels";
import { openPanel } from "../state/router";
import { Avatar } from "./primitives";

/** Overlapping, hover-lifting stack of employees; each opens its panel. Extra members collapse into "+N". */
export function TeamAvatars({ people, presence, max = 6, size = 28 }: { people: Employee[]; presence?: Map<string, EmployeePresence>; max?: number; size?: number }) {
  const shown = people.slice(0, max);
  const rest = people.length - shown.length;
  if (!people.length) return null;
  return (
    <AvatarGroup side="top" sideOffset={10}>
      {[
        ...shown.map((e) => {
          const p = presence?.get(e.id);
          return (
            <button
              key={e.id}
              type="button"
              onClick={() => openPanel({ kind: "employee", id: e.id })}
              aria-label={e.name}
              className="rounded-full ring-2 ring-surface"
            >
              <Avatar name={e.name} id={e.id} size={size} />
              <AvatarGroupTooltip>
                <p className="font-medium">{e.name}</p>
                <p className="text-[10.5px] text-ink-3">
                  {e.title}
                  {p ? ` · ${PRESENCE[p.status].label}` : ""}
                </p>
              </AvatarGroupTooltip>
            </button>
          );
        }),
        ...(rest > 0
          ? [
              <span
                key="rest"
                className="num flex items-center justify-center rounded-full bg-[#232a38] text-[10.5px] font-medium text-ink-2 ring-2 ring-surface"
                style={{ width: size, height: size }}
              >
                +{rest}
                <AvatarGroupTooltip>
                  <p className="max-w-[220px]">{people.slice(max).map((e) => e.name).join("، ")}</p>
                </AvatarGroupTooltip>
              </span>,
            ]
          : []),
      ]}
    </AvatarGroup>
  );
}
