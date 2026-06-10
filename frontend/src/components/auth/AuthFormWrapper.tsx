"use client";

import Link from "next/link";
import { motion } from "framer-motion";

interface AuthFormWrapperProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}

export default function AuthFormWrapper({
  children,
  title,
  subtitle,
}: AuthFormWrapperProps) {
  return (
    <div className="ns-auth-right">
      <motion.div
        className="ns-auth-form"
        initial={{ opacity: 0, x: 24 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        style={{ maxWidth: 380, width: "100%" }}
      >
        {/* Mobile wordmark — hidden on desktop via ns-auth-layout hiding ns-auth-left */}
        <div
          className="auth-mobile-wordmark"
          style={{
            display: "none",
            alignItems: "center",
            gap: 8,
            marginBottom: 32,
          }}
        >
          <Link
            href="/"
            style={{
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span className="ns-live-dot" />
            <span
              style={{
                fontFamily: "var(--font-condensed)",
                fontSize: 18,
                fontWeight: 700,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "var(--color-text-strong)",
              }}
            >
              Fracture
            </span>
          </Link>
        </div>

        {/* Title */}
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 28,
            fontWeight: 400,
            color: "var(--color-text-strong)",
            margin: "0 0 6px",
            lineHeight: 1.2,
          }}
        >
          {title}
        </h1>
        {subtitle && (
          <p
            style={{
              fontFamily: "var(--font-body)",
              fontSize: 14,
              color: "var(--color-secondary)",
              margin: "0 0 32px",
            }}
          >
            {subtitle}
          </p>
        )}

        {children}
      </motion.div>

      {/* Mobile: show wordmark */}
      <style>{`
        @media (max-width: 767px) {
          .auth-mobile-wordmark { display: flex !important; }
          .ns-auth-right { padding: 24px !important; }
          .ns-auth-form { max-width: 100% !important; }
        }
      `}</style>
    </div>
  );
}
