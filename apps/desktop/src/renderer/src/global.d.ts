import type { Api } from "@wilmak/shared";

declare global {
  interface Window {
    api: Api;
  }
}

export {};
