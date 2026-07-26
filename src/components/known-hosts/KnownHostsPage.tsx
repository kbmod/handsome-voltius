import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useKnownHostStore } from "@/stores/knownHostStore";
import { useVaultStore } from "@/stores/vaultStore";
import { useAccessibleVaultIds } from "@/hooks/useAccessibleVaultIds";
import { useUIStore } from "@/stores/uiStore";
import { usePermissions } from "@/hooks/usePermission";
import { useDragSelection } from "@/hooks/useDragSelection";
import { useListKeyNav } from "@/hooks/useListKeyNav";
import { usePageBulkActions } from "@/hooks/usePageBulkActions";
import { DragSelectSurface } from "@/components/shared/DragSelectSurface";
import { ConfirmModal } from "@/components/shared/ConfirmModal";
import { KnownHostCard } from "./KnownHostCard";
import { KnownHostsToolbar } from "./KnownHostsToolbar";
import type { KnownHost, VaultOption } from "@/types";
import type { LayoutMode, SortMode } from "@/components/shared/ToolbarViewControls";

function sortHosts(hosts: KnownHost[], mode: SortMode): KnownHost[] {
  return [...hosts].sort((a, b) => {
    switch (mode) {
      case "name-asc":  return (a.host + a.port).localeCompare(b.host + b.port);
      case "name-desc": return (b.host + b.port).localeCompare(a.host + a.port);
      case "newest":    return b.created_at.localeCompare(a.created_at);
      case "oldest":    return a.created_at.localeCompare(b.created_at);
      default:          return 0;
    }
  });
}

