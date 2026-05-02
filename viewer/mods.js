// mods.js — loaded before pzmap.js, after openseadragon.js
// Intercepts b42map.com requests (no CORS headers) and returns inline data
// so the viewer never makes a blocked cross-origin request.
// Tile images load via <img> tags and bypass CORS entirely.

const _BASE_INFO = {
  w: 2314432, h: 1019072, skip: 0,
  cell_rects: [[0,18,45,45],[45,3,13,60],[58,0,20,63]],
  cell_size: 256, block_size: 8,
  pz_version: 'B42', maxlayer: 30, minlayer: -17,
  pzmap2dzi_version: '1.1.6',
  git_branch: '', git_commit: '', legends: {},
  x0: 1036288, y0: -139296, sqr: 128,
};

const VANILLA_MAP_INFO = {
  'base':     _BASE_INFO,
  'base_top': _BASE_INFO,
  'zombie':   _BASE_INFO,
  'rooms':    _BASE_INFO,
  'foraging': Object.assign({}, _BASE_INFO, { legends: {
    TownZone: 'Blue', TrailerPark: 'Cyan', Forest: 'Lime',
    DeepForest: 'Green', FarmLand: 'Magenta', Farm: 'Red',
    ForagingNav: 'White', Water: 'DeepSkyBlue', PHForest: 'OrangeRed',
    PRForest: 'ForestGreen', FarmMixForest: 'Olive', FarmForest: 'Orange',
    BirchForest: 'OliveDrab', BirchMixForest: 'DarkOliveGreen',
    OrganicForest: 'LawnGreen',
  }}),
  'objects': Object.assign({}, _BASE_INFO, { legends: {
    ZombiesType: 'Red', ParkingStall: 'Blue', ZoneStory: 'Yellow',
  }}),
};

const VANILLA_DZI = `<?xml version="1.0" encoding="UTF-8"?>
<Image xmlns="http://schemas.microsoft.com/deepzoom/2008" TileSize="1024" Overlap="0" Format="jpg">
  <Size Width="${_BASE_INFO.w}" Height="${_BASE_INFO.h}"/>
</Image>`;

function b42Intercept(url) {
  if (typeof url !== 'string' || !url.startsWith('https://b42map.com/')) return null;
  if (url.endsWith('.dzi')) {
    return { body: VANILLA_DZI, type: 'application/xml' };
  }
  if (url.endsWith('/map_info.json') || url.endsWith('/marks.json')) {
    if (url.endsWith('/marks.json')) {
      return { body: 'null', type: 'application/json' };
    }
    const type = url.split('/').slice(-2, -1)[0];
    const data = VANILLA_MAP_INFO[type] || _BASE_INFO;
    return { body: JSON.stringify(data), type: 'application/json' };
  }
  return null;
}

// Patch window.fetch (used by pzmap modules for map_info.json, marks.json, etc.)
const _origFetch = window.fetch.bind(window);
window.fetch = function(input, init) {
  const url = typeof input === 'string' ? input : input instanceof Request ? input.url : String(input);
  const hit = b42Intercept(url);
  if (hit) {
    return Promise.resolve(new Response(hit.body, {
      status: 200,
      headers: { 'Content-Type': hit.type },
    }));
  }
  return _origFetch(input, init);
};

// Patch OpenSeadragon.makeAjaxRequest (used to load DZI descriptors).
// mods.js loads after openseadragon.js so OpenSeadragon is already defined.
const _origMakeAjax = OpenSeadragon.makeAjaxRequest;
OpenSeadragon.makeAjaxRequest = function(opts) {
  const url = (typeof opts === 'string') ? opts : opts.url;
  const hit = b42Intercept(url);
  if (hit) {
    const success = (typeof opts === 'string') ? arguments[1] : opts.success;
    if (typeof success === 'function') {
      setTimeout(function() {
        success({ readyState: 4, status: 200, responseText: hit.body, response: hit.body });
      }, 0);
    }
    return {};
  }
  return _origMakeAjax.apply(OpenSeadragon, arguments);
};
