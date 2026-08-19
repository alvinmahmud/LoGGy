import { type FormEvent, type KeyboardEvent, useEffect, useState } from "react";
import { X } from "lucide-react";
import { catalogApi, type CatalogSearchResult } from "../../services/api";
import type {
  NewQueueItem,
  QueueItemStatus,
  QueueItemType,
} from "../../types/queue";

type AddQueueItemDialogProps = {
  onAdd: (item: NewQueueItem) => Promise<void>;
  onClose: () => void;
};

export function AddQueueItemDialog({
  onAdd,
  onClose,
}: AddQueueItemDialogProps) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState<QueueItemType>("game");
  const [status, setStatus] = useState<QueueItemStatus>("backlog");
  const [year, setYear] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [suggestions, setSuggestions] = useState<CatalogSearchResult[]>([]);
  const [searchState, setSearchState] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");
  const [titleFocused, setTitleFocused] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(-1);

  useEffect(() => {
    const query = title.trim();
    if (selectedSuggestion || query.length < 2) {
      setSuggestions([]);
      setSearchState("idle");
      setActiveSuggestion(-1);

      return;
    }

    const controller = new AbortController();
    const debounce = window.setTimeout(() => {
      setSearchState("loading");
      catalogApi
        .search(query, type, controller.signal)
        .then(({ results }) => {
          setSuggestions(results);
          setSearchState("ready");
          setActiveSuggestion(-1);
        })
        .catch((error: unknown) => {
          if (error instanceof DOMException && error.name === "AbortError") {
            return;
          }
          setSuggestions([]);
          setSearchState("error");
          setActiveSuggestion(-1);
        });
    }, 300);

    return () => {
      window.clearTimeout(debounce);
      controller.abort();
    };
  }, [selectedSuggestion, title, type]);

  function selectSuggestion(suggestion: CatalogSearchResult) {
    setTitle(suggestion.title);
    setYear(suggestion.year);
    setSelectedSuggestion(true);
    setSuggestions([]);
    setSearchState("idle");
    setActiveSuggestion(-1);
  }

  function handleTitleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!suggestions.length) {
      if (event.key === "Escape") setTitleFocused(false);

      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveSuggestion((current) =>
        current >= suggestions.length - 1 ? 0 : current + 1,
      );
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveSuggestion((current) =>
        current <= 0 ? suggestions.length - 1 : current - 1,
      );
    } else if (event.key === "Enter" && activeSuggestion >= 0) {
      event.preventDefault();
      selectSuggestion(suggestions[activeSuggestion]);
    } else if (event.key === "Escape") {
      setTitleFocused(false);
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim()) {
      return;
    }
    setSaving(true);

    try {
      await onAdd({
        title: title.trim(),
        type,
        status,
        year: year.trim(),
        notes: notes.trim(),
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button
          className="dialog-close"
          onClick={onClose}
          aria-label="Close dialog"
        >
          <X size={21} aria-hidden="true" />
        </button>
        <p className="section-kicker">Add to queue</p>
        <h2 id="dialog-title">Add a title</h2>
        <form onSubmit={submit}>
          <div className="field">
            <label htmlFor="queue-title">Title</label>
            <div className="catalog-search">
              <input
                id="queue-title"
                autoFocus
                required
                role="combobox"
                aria-autocomplete="list"
                aria-controls="catalog-suggestions"
                aria-expanded={
                  titleFocused &&
                  !selectedSuggestion &&
                  title.trim().length >= 2 &&
                  searchState !== "idle"
                }
                aria-activedescendant={
                  activeSuggestion >= 0
                    ? `catalog-option-${activeSuggestion}`
                    : undefined
                }
                value={title}
                onFocus={() => setTitleFocused(true)}
                onChange={(event) => {
                  setTitle(event.target.value);
                  setSelectedSuggestion(false);
                  setTitleFocused(true);
                }}
                onKeyDown={handleTitleKeyDown}
                placeholder="e.g. Cyberpunk 2077"
              />
              {titleFocused &&
                !selectedSuggestion &&
                title.trim().length >= 2 &&
                searchState !== "idle" && (
                  <div className="catalog-suggestions">
                    <div id="catalog-suggestions" role="listbox">
                      {searchState === "loading" && (
                        <p className="catalog-message">Searching…</p>
                      )}
                      {searchState === "error" && (
                        <p className="catalog-message">
                          Search unavailable. Enter a title manually.
                        </p>
                      )}
                      {searchState === "ready" && !suggestions.length && (
                        <p className="catalog-message">No matches.</p>
                      )}
                      {suggestions.map((suggestion, index) => (
                        <button
                          id={`catalog-option-${index}`}
                          key={`${suggestion.type}-${suggestion.providerId}`}
                          type="button"
                          role="option"
                          aria-selected={activeSuggestion === index}
                          className={activeSuggestion === index ? "active" : ""}
                          onMouseDown={(event) => event.preventDefault()}
                          onMouseEnter={() => setActiveSuggestion(index)}
                          onClick={() => selectSuggestion(suggestion)}
                        >
                          <span>{suggestion.title}</span>
                          <small>{suggestion.year || "Year unavailable"}</small>
                        </button>
                      ))}
                    </div>
                    <a
                      className="catalog-credit"
                      href={
                        type === "game"
                          ? "https://rawg.io"
                          : "https://www.themoviedb.org"
                      }
                      target="_blank"
                      rel="noreferrer"
                    >
                      {type === "game"
                        ? "Game data by RAWG"
                        : "Movie and TV data by TMDB"}
                    </a>
                  </div>
                )}
            </div>
          </div>
          <div className="field-pair">
            <label className="field">
              <span>Media type</span>
              <select
                value={type}
                onChange={(event) => {
                  setType(event.target.value as QueueItemType);
                  setSelectedSuggestion(false);
                  setSuggestions([]);
                  setSearchState("idle");
                }}
              >
                <option value="game">Game</option>
                <option value="movie">Movie</option>
                <option value="tv">TV show</option>
              </select>
            </label>
            <label className="field">
              <span>Status</span>
              <select
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value as QueueItemStatus)
                }
              >
                <option value="backlog">Backlog</option>
                <option value="in progress">In progress</option>
                <option value="completed">Completed</option>
              </select>
            </label>
          </div>
          <label className="field">
            <span>
              Release year <em>optional</em>
            </span>
            <input
              inputMode="numeric"
              maxLength={4}
              value={year}
              onChange={(event) =>
                setYear(event.target.value.replace(/\D/g, ""))
              }
              placeholder="2024"
            />
          </label>
          <label className="field">
            <span>
              Note <em>optional</em>
            </span>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Add a note"
              rows={3}
            />
          </label>
          <div className="dialog-actions">
            <button type="button" className="cancel-button" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="add-button" disabled={saving}>
              {saving ? "Saving…" : "Add to queue"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
