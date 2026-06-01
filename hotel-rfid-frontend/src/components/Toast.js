import { useEffect, useRef } from "react";

/**
 * Toast — lightweight inline notification.
 *
 * Usage:
 *   const [toast, setToast] = useToast();
 *   setToast({ type: "success" | "error" | "info", message: "..." });
 *   <Toast toast={toast} onDismiss={() => setToast(null)} />
 */

export function useToast() {
  const [toast, setToastState] = require("react").useState(null);
  const timerRef = useRef(null);

  const setToast = (next) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToastState(next);
    if (next) {
      timerRef.current = setTimeout(() => setToastState(null), 4500);
    }
  };

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  return [toast, setToast];
}

const STYLES = {
  success: { bg: "rgba(16,80,60,0.9)",  border: "rgba(52,211,153,0.4)",  color: "#6ee7b7", icon: "✓" },
  error:   { bg: "rgba(80,20,20,0.9)",  border: "rgba(248,113,113,0.4)", color: "#f87171", icon: "✕" },
  info:    { bg: "rgba(30,50,90,0.9)",  border: "rgba(147,197,253,0.4)", color: "#93c5fd", icon: "ℹ" },
  warning: { bg: "rgba(80,40,10,0.9)",  border: "rgba(251,191,36,0.4)",  color: "#fbbf24", icon: "⚠" },
};

export default function Toast({ toast, onDismiss }) {
  if (!toast) return null;
  const s = STYLES[toast.type] || STYLES.info;

  return (
    <div style={{
      position: "fixed",
      bottom: 28,
      right: 28,
      zIndex: 9999,
      display: "flex",
      alignItems: "flex-start",
      gap: 10,
      background: s.bg,
      border: `1px solid ${s.border}`,
      borderRadius: 10,
      padding: "12px 16px",
      maxWidth: 380,
      boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
      backdropFilter: "blur(16px)",
      animation: "toastIn 0.2s ease",
    }}>
      <span style={{ color: s.color, fontWeight: 700, fontSize: 15, lineHeight: 1.4, flexShrink: 0 }}>
        {s.icon}
      </span>
      <span style={{ color: "#eef0f6", fontSize: 13.5, lineHeight: 1.5, flex: 1 }}>
        {toast.message}
      </span>
      <button
        onClick={onDismiss}
        style={{
          background: "none",
          border: "none",
          color: "rgba(255,255,255,0.4)",
          cursor: "pointer",
          padding: "0 0 0 8px",
          fontSize: 16,
          lineHeight: 1,
          minWidth: "auto",
          margin: 0,
          flexShrink: 0,
        }}
        aria-label="Dismiss"
      >
        ×
      </button>
      <style>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
