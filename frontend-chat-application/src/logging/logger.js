const LOG_ENABLED =
  import.meta.env.DEV || import.meta.env.VITE_CHAT_DEBUG === "true";

const ts = () => new Date().toISOString();

/**
 * @param {string} scope
 * @param {{current?: string}=} idRef  // valfritt ref-objekt med .current
 */
export function createLogger(scope, idRef) {
  const outFor = (level) =>
    level === "warn"
      ? console.warn
      : level === "error"
      ? console.error
      : level === "debug"
      ? console.debug
      : console.log;

  const fmt = (level, ...args) => {
    if (!LOG_ENABLED) return;
    const id = idRef && idRef.current ? `#${idRef.current}` : "";
    const prefix = `[${ts()}] [${level.toUpperCase()}] [${scope}]${id ? ` [${id}]` : ""}`;
    outFor(level)(prefix, ...args);
  };

  return {
    info:  (...a) => fmt("info",  ...a),
    warn:  (...a) => fmt("warn",  ...a),
    error: (...a) => fmt("error", ...a),
    debug: (...a) => fmt("debug", ...a),
    event: (name, data) => fmt("info", { event: name, ...data }),
  };
}
