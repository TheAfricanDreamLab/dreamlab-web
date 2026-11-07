/**
 * Plays an HLS stream in a <video> (CAT-6): hls.js where the browser supports Media Source
 * Extensions, the browser's own HLS otherwise (Safari, iPhone). hls.js loads only when needed.
 * Returns a function that stops it.
 */
export function attachHls(el: HTMLVideoElement, src: string): () => void {
  let stop = () => undefined as void;
  let cancelled = false;
  void import('hls.js').then(({ default: Hls }) => {
    if (cancelled) return;
    if (Hls.isSupported()) {
      const hls = new Hls({ capLevelToPlayerSize: true, maxBufferLength: 30 });
      hls.loadSource(src);
      hls.attachMedia(el);
      stop = () => hls.destroy();
    } else if (el.canPlayType('application/vnd.apple.mpegurl')) {
      el.src = src;
    }
  });
  return () => {
    cancelled = true;
    stop();
  };
}
