import { LINGUAFLIX_ATTR } from '@/shared/constants/netflix';

let bannerEl: HTMLDivElement | null = null;
let dismissTimer: ReturnType<typeof setTimeout> | null = null;

export function showBanner(message: string, autoDismissMs = 5000): void {
  removeBanner();

  bannerEl = document.createElement('div');
  bannerEl.setAttribute(LINGUAFLIX_ATTR.BANNER, '');
  bannerEl.textContent = `LinguaFlix: ${message}`;
  document.body.appendChild(bannerEl);

  if (autoDismissMs > 0) {
    dismissTimer = setTimeout(removeBanner, autoDismissMs);
  }
}

export function removeBanner(): void {
  if (dismissTimer !== null) {
    clearTimeout(dismissTimer);
    dismissTimer = null;
  }
  bannerEl?.remove();
  bannerEl = null;
}
