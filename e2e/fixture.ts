/**
 * Ports for the Playwright tests. The app runs on one port and the fake host page (our stand-in for
 * momsbloom.org) on another. Two ports means two "origins", so the browser treats them as two
 * different websites, just like Squarespace and Vercel in production.
 * Set E2E_APP_PORT or E2E_HOST_PORT if a port is already in use.
 */
export const APP_PORT = Number(process.env.E2E_APP_PORT ?? 3100);
export const HOST_PORT = Number(process.env.E2E_HOST_PORT ?? 4100);
export const APP = `http://localhost:${APP_PORT}`;
export const HOST = `http://localhost:${HOST_PORT}`;
