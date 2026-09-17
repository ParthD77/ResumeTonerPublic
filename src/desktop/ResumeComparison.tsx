import { useMemo } from "react";
import { readableLatex } from "./readable-latex";
import { wordDiff } from "./word-diff";

export function ResumeComparison({ before, after, onAfterChange, disabled = false }: { before: string; after: string; onAfterChange?: (value: string) => void; disabled?: boolean }) {
  const parts = useMemo(() => wordDiff(readableLatex(before), readableLatex(after)), [before, after]);
  const changed = parts.some((part) => part.kind !== "same");
  return (
    <div className="resume-comparison">
      <div className="diff-legend" aria-label="Highlight legend">
        <span className="diff-removed">− Removed</span>
        <span className="diff-added">+ Added</span>
        <span>Unchanged text stays neutral</span>
      </div>
      <section className="resume-wording before">
        <h3>Current wording</h3>
        <div>{parts.filter((part) => part.kind !== "added").map((part, index) =>
          part.kind === "removed" ? <del className="diff-removed" key={index}>{part.text}</del> : <span key={index}>{part.text}</span>,
        )}</div>
      </section>
      <section className="resume-wording after">
        <h3>{onAfterChange ? "Proposed wording · click text to edit" : "Proposed wording"}</h3>
        <div
          className={onAfterChange ? "wording-edit" : undefined}
          aria-label={onAfterChange ? "Edit proposed wording" : undefined}
          aria-readonly={disabled || undefined}
          contentEditable={Boolean(onAfterChange) && !disabled}
          suppressContentEditableWarning
          onBlur={onAfterChange ? (event) => onAfterChange(event.currentTarget.innerText) : undefined}
        >{parts.filter((part) => part.kind !== "removed").map((part, index) =>
          part.kind === "added" ? <ins className="diff-added" key={index}>{part.text}</ins> : <span key={index}>{part.text}</span>,
        )}</div>
      </section>
      {!changed && <p className="diff-note">No visible wording changes. Check the LaTeX source for formatting or link changes.</p>}
    </div>
  );
}
