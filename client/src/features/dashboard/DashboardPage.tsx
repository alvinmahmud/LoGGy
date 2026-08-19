import { useEffect, useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import {
  authApi,
  queueApi,
  type QueueItem,
  type User,
} from "../../services/api";
import { Banner } from "../../components/Banner";
import { Logo } from "../../components/Logo";
import type {
  NewQueueItem,
  QueueItemStatus,
  QueueItemType,
} from "../../types/queue";
import type { Notice, Theme } from "../../types/ui";
import { AccountMenu } from "./AccountMenu";
import { AddQueueItemDialog } from "./AddQueueItemDialog";
import { QueueItemCard } from "./QueueItemCard";
import { queueItemStatusLabels } from "./queueItemConstants";

type DashboardPageProps = {
  user: User;
  notice: Notice | null;
  theme: Theme;
  onToggleTheme: () => void;
  onDismissNotice: () => void;
  onSignedOut: () => void;
};

export function DashboardPage({
  user,
  notice,
  theme,
  onToggleTheme,
  onDismissNotice,
  onSignedOut,
}: DashboardPageProps) {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<QueueItemType | "all">("all");
  const [statusFilter, setStatusFilter] = useState<QueueItemStatus | "all">(
    "all",
  );
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    queueApi
      .list()
      .then((loadedItems) => {
        setItems(loadedItems);
        setError("");
      })
      .catch((caught) =>
        setError(
          caught instanceof Error
            ? caught.message
            : "Could not load your backlog",
        ),
      )
      .finally(() => setLoading(false));
  }, []);

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();

    return items
      .filter((item) => typeFilter === "all" || item.type === typeFilter)
      .filter((item) => statusFilter === "all" || item.status === statusFilter)
      .filter(
        (item) =>
          !query ||
          item.title.toLowerCase().includes(query) ||
          (item.notes || "").toLowerCase().includes(query),
      );
  }, [items, search, statusFilter, typeFilter]);

  const counts = useMemo(
    () => ({
      all: items.length,
      backlog: items.filter((item) => item.status === "backlog").length,
      "in progress": items.filter((item) => item.status === "in progress")
        .length,
      completed: items.filter((item) => item.status === "completed").length,
    }),
    [items],
  );

  async function addItem(item: NewQueueItem) {
    try {
      const created = await queueApi.create(item);
      setItems((current) => [created, ...current]);
      setIsAdding(false);
      setError("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save this item");
    }
  }

  async function updateStatus(id: string, status: QueueItemStatus) {
    try {
      const updated = await queueApi.update(id, { status });
      setItems((current) =>
        current.map((item) => (item._id === id ? updated : item)),
      );
      setError("");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not update the item",
      );
    }
  }

  async function removeItem(id: string) {
    try {
      await queueApi.remove(id);
      setItems((current) => current.filter((item) => item._id !== id));
      setError("");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not remove the item",
      );
    }
  }

  async function signOut() {
    try {
      await authApi.logout();
    } finally {
      onSignedOut();
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <Logo href="#top" />
        <div className="topbar-actions">
          <AccountMenu
            user={user}
            theme={theme}
            onToggleTheme={onToggleTheme}
            onSignOut={signOut}
          />
          <button className="add-button compact" onClick={() => setIsAdding(true)}>
            <Plus size={17} strokeWidth={2} aria-hidden="true" /> Queue title
          </button>
        </div>
      </header>

      <main id="top">
        {notice && !loading && !error && (
          <Banner
            tone={notice.tone}
            title={notice.title}
            message={notice.message}
            onDismiss={onDismissNotice}
          />
        )}
        <section className="library" aria-labelledby="library-title">
          <div className="section-heading">
            <h2 id="library-title">Backlog</h2>
            <label className="search-field">
              <Search size={19} strokeWidth={1.8} aria-hidden="true" />
              <span className="sr-only">Search your backlog</span>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search titles or notes"
              />
            </label>
          </div>

          {error && (
            <Banner
              tone="error"
              title="Something went wrong"
              message={error}
              onDismiss={() => setError("")}
            />
          )}

          <div className="filter-row">
            <div className="status-tabs" aria-label="Filter by status">
              {(["all", "backlog", "in progress", "completed"] as const).map(
                (status) => (
                  <button
                    className={statusFilter === status ? "active" : ""}
                    onClick={() => setStatusFilter(status)}
                    key={status}
                  >
                    {status === "all" ? "All" : queueItemStatusLabels[status]}
                    <span>{counts[status]}</span>
                  </button>
                ),
              )}
            </div>
            <label className="type-filter">
              <span className="sr-only">Filter by media type</span>
              <select
                value={typeFilter}
                onChange={(event) =>
                  setTypeFilter(event.target.value as QueueItemType | "all")
                }
              >
                <option value="all">All media</option>
                <option value="game">Games</option>
                <option value="movie">Movies</option>
                <option value="tv">TV shows</option>
              </select>
            </label>
          </div>

          {loading ? (
            <div className="library-loading">Loading your backlog…</div>
          ) : filteredItems.length ? (
            <div className="queue-grid">
              {filteredItems.map((item, index) => (
                <QueueItemCard
                  key={item._id}
                  item={item}
                  index={index}
                  onStatusChange={updateStatus}
                  onRemove={removeItem}
                />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <span aria-hidden="true">◎</span>
              <h3>{items.length ? "No results" : "No items yet"}</h3>
              <button className="text-button" onClick={() => setIsAdding(true)}>
                Add a title
              </button>
            </div>
          )}
        </section>
      </main>

      <footer>
        <span className="brand-wordmark">
          Lo<span className="brand-gg">GG</span>y
        </span>
        <p>Signed in as {user.email}</p>
      </footer>

      {isAdding && (
        <AddQueueItemDialog onAdd={addItem} onClose={() => setIsAdding(false)} />
      )}
    </div>
  );
}
