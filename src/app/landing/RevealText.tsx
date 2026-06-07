"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import styles from "./reveal-text.module.css";

type RevealTextProps = {
  as?: "h1" | "h2" | "h3" | "p" | "span" | "strong";
  className?: string;
  text: string;
};

export function RevealText({ as: Tag = "h2", className, text }: RevealTextProps) {
  const rootRef = useRef<HTMLElement | null>(null);
  const [isRevealed, setIsRevealed] = useState(false);

  useEffect(() => {
    const element = rootRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsRevealed(true);
          observer.unobserve(entry.target);
        }
      },
      {
        root: null,
        rootMargin: "0px 0px -12% 0px",
        threshold: 0.22,
      },
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={rootRef as never}
      aria-label={text}
      className={[styles.revealText, isRevealed ? styles.isRevealed : "", className]
        .filter(Boolean)
        .join(" ")}
    >
      {text.split(" ").map((word, index) => (
        <span className={styles.wordMask} aria-hidden="true" key={`${word}-${index}`}>
          <span
            className={styles.word}
            style={{ "--delay": `${index * 54}ms` } as CSSProperties}
          >
            {word}
          </span>
        </span>
      ))}
    </Tag>
  );
}
