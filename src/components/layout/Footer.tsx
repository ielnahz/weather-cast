/**
 * Footer — App footer with credits
 */

export function Footer() {
  return (
    <footer className="mt-auto w-full max-w-6xl mx-auto px-4 md:px-0 py-4">
      <div className="text-center text-xs text-white/40">
        <p>
          Weather Cast — 数据来源{" "}
          <a
            href="https://open-meteo.com"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-white/60"
          >
            Open-Meteo
          </a>
        </p>
      </div>
    </footer>
  );
}
