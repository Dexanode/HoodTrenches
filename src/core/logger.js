export function createLogger(scope) {
  function write(level, message, meta = {}) {
    const entry = {
      ts: new Date().toISOString(),
      level,
      scope,
      message,
      ...meta
    };
    console.log(JSON.stringify(entry));
  }

  return {
    info: (message, meta) => write("info", message, meta),
    warn: (message, meta) => write("warn", message, meta),
    error: (message, meta) => write("error", message, meta),
    debug: (message, meta) => write("debug", message, meta)
  };
}
