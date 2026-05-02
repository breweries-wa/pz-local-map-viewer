// mods.js — loaded before pzmap.js
// Intercepts DZI descriptor fetches for b42map.com (no CORS headers) and
// returns inline config so the viewer never makes a cross-origin XML request.
// Tile images themselves load via <img> tags and bypass CORS entirely.

const VANILLA = {
  w: 2314432,
  h: 1019072,
  tileSize: 1024,
  format: 'jpg',
};

const VANILLA_DZI = `<?xml version="1.0" encoding="UTF-8"?>
<Image xmlns="http://schemas.microsoft.com/deepzoom/2008" TileSize="${VANILLA.tileSize}" Overlap="0" Format="${VANILLA.format}">
  <Size Width="${VANILLA.w}" Height="${VANILLA.h}"/>
</Image>`;

const _origFetch = window.fetch.bind(window);
window.fetch = function (input, init) {
  const url = typeof input === 'string' ? input : input instanceof Request ? input.url : String(input);
  if (url.startsWith('https://b42map.com/') && url.endsWith('.dzi')) {
    return Promise.resolve(new Response(VANILLA_DZI, {
      status: 200,
      headers: { 'Content-Type': 'application/xml' },
    }));
  }
  return _origFetch(input, init);
};
