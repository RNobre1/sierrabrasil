import { useEffect, useRef } from "react";

/**
 * MeteoraSeal — The Meteora brand signature.
 * A holographic-style badge with a periodic light sweep and floating meteor particle.
 * Place in footers, sidebars, and key brand moments.
 */
export function MeteoraSeal({ className = "", size = "default" }: { className?: string; size?: "small" | "default" | "large" }) {
  const sizeClasses = {
    small: "h-6 px-2.5 text-[9px] gap-1.5",
    default: "h-7 px-3 text-[10px] gap-2",
    large: "h-8 px-4 text-[11px] gap-2",
  };

  return (
    <div className={`meteora-seal group inline-flex items-center ${sizeClasses[size]} rounded-full font-mono tracking-[0.15em] uppercase select-none ${className}`}>
      <span className="meteora-seal__star">✦</span>
      <span className="meteora-seal__text">Meteora</span>
      <span className="meteora-seal__dot" />
    </div>
  );
}

/**
 * MeteorTrail — A tiny shooting star that streaks across a container.
 * Wrap any element to add the ambient meteor effect.
 */
export function MeteorTrail({ children, className = "", interval = 8000 }: { children: React.ReactNode; className?: string; interval?: number }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const spawnMeteor = () => {
      const meteor = document.createElement("div");
      meteor.className = "meteora-meteor";
      const top = Math.random() * 60 + 10; // 10-70% from top
      meteor.style.top = `${top}%`;
      meteor.style.left = "-40px";
      container.appendChild(meteor);
      setTimeout(() => meteor.remove(), 1800);
    };

    // First one after a short delay
    const firstTimeout = setTimeout(spawnMeteor, 2000);
    const timer = setInterval(spawnMeteor, interval);
    return () => { clearTimeout(firstTimeout); clearInterval(timer); };
  }, [interval]);

  return (
    <div ref={containerRef} className={`relative overflow-hidden ${className}`}>
      {children}
    </div>
  );
}

/**
 * MeteoraWatermark — Minimal floating watermark for dashboard corners
 */
export function MeteoraWatermark({ position = "bottom-right" }: { position?: "bottom-right" | "bottom-left" }) {
  const posClass = position === "bottom-right" ? "right-4 bottom-4" : "left-4 bottom-4";
  return (
    <div className={`fixed ${posClass} z-10 pointer-events-none opacity-0 animate-[watermark-in_1s_ease-out_2s_forwards]`}>
      <div className="meteora-seal group inline-flex items-center h-5 px-2 text-[8px] gap-1.5 rounded-full font-mono tracking-[0.15em] uppercase select-none opacity-40">
        <span className="meteora-seal__star">✦</span>
        <span className="meteora-seal__text">Meteora</span>
      </div>
    </div>
  );
}
