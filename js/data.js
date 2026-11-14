/* TERRA TWIN X — site catalogue and reference values.
 * Categorical attributes (lithology / terrain / regolith / ground ice) are well-known descriptive
 * facts about each site. Climate for every Earth site is NOT stored here: it is fetched live from
 * NASA POWER (see power.js). Planetary reference values are approximate literature figures used
 * only for the Delta Matrix display — replace them with Mars Climate Database / LRO Diviner values
 * for publication-grade work. */
(function (root) {
  const TTX = root.TTX = root.TTX || {};

  // ---------- vocabularies ----------
  TTX.LITH = { basalt: 'Basalt', tephra: 'Pyroclastic / tephra', sediment: 'Clastic sediment', evaporite: 'Evaporite / salts',
    breccia: 'Impact breccia', hydrothermal: 'Acid-sulfate hydrothermal', crystalline: 'Crystalline (granite / anorthosite)', soil: 'Vegetated soil' };
  TTX.TERRAIN = { crater: 'Crater', plains: 'Plains', basin: 'Basin', valley: 'Valley', volcanic_field: 'Volcanic field',
    lava_tube: 'Lava tube / pit', plateau: 'Plateau', dunes: 'Dune field', mound: 'Layered mound' };
  TTX.REGOLITH = { dust_sand: 'Fine dust / sand', basaltic_sand: 'Basaltic sand', tephra_cinder: 'Tephra / cinder',
    salt_crust: 'Salt crust', rocky_breccia: 'Rocky / breccia', vegetated_soil: 'Vegetated soil' };

  // symmetric affinity (0–1) between categories; anything unlisted = 0.2, identical = 1
  function table(pairs) { const m = {}; for (const [a, b, v] of pairs) { m[a + '|' + b] = v; m[b + '|' + a] = v; } return m; }
  TTX.AFF = {
    lith: table([['basalt','tephra',.8],['sediment','evaporite',.6],['breccia','crystalline',.6],['breccia','basalt',.5],['breccia','sediment',.4],
      ['hydrothermal','evaporite',.6],['hydrothermal','sediment',.4],['hydrothermal','basalt',.3],['crystalline','basalt',.3],
      ['crystalline','sediment',.3],['tephra','sediment',.3],['soil','sediment',.15],['soil','basalt',.1]]),
    terrain: table([['crater','basin',.5],['crater','mound',.4],['plains','basin',.7],['plains','dunes',.6],['plains','plateau',.6],
      ['plains','volcanic_field',.5],['valley','basin',.5],['volcanic_field','lava_tube',.6],['volcanic_field','plateau',.5],
      ['plateau','mound',.5],['lava_tube','crater',.3],['crater','plains',.3]]),
    regolith: table([['dust_sand','basaltic_sand',.7],['basaltic_sand','tephra_cinder',.7],['dust_sand','tephra_cinder',.5],
      ['rocky_breccia','tephra_cinder',.4],['rocky_breccia','basaltic_sand',.4],['salt_crust','dust_sand',.4],['vegetated_soil','dust_sand',.1]]),
  };

  // ---------- targets ----------
  const MARS = { body: 'mars', gravity: 0.38, gravityTxt: '0.38 g', pressureTxt: '~0.6–0.9 kPa', pressureKPa: 0.75,
    tempTxt: '~ −60 °C mean', swingTxt: '~70–90 °C', precipTxt: '0 (no rain)', rhTxt: '≈0 (thin, dry air)',
    doseTxt: '~0.67 mSv/day', doseRef: 'Curiosity RAD, Gale Crater' };
  const MOON = { body: 'moon', gravity: 0.166, gravityTxt: '0.17 g', pressureTxt: '≈0 (vacuum)', pressureKPa: 0,
    tempTxt: 'Extreme; no air', swingTxt: '~250–300 °C at low latitudes', precipTxt: '0', rhTxt: '0 (vacuum)',
    doseTxt: '~1.4 mSv/day', doseRef: "Chang'e-4 LND" };
  TTX.TARGETS = [
    { id: 'jezero', name: 'Jezero Crater', ...MARS, lat: 18.4, lon: 77.5, lith: ['basalt', 'sediment'], terrain: ['crater'], regolith: ['basaltic_sand'], ice: false,
      note: 'Ancient lake and river delta explored by Perseverance.' },
    { id: 'gale', name: 'Gale Crater (Aeolis Mons)', ...MARS, lat: -5.4, lon: 137.8, lith: ['sediment', 'evaporite'], terrain: ['crater', 'mound'], regolith: ['basaltic_sand', 'dust_sand'], ice: false,
      note: 'Layered sedimentary mound explored by Curiosity.' },
    { id: 'arcadia', name: 'Arcadia Planitia', ...MARS, lat: 46, lon: -167, lith: ['basalt', 'sediment'], terrain: ['plains'], regolith: ['dust_sand'], ice: true,
      note: 'Mid-latitude plains with shallow ground ice — a candidate crewed landing region.' },
    { id: 'shackleton', name: 'Shackleton Crater Rim', ...MOON, lat: -89.9, lon: 0, lith: ['crystalline', 'breccia'], terrain: ['crater'], regolith: ['dust_sand'], ice: true,
      swingTxt: 'Cold, low-sun polar regime', note: 'South-polar rim: near-continuous sunlight beside permanently shadowed, possibly icy terrain.' },
    { id: 'tranq', name: 'Mare Tranquillitatis Skylight', ...MOON, lat: 8.3, lon: 33.2, lith: ['basalt'], terrain: ['lava_tube'], regolith: ['dust_sand', 'basaltic_sand'], ice: false,
      note: 'Collapse pit that may open into a lava tube — a natural radiation shelter.' },
    { id: 'aristarchus', name: 'Aristarchus Plateau', ...MOON, lat: 26, lon: -51, lith: ['tephra', 'basalt'], terrain: ['plateau', 'volcanic_field'], regolith: ['tephra_cinder'], ice: false,
      note: 'Plateau blanketed by volcanic glass beads — a resource (oxygen) target.' },
  ];

  // ---------- Earth sites ----------
  // status: 'established' = classic, heavily used analog; 'candidate' = in this tool's discovery pool; 'control' = non-analog baseline for validation
  const S = (id, name, region, lat, lon, status, lith, terrain, regolith, ice, note) => ({ id, name, region, lat, lon, status, lith, terrain, regolith, ice, note });
  TTX.SITES = [
    S('yungay', 'Yungay Basin', 'Atacama, Chile', -24.08, -70.0, 'established', ['sediment', 'evaporite'], ['basin'], ['dust_sand'], false, 'Hyper-arid core of the Atacama; near-sterile soils.'),
    S('haughton', 'Haughton Impact Crater', 'Devon Island, Canada', 75.38, -89.68, 'established', ['breccia', 'sediment'], ['crater'], ['rocky_breccia'], true, 'Polar-desert impact crater with permafrost.'),
    S('maunakea', 'Mauna Kea Tephra Plains', 'Hawaiʻi, USA', 19.76, -155.45, 'established', ['tephra', 'basalt'], ['volcanic_field'], ['tephra_cinder'], false, 'High-altitude basaltic tephra; lunar regolith analog.'),
    S('riotinto', 'Río Tinto', 'Andalusia, Spain', 37.72, -6.56, 'established', ['hydrothermal'], ['valley'], ['dust_sand'], false, 'Acidic, iron-rich river; Mars sulfate chemistry analog.'),
    S('mcmurdo', 'McMurdo Dry Valleys', 'Antarctica', -77.52, 161.85, 'established', ['crystalline', 'sediment'], ['valley'], ['dust_sand'], true, 'Cold, hyper-arid polar desert with permafrost.'),
    S('cratersmoon', 'Craters of the Moon', 'Idaho, USA', 43.42, -113.52, 'established', ['basalt'], ['volcanic_field', 'lava_tube'], ['tephra_cinder'], false, 'Basaltic lava field with tubes and cinder cones.'),
    S('askja', 'Krafla & Askja', 'Iceland', 65.03, -16.75, 'established', ['basalt', 'tephra'], ['volcanic_field'], ['tephra_cinder'], false, 'Volcanic plains used for rover and EVA training.'),
    S('ladakh', 'Ladakh (Tso Kar & Puga)', 'Ladakh, India', 33.30, 77.98, 'established', ['sediment', 'evaporite'], ['plateau', 'basin'], ['salt_crust'], true, 'High, cold desert with salt lakes and hot springs.'),
    S('pilbara', 'Pilbara Craton', 'Western Australia', -21.15, 119.43, 'established', ['sediment', 'basalt'], ['plains'], ['rocky_breccia'], false, 'Ancient rocks with early-life stromatolites.'),
    S('ries', 'Nördlinger Ries', 'Bavaria, Germany', 48.88, 10.57, 'established', ['breccia'], ['crater'], ['rocky_breccia'], false, 'Well-preserved impact crater with suevite breccia.'),
    S('deathvalley', 'Death Valley (Badwater)', 'California, USA', 36.23, -116.77, 'established', ['evaporite', 'sediment'], ['basin'], ['salt_crust'], false, 'Hot evaporite basin named in the challenge brief.'),
    S('mdrs', 'Hanksville (MDRS)', 'Utah, USA', 38.41, -110.79, 'established', ['sediment'], ['plains', 'valley'], ['dust_sand'], false, 'Clay and sandstone badlands around a Mars habitat simulator.'),
    // discovery pool
    S('lonar', 'Lonar Crater', 'Maharashtra, India', 19.98, 76.51, 'candidate', ['basalt', 'breccia'], ['crater'], ['basaltic_sand'], false, 'Impact crater in Deccan basalt — rare basalt-target crater.'),
    S('kutch', 'Great Rann of Kutch', 'Gujarat, India', 23.83, 69.65, 'candidate', ['evaporite', 'sediment'], ['plains'], ['salt_crust'], false, 'Vast seasonal salt flat; evaporite analog.'),
    S('spiti', 'Spiti Valley', 'Himachal Pradesh, India', 32.25, 78.03, 'candidate', ['sediment'], ['valley'], ['dust_sand'], true, 'High-altitude cold desert valley.'),
    S('thar', 'Thar Desert (Jaisalmer)', 'Rajasthan, India', 26.91, 70.90, 'candidate', ['sediment'], ['dunes'], ['dust_sand'], false, 'Aeolian dune fields.'),
    S('dallol', 'Dallol', 'Afar, Ethiopia', 14.24, 40.30, 'candidate', ['hydrothermal', 'evaporite'], ['basin'], ['salt_crust'], false, 'Hyper-acidic, salty hydrothermal field.'),
    S('wadirum', 'Wadi Rum', 'Jordan', 29.58, 35.42, 'candidate', ['sediment'], ['valley', 'plateau'], ['dust_sand'], false, 'Red sandstone desert valleys.'),
    S('lavabeds', 'Lava Beds', 'California, USA', 41.71, -121.51, 'candidate', ['basalt'], ['lava_tube'], ['tephra_cinder'], false, 'Hundreds of accessible lava tubes.'),
    S('undara', 'Undara Lava Tubes', 'Queensland, Australia', -18.20, 144.58, 'candidate', ['basalt'], ['lava_tube'], ['rocky_breccia'], false, 'Long, large-diameter lava tubes.'),
    S('timanfaya', 'Timanfaya', 'Lanzarote, Spain', 29.00, -13.75, 'candidate', ['basalt', 'tephra'], ['volcanic_field'], ['tephra_cinder'], false, 'Young basaltic lava fields and cinder.'),
    S('bockfjorden', 'Bockfjorden', 'Svalbard, Norway', 79.42, 13.33, 'candidate', ['basalt', 'hydrothermal'], ['valley'], ['rocky_breccia'], true, 'Arctic volcanic centre with carbonate deposits and permafrost.'),
    S('uyuni', 'Salar de Uyuni', 'Bolivia', -20.13, -67.49, 'candidate', ['evaporite'], ['plains'], ['salt_crust'], false, 'High-altitude salt flat.'),
    S('namib', 'Namib Desert (Gobabeb)', 'Namibia', -23.56, 15.04, 'candidate', ['sediment'], ['dunes'], ['dust_sand'], false, 'Fog desert with large dune fields.'),
    S('manjanggul', 'Manjanggul Lava Tube', 'Jeju, South Korea', 33.53, 126.77, 'candidate', ['basalt'], ['lava_tube'], ['rocky_breccia'], false, 'Large basaltic lava tube.'),
    S('kau', 'Kaʻū Desert', 'Hawaiʻi, USA', 19.38, -155.33, 'candidate', ['basalt', 'tephra'], ['volcanic_field'], ['tephra_cinder'], false, 'Basaltic ash desert on Kīlauea.'),
    // validation controls: places nobody would use as an analog
    S('ctl_london', 'London', 'UK', 51.51, -0.12, 'control', ['soil'], ['plains'], ['vegetated_soil'], false, 'Control: temperate, wet, vegetated.'),
    S('ctl_manaus', 'Manaus', 'Amazonas, Brazil', -3.10, -60.02, 'control', ['soil'], ['plains'], ['vegetated_soil'], false, 'Control: tropical rainforest.'),
    S('ctl_kolkata', 'Kolkata', 'West Bengal, India', 22.57, 88.36, 'control', ['soil', 'sediment'], ['plains'], ['vegetated_soil'], false, 'Control: humid delta plain.'),
    S('ctl_singapore', 'Singapore', 'Singapore', 1.35, 103.82, 'control', ['soil'], ['plains'], ['vegetated_soil'], false, 'Control: equatorial, humid.'),
    S('ctl_iowa', 'Central Iowa', 'USA', 42.00, -93.60, 'control', ['soil'], ['plains'], ['vegetated_soil'], false, 'Control: farmland.'),
    S('ctl_congo', 'Kisangani', 'DR Congo', 0.52, 25.20, 'control', ['soil'], ['plains'], ['vegetated_soil'], false, 'Control: rainforest basin.'),
  ];

  // ---------- experiment weight profiles: [geology, topography, thermal, aridity, radiation, regolith] ----------
  TTX.VECTORS = ['Geology', 'Topography', 'Thermal', 'Aridity', 'Radiation', 'Regolith'];
  TTX.EXPERIMENTS = [
    { id: 'rover', name: 'Rover Mobility', w: [10, 30, 15, 10, 5, 30] },
    { id: 'isru', name: 'ISRU Water / O₂', w: [30, 5, 20, 25, 5, 15] },
    { id: 'eva', name: 'EVA & Habitats', w: [5, 20, 30, 10, 25, 10] },
    { id: 'astro', name: 'Astrobiology', w: [25, 5, 15, 30, 20, 5] },
    { id: 'drill', name: 'Subsurface Drilling', w: [30, 10, 20, 10, 5, 25] },
  ];

  // ---------- Earth envelope used to normalise live climate (direction = towards Moon/Mars-like) ----------
  TTX.ENVELOPE = {
    tmean: { min: -55, max: 30, toward: 'low' },      // °C, colder is more planet-like
    trange: { min: 2, max: 25, toward: 'high' },      // °C diurnal swing, larger is more planet-like
    precip: { min: 0, max: 3.5, toward: 'low' },      // log10(1 + mm/yr)
    rh: { min: 5, max: 95, toward: 'low' },           // %
    elev: { min: 0, max: 5000, toward: 'high' },      // m (thinner air: more UV & cosmic rays)
    solar: { min: 2, max: 7.5, toward: 'high' },      // kWh/m²/day clear, intense sunlight
  };

  // ---------- simple dotted continents for the Earth globe (visual only) ----------
  const CONT = [[48,-102,22],[60,-120,14],[30,-95,12],[18,-98,8],[68,-150,9],[72,-40,10],[-12,-58,16],[-30,-64,10],[4,-70,9],
    [50,12,10],[60,30,12],[42,-4,6],[8,20,20],[-12,26,15],[-28,24,8],[24,12,12],[30,44,10],[55,90,26],[62,130,18],
    [40,105,15],[22,79,9],[14,102,8],[0,113,8],[-24,134,13],[-80,0,12],[-78,90,12],[-78,-90,12],[-78,180,12],[36,138,5],[64,-18,3]];
  TTX.angDist = function (la1, lo1, la2, lo2) {
    const r = Math.PI / 180, a = Math.sin(la1*r)*Math.sin(la2*r) + Math.cos(la1*r)*Math.cos(la2*r)*Math.cos((lo1-lo2)*r);
    return Math.acos(Math.max(-1, Math.min(1, a))) / r;
  };
  TTX.dots = function (kind) {
    const out = [];
    const step0 = kind === 'earth' ? 2.6 : 3.2;
    for (let lat = -84; lat <= 84; lat += step0) {
      const step = step0 / Math.max(0.15, Math.cos(lat * Math.PI / 180));
      for (let lon = -180; lon < 180; lon += step) {
        if (kind === 'earth') {
          const n = Math.sin(lat * 0.31 + lon * 0.17) * 3 + Math.sin(lon * 0.41 - lat * 0.23) * 2.5;
          if (CONT.some(c => TTX.angDist(lat, lon, c[0], c[1]) < c[2] + n)) out.push([lat, lon, null]);
        } else if (kind === 'mars') {
          const n = Math.sin(lat*0.09+lon*0.05)+Math.sin(lon*0.13-lat*0.07)*0.8+Math.sin(lat*0.21)*0.5;
          if (n > 0.15 || ((lat * 7919 + lon * 104729) % 97 + 97) % 97 < 12) out.push([lat, lon, n > 0.7 ? '#FFB08F' : '#FF551A']);
        } else {
          const MARIA = [[33,-16,18],[28,17,10],[8,31,12],[17,59,8],[10,-50,25],[-8,51,8],[-21,-17,9]];
          const mare = MARIA.some(m => TTX.angDist(lat, lon, m[0], m[1]) < m[2]);
          out.push([lat, lon, mare ? '#6F6862' : '#CFC8C1']);
        }
      }
    }
    return out;
  };
})(typeof window !== 'undefined' ? window : globalThis);