export default function KnownHostsPage() {
  const { t } = useTranslation();
  const { knownHosts, loadKnownHosts, removeKnownHost, moveKnownHostVault, copyKnownHostVault } =
    useKnownHostStore();

  const setOmniOpen = useUIStore((s) => s.setOmniOpen);
  const selectedVaultIds = useVaultStore((s) => s.selectedVaultIds);
  const vaults = useVaultStore((s) => s.vaults);
  const accessibleVaultIds = useAccessibleVaultIds();
  const can = usePermissions();

  const [search, setSearch] = useState("");
  const [layoutMode, setLayoutMode] = useState<LayoutMode>("grid");
  const [sortMode, setSortMode] = useState<SortMode>("name-asc");
  const [confirmDeleteIds, setConfirmDeleteIds] = useState<string[] | null>(null);

  const canEdit = selectedVaultIds.some((vid) => can("EDIT_CONNECTIONS", vid));

  const vaultOptions = useMemo<VaultOption[]>(
    () => [
      { id: "personal", name: "Personal" },
      ...vaults.filter((v) => v.id !== "personal").map((v) => ({ id: v.teamId ?? v.id, name: v.name })),
    ],
    [vaults],
  );

  const q = useMemo(() => search.trim().toLowerCase(), [search]);

  const filtered = useMemo(() => {
    const visible = knownHosts.filter((h) => {
      const hvid = h.vault_id ?? "personal";
      if (accessibleVaultIds.length > 0 && !accessibleVaultIds.includes(hvid)) return false;
      if (q && !h.host.toLowerCase().includes(q) && !(h.name ?? "").toLowerCase().includes(q)) return false;
      return true;
    });
    return sortHosts(visible, sortMode);
  }, [knownHosts, q, sortMode, accessibleVaultIds]);

  const orderedIds = useMemo(() => filtered.map((h) => h.id), [filtered]);

  const {
    selectedIdSet,
    selectionAreaRef,
    itemAreaRef,
    dragBox,
    handleItemSelect,
    handleSelectionAreaMouseDown,
    selectSingle,
    setSelection,
  } = useDragSelection(orderedIds);

  const { focusedId } = useListKeyNav({
    orderedIds,
    selectedIdSet,
    selectSingle,
    setSelection,
    itemAreaRef,
    layoutMode,
    onEscape: () => setSelection([]),
    onSearch: () => setOmniOpen(true),
  });

  useEffect(() => { loadKnownHosts(); }, []);

  usePageBulkActions({
    navItem: "known-hosts",
    filteredIds: orderedIds,
    selectedIdSet,
    setSelection,
    onDelete: (ids) => setConfirmDeleteIds(ids),
  });

  const handleDelete = useCallback(
    (ids: string[]) => setConfirmDeleteIds(ids),
    [],
  );

  const confirmDelete = async () => {
    if (!confirmDeleteIds) return;
    await Promise.all(confirmDeleteIds.map((id) => removeKnownHost(id)));
    setConfirmDeleteIds(null);
  };

  const otherVaultsFor = (host: KnownHost): VaultOption[] => {
    const currentVaultId = host.vault_id ?? "personal";
    return vaultOptions.filter((v) => v.id !== currentVaultId);
  };

  const selectedCount = selectedIdSet.size;

  return (
    <div className="flex flex-col h-full chrome-canvas">
      <KnownHostsToolbar
        search={search}
        onSearchChange={setSearch}
        layoutMode={layoutMode}
        onLayoutModeChange={setLayoutMode}
        sortMode={sortMode}
        onSortModeChange={setSortMode}
        selectedCount={selectedCount}
        onDeleteSelected={canEdit && selectedCount > 0 ? () => handleDelete([...selectedIdSet]) : undefined}
      />

      <DragSelectSurface
        selectionAreaRef={selectionAreaRef}
        onMouseDown={handleSelectionAreaMouseDown}
        dragBox={dragBox}
        className="flex-1 overflow-y-auto"
        onClick={() => { /* deselect handled by useDragSelection */ }}
      >
        <div
          ref={itemAreaRef}
          className="px-7 pt-4 pb-7"
        >
          <div className="mb-2.5 flex items-center gap-2">
            <h2 className="text-sm font-semibold text-(--t-text-primary)">
              {t("layout.nav.known-hosts")}
            </h2>
            {filtered.length > 0 && (
              <span className="text-[11px] tabular-nums text-(--t-text-dim)">
                {filtered.length}
              </span>
            )}
          </div>
          <div
            className={
              layoutMode === "grid"
                ? "grid gap-3"
                : "flex flex-col gap-1"
            }
            style={layoutMode === "grid" ? { gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" } : undefined}
          >
            {filtered.length === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center gap-3 py-16 text-center">
                <div className="w-12 h-12 rounded-xl bg-(--t-bg-elevated) flex items-center justify-center text-(--t-text-dim)">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
                    <circle cx="12" cy="9" r="2.5"/>
                  </svg>
                </div>
                <p className="text-(--t-text-dim) text-sm">
                  {q ? t("knownHosts.page.noSearchResults") : t("knownHosts.page.emptyState")}
                </p>
              </div>
            ) : (
              filtered.map((host) => (
                <KnownHostCard
                  key={host.id}
                  host={host}
                  isSelected={selectedIdSet.has(host.id)}
                  isFocused={focusedId === host.id}
                  isList={layoutMode === "list"}
                  canEdit={canEdit}
                  otherVaults={otherVaultsFor(host)}
                  onSelect={(e) => handleItemSelect(host.id, e as React.MouseEvent<HTMLDivElement>)}
                  onDelete={() => handleDelete([host.id])}
                  onMoveVault={(vaultId) => moveKnownHostVault(host.id, vaultId)}
                  onCopyVault={(vaultId) => copyKnownHostVault(host.id, vaultId)}
                />
              ))
            )}
          </div>
        </div>
      </DragSelectSurface>

      {confirmDeleteIds && (
        <ConfirmModal
          title={t("knownHosts.page.confirmDelete.title", { count: confirmDeleteIds.length })}
          message={t("knownHosts.page.confirmDelete.message")}
          confirmLabel={t("common.action.delete")}
          onConfirm={confirmDelete}
          onCancel={() => setConfirmDeleteIds(null)}
        />
      )}
    </div>
  );
}
