'use client';

import type { TasteProfile } from '@/lib/types';

interface Props {
  profile: TasteProfile;
  onReset: () => void;
}

export function TasteProfilePanel({ profile, onReset }: Props) {
  const ordered = [...profile.entries].sort((a, b) => b.weight - a.weight).slice(0, 8);
  return (
    <div className="panel panel-side">
      <div className="panel-head">
        <h2>Taste profile</h2>
        <span className="tag small">{profile.correctionCycles} cycles</span>
      </div>
      <p className="muted small">
        Every correction you make teaches the app how <em>you</em> talk
        about clothes. Over time, first-generation results align with
        your idiolect — fewer cycles needed.
      </p>
      {ordered.length === 0 ? (
        <p className="muted small">No corrections recorded yet.</p>
      ) : (
        <ul className="taste-list">
          {ordered.map((entry, i) => (
            <li key={`${entry.phrase}-${entry.parameter}-${i}`}>
              <span className="taste-phrase">"{entry.phrase}"</span>
              <span className="muted small"> → {entry.parameter}:</span>
              <code>{entry.value}</code>
              <span className="taste-weight" title="how many times you confirmed this">
                ×{entry.weight}
              </span>
            </li>
          ))}
        </ul>
      )}
      <button type="button" className="btn btn-ghost btn-small" onClick={onReset}>
        Reset profile
      </button>
    </div>
  );
}
