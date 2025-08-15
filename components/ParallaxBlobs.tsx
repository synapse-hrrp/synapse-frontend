"use client";

import { useEffect } from "react";

export default function ParallaxBlobs() {
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth) * 2 - 1;  // -1..1
      const y = (e.clientY / window.innerHeight) * 2 - 1; // -1..1
      document.querySelectorAll<HTMLElement>(".parallax").forEach((el) => {
        const speed = parseFloat(el.dataset.speed || "8");
        el.style.transform = `translate3d(${x * speed}px, ${y * speed}px, 0)`;
      });
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);
  return null;
}
