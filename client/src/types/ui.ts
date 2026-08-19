import type { BannerTone } from "../components/Banner";

export type Theme = "dark" | "light";
export type Notice = { tone: BannerTone; title: string; message: string };
