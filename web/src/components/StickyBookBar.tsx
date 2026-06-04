'use client';

interface Props {
  onBookClick: () => void;
}

export default function StickyBookBar({ onBookClick }: Props): React.ReactElement {
  // Outer sentinel is sticky + scroll-state container so the inner bar
  // can query stuck state and gain top border / shadow only when stuck.
  return (
    <div className="sticky-book-bar-sentinel">
      <div className="sticky-book-bar">
        <button
          type="button"
          onClick={onBookClick}
          className="sticky-book-bar__button"
          aria-label="Book a session"
        >
          <svg
            className="sticky-book-bar__icon"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <span className="sticky-book-bar__label">Book a session</span>
        </button>
      </div>
    </div>
  );
}
