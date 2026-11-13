export const STAGE_CODES = ["W0", "W1", "W2", "W3", "C0", "C1", "C2", "C3", "C4", "TOP", "TIP", "BEAM"];

export function parseDebug(search) {
  const params = new URLSearchParams(search);
  let stage = null;
  if (params.has("stage")) {
    stage = params.get("stage");
    if (!STAGE_CODES.includes(stage)) {
      throw new Error(`Unknown stage code "${stage}". Valid codes: ${STAGE_CODES.join(" ")}`);
    }
  }
  let timescale = 1;
  if (params.has("timescale")) {
    timescale = Number(params.get("timescale"));
    if (!Number.isFinite(timescale) || timescale <= 0) {
      throw new Error(`Invalid timescale "${params.get("timescale")}". It must be a finite number above 0.`);
    }
  }
  return { debug: params.has("debug"), stage, timescale };
}
