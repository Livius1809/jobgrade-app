"use client"

import { useState } from "react"
import ReactMarkdown from "react-markdown"

interface ExpandableSectionProps {
  concise: string
  extended: string
}

export function ExpandableSection({ concise, extended }: ExpandableSectionProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="mb-section">
      <ReactMarkdown
        components={{
          h3: ({ children }) => (
            <h3 style={{
              marginTop: "2.5rem", marginBottom: "1rem",
              fontSize: "1.125rem", fontWeight: 700, letterSpacing: "0.01em",
              color: "#4F46E5",
              paddingLeft: "0.875rem",
              borderLeft: "3px solid #4F46E5",
            }}>
              {children}
            </h3>
          ),
        }}
      >
        {expanded ? `${concise}\n\n${extended}` : concise}
      </ReactMarkdown>

      {extended.trim().length > 0 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-4 text-sm font-medium transition-colors duration-200 cursor-pointer flex items-center gap-1.5"
          style={{ color: "#4F46E5" }}
        >
          <svg
            width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            className={`transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
          {expanded ? "Versiune concisă" : "Află mai mult"}
        </button>
      )}
    </div>
  )
}
