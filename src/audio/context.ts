/**
 * The one AudioContext of the site. Browsers, Safari on the iPad above all, let sound
 * start only from a tap: `audio()` must be called inside the handler of that tap, where it
 * creates the context or wakes it up. Nothing ever plays by itself.
 *
 * Everything goes through a master gain and a gentle compressor, so that two sounds
 * together never distort on the small speakers of a tablet. M7 plays the sounds of the
 * Golden Record through it; M8 adds the background music and its switch here.
 */

export interface AudioOut {
  readonly context: AudioContext;
  /** Where sounds connect: the master gain. */
  readonly output: AudioNode;
}

let out: AudioOut | null = null;

type WithWebkit = typeof window & { webkitAudioContext?: typeof AudioContext };
type WithSession = Navigator & { audioSession?: { type: string } };

/** The context, created or woken up. Null where the browser has no Web Audio. */
export function audio(): AudioOut | null {
  if (!out) {
    const Context = window.AudioContext ?? (window as WithWebkit).webkitAudioContext;
    if (!Context) return null;
    // Safari 17 and later: these are sounds she asked for, so they play like music
    // (otherwise an iPhone on silent would play nothing).
    const session = (navigator as WithSession).audioSession;
    if (session) {
      try {
        session.type = 'playback';
      } catch {
        // Not allowed here: the default is fine.
      }
    }
    const context = new Context();
    const compressor = context.createDynamicsCompressor();
    compressor.threshold.value = -12;
    compressor.knee.value = 10;
    compressor.ratio.value = 4;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.25;
    const master = context.createGain();
    master.gain.value = 0.9;
    master.connect(compressor).connect(context.destination);
    out = { context, output: master };
  }
  if (out.context.state !== 'running') void out.context.resume().catch(() => undefined);
  return out;
}
