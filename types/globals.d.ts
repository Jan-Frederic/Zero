// Ambient types for the type check of game.js (`npm run typecheck`). Nothing here ships to the browser.
interface Window {
  webkitAudioContext: typeof AudioContext;
  morbidBusy: () => boolean;
  morbidSettings: { set(key: string, value: string): void; get(key: string): unknown };
  morbidShop: unknown; morbidProfile: unknown; morbidI18n: unknown; morbidMutators: unknown;
  morbidShips: unknown; morbidStory: unknown; morbidSeason: unknown; morbidPhoto: unknown; morbidMissions: unknown;
}
// The game reads data-* attributes and styles from elements found with querySelector(All).
interface Element { dataset: DOMStringMap; style: CSSStyleDeclaration; disabled?: boolean }
// Event targets in click/key handlers are elements.
interface EventTarget { closest?(selector: string): Element | null; tagName?: string; blur?(): void }
interface ScreenOrientation { lock?(orientation: string): Promise<void> }
interface HTMLCanvasElement { captureStream(frameRate?: number): MediaStream }
