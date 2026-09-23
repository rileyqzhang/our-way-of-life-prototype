"use client";

import { useId, useState } from "react";
import { pageLanguages } from "@/lib/stories/form-options";

type PageLanguageId = (typeof pageLanguages)[number]["id"];

export function LanguageSelector() {
  const labelId = useId();
  const hintId = useId();
  const panelId = useId();
  const [selected, setSelected] = useState<PageLanguageId>("en");

  function moveSelection(current: PageLanguageId, direction: 1 | -1) {
    const index = pageLanguages.findIndex((language) => language.id === current);
    const next = pageLanguages[(index + direction + pageLanguages.length) % pageLanguages.length];
    setSelected(next.id);
    document.getElementById(`page-language-${next.id}`)?.focus();
  }

  return (
    <div className="languageSelector">
      <p id={labelId} className="visuallyHidden">
        Page language
      </p>
      <div className="languageTabs" role="tablist" aria-labelledby={labelId} aria-describedby={hintId}>
        {pageLanguages.map((language) => {
          const isSelected = language.id === selected;
          return (
            <button
              key={language.id}
              type="button"
              role="tab"
              id={`page-language-${language.id}`}
              aria-selected={isSelected}
              aria-controls={panelId}
              tabIndex={isSelected ? 0 : -1}
              className={isSelected ? "active" : undefined}
              onClick={() => setSelected(language.id)}
              onKeyDown={(event) => {
                if (event.key === "ArrowRight" || event.key === "ArrowDown") {
                  event.preventDefault();
                  moveSelection(language.id, 1);
                }
                if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
                  event.preventDefault();
                  moveSelection(language.id, -1);
                }
                if (event.key === "Home") {
                  event.preventDefault();
                  setSelected(pageLanguages[0].id);
                  document.getElementById(`page-language-${pageLanguages[0].id}`)?.focus();
                }
                if (event.key === "End") {
                  event.preventDefault();
                  const last = pageLanguages[pageLanguages.length - 1];
                  setSelected(last.id);
                  document.getElementById(`page-language-${last.id}`)?.focus();
                }
              }}
            >
              {language.label}
            </button>
          );
        })}
      </div>
      <p id={panelId} role="tabpanel" aria-labelledby={`page-language-${selected}`} className="languageHint">
        <span id={hintId}>
          Page translations are not available yet. These options are here so English, Spanish, and Chinese
          versions can be added later. Use the form below to tell us your preferred language.
        </span>
      </p>
    </div>
  );
}
