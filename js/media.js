/* TERRA TWIN X — pictures of a place.
 *  1. NASA satellite imagery from GIBS (Global Imagery Browse Services) WMS — loaded as plain <img>, no key.
 *  2. Ground photos taken near the coordinates, from Wikimedia Commons (free licences, credited). */
(function (root) {
  const TTX = root.TTX = root.TTX || {};
  const GIBS = 'https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi';

  // a likely-clear date: dry season / summer for each latitude band
  const DATES = { nTrop: ['2024-02-12', '2023-12-05', '2024-03-10'], sTrop: ['2024-08-14', '2023-07-20', '2024-09-08'],
    north: ['2024-07-14', '2023-08-22', '2024-06-18'], south: ['2024-01-16', '2023-12-12', '2024-02-20'] };
  TTX.satDates = lat => lat >= 30 ? DATES.north : lat <= -30 ? DATES.south : lat >= 0 ? DATES.nTrop : DATES.sTrop;

  /** WMS 1.1.1 GetMap: BBOX is minLon,minLat,maxLon,maxLat */
  TTX.satUrl = function (lat, lon, spanDeg, opts = {}) {
    const { layer = 'MODIS_Terra_CorrectedReflectance_TrueColor', time = null, w = 640, h = 400 } = opts;
    const hs = spanDeg / 2, vs = spanDeg * (h / w) / 2;
    const bbox = [lon - hs, Math.max(-90, lat - vs), lon + hs, Math.min(90, lat + vs)].map(v => v.toFixed(4)).join(',');
    return `${GIBS}?SERVICE=WMS&REQUEST=GetMap&VERSION=1.1.1&LAYERS=${layer}&STYLES=&FORMAT=image/jpeg&SRS=EPSG:4326&BBOX=${bbox}&WIDTH=${w}&HEIGHT=${h}` + (time ? `&TIME=${time}` : '');
  };
  TTX.satViews = function (lat, lon, dateIdx = 0) {
    const d = TTX.satDates(lat), time = d[dateIdx % d.length];
    return [
      { url: TTX.satUrl(lat, lon, 1.2, { time }), label: `NASA Terra / MODIS true colour · ${time}`, kind: 'sat' },
      { url: TTX.satUrl(lat, lon, 8, { layer: 'BlueMarble_NextGeneration' }), label: 'NASA Blue Marble · regional context', kind: 'sat' },
    ];
  };

  const strip = html => { const d = document.createElement('div'); d.innerHTML = html || ''; return (d.textContent || '').replace(/\s+/g, ' ').trim(); };
  const cache = {};
  /** Up to `limit` free-licence photos taken within ~10 km of the point */
  TTX.photos = async function (lat, lon, limit = 6) {
    const key = lat.toFixed(3) + ',' + lon.toFixed(3);
    if (cache[key]) return cache[key];
    const u = 'https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*&generator=geosearch&ggsprimary=all&ggsnamespace=6' +
      `&ggsradius=10000&ggslimit=30&ggscoord=${lat}|${lon}&prop=imageinfo&iiprop=url|mime|extmetadata&iiurlwidth=900`;
    try {
      const r = await fetch(u); if (!r.ok) throw new Error(r.status);
      const j = await r.json(), pages = Object.values((j.query && j.query.pages) || {});
      const out = pages.map(p => ({ p, ii: (p.imageinfo || [])[0] })).filter(({ ii }) => ii && /jpe?g/i.test(ii.mime || '') && ii.thumburl)
        .filter(({ p }) => !/map|logo|diagram|chart|locator|flag|svg|plan/i.test(p.title))
        .slice(0, limit).map(({ p, ii }) => {
          const m = ii.extmetadata || {};
          return { url: ii.thumburl, page: ii.descriptionurl, title: strip(p.title.replace(/^File:/, '').replace(/\.[a-z]+$/i, '')),
            credit: [strip(m.Artist && m.Artist.value), strip(m.LicenseShortName && m.LicenseShortName.value)].filter(Boolean).join(' · ') || 'Wikimedia Commons', kind: 'photo' };
        });
      return (cache[key] = out);
    } catch (e) { return (cache[key] = []); }
  };
})(window);
