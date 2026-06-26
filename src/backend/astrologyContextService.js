import { buildAstrologyContext, buildTransitDateForUser } from "../astrologyEngine.js";
import { enrichUserWithServerPlace } from "./placeResolutionService.js";

export async function buildServerAstrologyContext(payload = {}, env = process.env, deps = {}) {
  const inputUser = payload.user || {};
  if (payload.context) {
    return {
      user: inputUser,
      astrologyContext: payload.context,
      resolvedPlace: false
    };
  }

  const enrichPlace = deps.enrichUserWithServerPlace || enrichUserWithServerPlace;
  const user = await enrichPlace(inputUser, env, deps);
  const date = payload.date || new Date().toISOString().slice(0, 10);
  const astrologyContext = buildAstrologyContext(user, buildTransitDateForUser(user, date));

  return {
    user,
    astrologyContext,
    resolvedPlace: true
  };
}
