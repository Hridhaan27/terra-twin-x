/* TERRA TWIN X — narration voice.
 * Order of preference for each line the explainer speaks:
 *   1. a pre-generated ElevenLabs clip shipped in narration/pack.js (matched by an exact hash of the text,
 *      so a clip is only used when it says exactly what the app wants to say)
 *   2. live ElevenLabs text-to-speech, if this browser has an ElevenLabs API key saved (About → Narration voice)
 *   3. the browser's built-in speech synthesis
 * The API key is stored only in this browser's localStorage and is never written into the site's files. */
(function (root) {
  const TTX = root.TTX = root.TTX || {};
  const DEFAULT_VOICE = 'GrGZY9w6IXhm3DAtiPXT';       // ElevenLabs "Jennica" — warm documentary narrator
  const MODEL = 'eleven_multilingual_v2';
  const pack = Object.assign({}, root.TTX_NARRATION || {});
  const session = {};                                 // clips generated in this browser, for "Download narration pack"
  const inflight = {};
  const get = k => { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } };
  const set = (k, v) => { try { v ? localStorage.setItem(k, v) : localStorage.removeItem(k); } catch (e) { } };

  function hash(text) { let h = 0x811c9dc5; for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(16).padStart(8, '0'); }
  const blobToDataUrl = b => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(b); });

  const synth = root.speechSynthesis; let sysVoice = null;
  function pickSys() {
    if (!synth) return null; const v = synth.getVoices().filter(v => /^en/i.test(v.lang));
    for (const re of [/Natural/i, /Google UK English Female/i, /Google US English/i, /Samantha/i, /Daniel/i, /Microsoft (Aria|Jenny|Guy|Sonia)/i]) { const f = v.find(x => re.test(x.name)); if (f) return f; }
    return v[0] || null;
  }
  if (synth) { sysVoice = pickSys(); synth.onvoiceschanged = () => { sysVoice = pickSys(); }; }

  async function eleven(text) {
    const h = hash(text); if (pack[h]) return pack[h]; if (session[h]) return session[h];
    const key = get('ttx_el_key'); if (!key) return null;
    if (inflight[h]) return inflight[h];
    inflight[h] = (async () => {
      const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(get('ttx_el_voice') || DEFAULT_VOICE)}?output_format=mp3_44100_64`, {
        method: 'POST', headers: { 'xi-api-key': key, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
        body: JSON.stringify({ text, model_id: MODEL, voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.2 } }) });
      if (!r.ok) throw new Error('ElevenLabs HTTP ' + r.status);
      const url = await blobToDataUrl(await r.blob()); session[h] = url; return url;
    })();
    try { return await inflight[h]; } catch (e) { console.warn(e); return null; } finally { delete inflight[h]; }
  }

  let audio = null, seq = 0;
  TTX.voice = {
    mode() { return Object.keys(pack).length || get('ttx_el_key') ? 'ElevenLabs' : (synth ? 'browser' : 'none'); },
    label() { const m = this.mode(); return m === 'ElevenLabs' ? 'ElevenLabs AI voice' : m === 'browser' ? `browser text-to-speech${sysVoice ? ' (' + sysVoice.name + ')' : ''}` : 'no voice available'; },
    has(text) { const h = hash(text); return !!(pack[h] || session[h]); },
    prefetch(lines) { if (get('ttx_el_key')) lines.forEach(t => eleven(t)); },
    /** Speak one line; resolves when it has finished (or failed). */
    async speak(text) {
      this.stop(); const my = ++seq;
      const clip = await eleven(text).catch(() => null);
      if (my !== seq) return;                       // a newer line started meanwhile
      if (clip) return new Promise(res => { audio = new Audio(clip); audio.onended = res; audio.onerror = res; audio.play().catch(res); });
      if (!synth) return;
      return new Promise(res => { const u = new SpeechSynthesisUtterance(text); if (sysVoice) u.voice = sysVoice; u.onend = res; u.onerror = res; synth.speak(u);
        setTimeout(res, (text.split(/\s+/).length / 2.3 + 6) * 1000); });
    },
    stop() { seq++; if (audio) { audio.onended = null; audio.pause(); audio = null; } if (synth) synth.cancel(); },
    settings() { return { key: get('ttx_el_key'), voice: get('ttx_el_voice') || DEFAULT_VOICE }; },
    save(key, voice) { set('ttx_el_key', (key || '').trim()); set('ttx_el_voice', (voice || '').trim() === DEFAULT_VOICE ? '' : (voice || '').trim()); },
    clipCount() { return Object.keys(Object.assign({}, pack, session)).length; },
    exportPack() { return '/* ElevenLabs narration clips, keyed by a hash of the exact sentence. Generated with TERRA TWIN X → About → Narration voice. */\nwindow.TTX_NARRATION = ' + JSON.stringify(Object.assign({}, pack, session)) + ';\n'; },
  };
})(window);
