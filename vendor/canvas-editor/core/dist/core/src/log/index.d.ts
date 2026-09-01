export declare const LOG_LEVEL: {
    DEBUG: number;
    INFO: number;
    WARNING: number;
    ERROR: number;
};
export declare class Logger {
    private level;
    constructor(level: number);
    debug(...args: unknown[]): void;
    info(...args: unknown[]): void;
    warning(...args: unknown[]): void;
    error(...args: unknown[]): void;
    trace(...args: unknown[]): void;
}
