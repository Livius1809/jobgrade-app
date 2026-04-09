"use client"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="ro">
      <body
        style={{
          margin: 0,
          fontFamily: "Inter, Helvetica Neue, Arial, sans-serif",
          background: "linear-gradient(180deg, #FEFDFB 0%, #F8F7FF 100%)",
          color: "#2D2A26",
          WebkitFontSmoothing: "antialiased",
        }}
      >
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "1.5rem",
            textAlign: "center",
          }}
        >
          {/* Error icon */}
          <div style={{ marginBottom: "2rem" }}>
            <svg
              width="80"
              height="80"
              viewBox="0 0 80 80"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle cx="40" cy="40" r="38" stroke="#E85D43" strokeWidth="2" opacity="0.3" />
              <circle cx="40" cy="40" r="28" stroke="#E85D43" strokeWidth="2" opacity="0.5" />
              <text
                x="40"
                y="47"
                textAnchor="middle"
                fontSize="28"
                fontWeight="600"
                fill="#E85D43"
              >
                !
              </text>
            </svg>
          </div>

          {/* Title */}
          <h1
            style={{
              fontSize: "clamp(1.5rem, 4vw, 2rem)",
              fontWeight: 600,
              color: "#1E1B4B",
              marginBottom: "0.75rem",
              lineHeight: 1.2,
            }}
          >
            Ceva nu a mers bine
          </h1>

          {/* Description */}
          <p
            style={{
              fontSize: "1rem",
              color: "#6B6560",
              marginBottom: "2.5rem",
              maxWidth: "28rem",
              lineHeight: 1.6,
            }}
          >
            A apărut o eroare neașteptată. Poți încerca din nou sau reveni la pagina principală.
          </p>

          {/* Actions */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "1rem",
              justifyContent: "center",
            }}
          >
            <button
              onClick={() => reset()}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                minWidth: "160px",
                height: "40px",
                backgroundColor: "#E85D43",
                color: "white",
                border: "none",
                borderRadius: "9999px",
                fontSize: "0.875rem",
                fontWeight: 600,
                cursor: "pointer",
                boxShadow: "0 4px 14px rgba(232, 93, 67, 0.25)",
                transition: "background-color 0.2s ease, transform 0.2s ease",
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = "#D4482E"
                e.currentTarget.style.transform = "scale(1.02)"
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = "#E85D43"
                e.currentTarget.style.transform = "scale(1)"
              }}
            >
              Încearcă din nou
            </button>

            <a
              href="/"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                minWidth: "160px",
                height: "40px",
                backgroundColor: "transparent",
                color: "#4F46E5",
                border: "2px solid #4F46E5",
                borderRadius: "9999px",
                fontSize: "0.875rem",
                fontWeight: 600,
                textDecoration: "none",
                transition: "all 0.2s ease",
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = "#4F46E5"
                e.currentTarget.style.color = "white"
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = "transparent"
                e.currentTarget.style.color = "#4F46E5"
              }}
            >
              Pagina principală
            </a>
          </div>

          {/* Error digest for debugging */}
          {error.digest && (
            <p
              style={{
                marginTop: "3rem",
                fontSize: "0.75rem",
                color: "#8A8494",
              }}
            >
              Cod eroare: {error.digest}
            </p>
          )}

          {/* Footer */}
          <p
            style={{
              marginTop: "4rem",
              fontSize: "0.75rem",
              color: "#8A8494",
            }}
          >
            JobGrade &mdash; Evaluare și ierarhizare posturi
          </p>
        </div>
      </body>
    </html>
  )
}
