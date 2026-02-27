export type LoggerOptions = {
  level: string;
  /** Write human-readable output to stdout (default: false → JSON) */
  pretty: boolean;
  /** Path to log file. Supports date tokens, e.g. ./logs/app.%Y-%m-%d.log */
  file?: string;
  /** Max file size before rotation, e.g. '10m', '100m' (pino-roll syntax) */
  fileSize?: string;
  /** Rotation frequency: 'daily' | 'hourly' (pino-roll syntax) */
  fileFrequency?: 'daily' | 'hourly';
  /** Max number of rotated files to keep (0 = unlimited) */
  fileMaxFiles?: number;
};

export interface ILogger {
  trace(obj: object | string, msg?: string): void;
  debug(obj: object | string, msg?: string): void;
  info(obj: object | string, msg?: string): void;
  warn(obj: object | string, msg?: string): void;
  error(obj: object | string, msg?: string): void;
  fatal(obj: object | string, msg?: string): void;
}
