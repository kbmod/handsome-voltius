import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "@iconify/react";
import { useVaultStore } from "@/stores/vaultStore";
import { useUIStore } from "@/stores/uiStore";
import { useTeamStore } from "@/stores/teamStore";
import type { TeamMember, TeamRole } from "@/services/teamService";
import { StatusDot } from "@/components/shared/StatusDot";
import { MiniAvatar, avatarColor } from "@/components/shared/AvatarStack";

// ─── Online members stack ─────────────────────────────────────────────────────

const BUILTIN_ROLE_COLORS: Record<string, string> = {
  owner: "#f59e0b",
  manager: "#8b5cf6",
  editor: "#3b82f6",
  member: "#10b981",
  "connect-only": "#6b7280",
};

const MAX_STACK = 3;

function OnlineMembersStack({ members, roles, onInviteClick }: { members: TeamMember[]; roles: TeamRole[]; onInviteClick: () => void }) {
  const { t } = useTranslation();
  const [hovered, setHovered] = useState(false);
  const [invHovered, setInvHovered] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const visible = members.slice(0, MAX_STACK);
  const overflow = members.length - MAX_STACK;
  const onlineCount = members.filter((m) => m.is_online).length;

  return (
    <div className="flex items-center gap-2 shrink-0">
      {/* Stack */}
      {members.length > 0 && (
        <div
          ref={ref}
          className="relative flex items-center cursor-default"
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          {visible.map((m, i) => (
            <div
              key={m.user_id}
              title={m.display_name}
              style={{
                marginLeft: i === 0 ? 0 : -9,
                zIndex: MAX_STACK - i,
                borderRadius: "50%",
                border: m.is_online
                  ? "2px solid var(--t-status-connected)"
                  : "2px solid transparent",
                boxShadow: "0 0 0 1.5px var(--t-bg-chrome)",
                opacity: m.is_online ? 1 : 0.45,
                transition: "border-color 0.2s, opacity 0.2s",
              }}
            >
              <MiniAvatar name={m.display_name} size={24} />
            </div>
          ))}
          {overflow > 0 && (
            <div
              className="flex items-center justify-center text-[10px] font-semibold rounded-full shrink-0"
              style={{
                marginLeft: -9,
                zIndex: 0,
                width: 26,
                height: 26,
                background: "var(--t-bg-elevated)",
                border: "2px solid var(--t-bg-chrome)",
                color: "var(--t-text-dim)",
              }}
            >
              +{overflow}
            </div>
          )}

          {/* Hover popover */}
          {hovered && (
            <div
              className="surface-float absolute top-full mt-2 left-0 z-50 overflow-hidden"
              style={{ minWidth: 190 }}
            >
              <div className="px-3 py-2" style={{ borderBottom: "1px solid var(--t-border)" }}>
                <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--t-text-dim)" }}>
                  {onlineCount > 0 ? t("layout.vaultHeader.onlineCount", { count: onlineCount }) : t("layout.vaultHeader.noOneOnline")}
                </span>
              </div>
              {members.map((m) => {
                const memberRoles = (m.role_ids ?? [])
                  .map((rid) => roles.find((r) => r.id === rid))
                  .filter(Boolean) as TeamRole[];
                return (
                  <div key={m.user_id} className="flex items-center gap-2.5 px-3 py-2" style={{ opacity: m.is_online ? 1 : 0.5 }}>
                    <div className="relative shrink-0">
                      <MiniAvatar name={m.display_name} size={22} />
                      {m.is_online && <StatusDot color="var(--t-status-connected)" size={7} />}
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="text-xs truncate" style={{ color: "var(--t-text-primary)" }}>{m.display_name}</span>
                      {memberRoles.length > 0 && (
                        <div className="flex items-center gap-1 flex-wrap mt-0.5">
                          {memberRoles.map((r) => {
                            const color = r.color ?? BUILTIN_ROLE_COLORS[r.name] ?? avatarColor(r.name);
                            return (
                              <span
                                key={r.id}
                                className="text-[9px] font-medium px-1 py-px rounded-full capitalize leading-none"
                                style={{ color, background: `${color}22` }}
                              >
                                {r.name}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Invite + button */}
      <button
        onClick={onInviteClick}
        onMouseEnter={() => setInvHovered(true)}
        onMouseLeave={() => setInvHovered(false)}
        title={t("layout.vaultHeader.inviteMember")}
        className="rounded-full flex items-center justify-center transition-all shrink-0"
        style={{
          width: 26,
          height: 26,
          border: `2px dashed ${invHovered ? "var(--t-accent)" : "var(--t-border)"}`,
          background: invHovered ? "rgba(var(--t-accent-rgb, 99,102,241), 0.1)" : "transparent",
          color: invHovered ? "var(--t-accent)" : "var(--t-text-dim)",
        }}
      >
        <Icon icon="lucide:plus" width={11} />
      </button>
    </div>
  );
}

export default function VaultHeader() {
  const { t } = useTranslation();
  const vaults = useVaultStore((s) => s.vaults);
  const selectedVaultIds = useVaultStore((s) => s.selectedVaultIds);
  const setOmniOpen = useUIStore((s) => s.setOmniOpen);
  const openMembersInvite = useUIStore((s) => s.openMembersInvite);
  const { teams, membersByTeam, rolesByTeam, loadMembers } = useTeamStore();

  // Use the first selected vault as the "active" vault.
  // For non-owner team members there is no local vault — the sidebar sets a
  // team ID directly, so fall back to looking up in `teams`.
  const activeVaultId = selectedVaultIds[0] ?? null;
  const vault = vaults.find((v) => v.id === activeVaultId) ?? null;
  const standaloneTeam = !vault && activeVaultId
    ? (teams.find((t) => t.id === activeVaultId) ?? null)
    : null;
  const team = vault?.teamId
    ? (teams.find((t) => t.id === vault.teamId) ?? null)
    : standaloneTeam;
  const members = team ? (membersByTeam[team.id] ?? null) : null;
  const roles = team ? (rolesByTeam[team.id] ?? []) : [];

  useEffect(() => {
    if (team && !membersByTeam[team.id]) {
      loadMembers(team.id).catch(() => {});
    }
  }, [team?.id]);

  if (!vault && !standaloneTeam) return null;

  return (
    <div
      className="flex items-center shrink-0 h-12 px-2 gap-2 border-b border-(--t-border)"
      style={{
        background: "transparent",
      }}
    >
      <button
        onClick={() => setOmniOpen(true)}
        className="flex flex-1 min-w-0 items-center gap-2 px-3 h-8 rounded-md transition-colors"
        style={{
          background: "var(--t-bg-chrome-field)",
          color: "var(--t-text-secondary)",
          border: "1px solid var(--t-chrome-field-border)",
          boxShadow: "inset 0 1px 0 color-mix(in srgb, #ffffff 6%, transparent)",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = "var(--t-bg-chrome-field-hover)";
          (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--t-accent)";
          (e.currentTarget as HTMLButtonElement).style.color = "var(--t-text-bright)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = "var(--t-bg-chrome-field)";
          (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--t-chrome-field-border)";
          (e.currentTarget as HTMLButtonElement).style.color = "var(--t-text-secondary)";
        }}
        onFocus={(e) => {
          (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--t-accent)";
          (e.currentTarget as HTMLButtonElement).style.boxShadow = "inset 0 1px 0 color-mix(in srgb, #ffffff 6%, transparent), 0 0 0 3px color-mix(in srgb, var(--t-accent) 25%, transparent)";
        }}
        onBlur={(e) => {
          (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--t-chrome-field-border)";
          (e.currentTarget as HTMLButtonElement).style.boxShadow = "inset 0 1px 0 color-mix(in srgb, #ffffff 6%, transparent)";
        }}
      >
        <Icon icon="lucide:search" width={14} className="shrink-0" />
        <span className="text-sm flex-1 text-left">{t("layout.vaultHeader.jumpTo")}</span>
        <kbd
          className="flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-md"
          style={{
            background: "color-mix(in srgb, #000000 22%, transparent)",
            color: "var(--t-text-secondary)",
            border: "1px solid color-mix(in srgb, #ffffff 7%, transparent)",
          }}
        >
          <span>⌘</span>
          <span>K</span>
        </kbd>
      </button>

      <div className="flex items-center justify-end shrink-0">
        {team && members !== null && (
          <OnlineMembersStack members={members} roles={roles} onInviteClick={openMembersInvite} />
        )}
      </div>
    </div>
  );
}
