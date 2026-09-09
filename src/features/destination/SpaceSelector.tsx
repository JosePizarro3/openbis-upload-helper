import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { getSpaces } from "./destination";


interface SpaceSelectorProps {
  value: string;
  onChange: (space: string) => void;
}


export function SpaceSelector({
  value,
  onChange,
}: SpaceSelectorProps) {
  const [spaces, setSpaces] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadSpaces() {
      try {
        const result = await getSpaces();

        if (!result.success) {
          setError(
            result.error ??
              "Could not retrieve spaces.",
          );
          return;
        }

        setSpaces(result.spaces);
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : String(error),
        );
      } finally {
        setLoading(false);
      }
    }

    loadSpaces();
  }, []);

  const filteredSpaces = useMemo(() => {
    const query = value
      .trim()
      .toLowerCase();

    if (!query) {
      return spaces;
    }

    return spaces.filter((space) =>
      space.toLowerCase().includes(query),
    );
  }, [spaces, value]);

  function selectSpace(space: string) {
    onChange(space);
    setOpen(false);
  }

  return (
    <div className="space-selector">
      <label htmlFor="space">
        Space
      </label>

      <div className="combobox">
        <input
          id="space"
          type="text"
          value={value}
          autoComplete="off"
          disabled={loading}
          placeholder={
            loading
              ? "Loading spaces..."
              : "Type or select a space"
          }
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            onChange(event.currentTarget.value);
            setOpen(true);
          }}
        />

        <button
          type="button"
          className="combobox-toggle"
          aria-label="Show available spaces"
          disabled={loading}
          onClick={() => {
            setOpen((current) => !current);
          }}
        >
          ▾
        </button>

        {open && !loading && (
          <div className="combobox-options">
            {filteredSpaces.length > 0 ? (
              filteredSpaces.map((space) => (
                <button
                  key={space}
                  type="button"
                  className="combobox-option"
                  onClick={() => {
                    selectSpace(space);
                  }}
                >
                  {space}
                </button>
              ))
            ) : (
              <div className="combobox-empty">
                No matching spaces
              </div>
            )}
          </div>
        )}
      </div>

      {error && (
        <p className="destination-error">
          {error}
        </p>
      )}
    </div>
  );
}