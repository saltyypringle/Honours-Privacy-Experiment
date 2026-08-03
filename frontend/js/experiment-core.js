"use strict";

/*
 * Core experiment state management.
 *
 * Qualtrics should redirect participants to:
 *
 * index.html?pid=PARTICIPANT_ID&condition=control
 * index.html?pid=PARTICIPANT_ID&condition=automation
 * index.html?pid=PARTICIPANT_ID&condition=suggestions
 */

const SESSION_STORAGE_KEY = "privacyExperimentSession";
const EVENT_STORAGE_KEY = "privacyExperimentEvents";

const VALID_CONDITIONS = new Set([
  "control",
  "automation",
  "suggestions"
]);

const DEFAULT_SITE_ORDER = [
  "site1",
  "site2",
  "site3"
];

/**
 * Safely retrieve the experiment session.
 *
 * @returns {object|null}
 */
export function getSession() {
  const rawSession = sessionStorage.getItem(SESSION_STORAGE_KEY);

  if (!rawSession) {
    return null;
  }

  try {
    return JSON.parse(rawSession);
  } catch (error) {
    console.error("Stored experiment session is invalid:", error);
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    return null;
  }
}

/**
 * Save the current experiment session.
 *
 * @param {object} session
 */
export function saveSession(session) {
  sessionStorage.setItem(
    SESSION_STORAGE_KEY,
    JSON.stringify(session)
  );
}

/**
 * Validate the participant code received from Qualtrics.
 *
 * Permitted characters:
 * - letters
 * - numbers
 * - underscores
 * - hyphens
 *
 * @param {string|null} participantId
 * @returns {boolean}
 */
function isValidParticipantId(participantId) {
  if (!participantId) {
    return false;
  }

  return /^[A-Za-z0-9_-]{6,64}$/.test(participantId);
}

/**
 * Create or restore the participant's experiment session.
 *
 * @returns {object}
 * @throws {Error} when the URL parameters are missing or invalid
 */
export function initialiseSessionFromUrl() {
  const existingSession = getSession();

  const params = new URLSearchParams(window.location.search);

  const participantIdFromUrl =
    params.get("pid")?.trim() || null;

  const conditionFromUrl =
    params.get("condition")?.trim().toLowerCase() || null;

  /*
   * This permits the participant to refresh the page after the query
   * parameters have been removed from the visible URL.
   */
  if (
    !participantIdFromUrl &&
    !conditionFromUrl &&
    existingSession
  ) {
    return existingSession;
  }

  if (!isValidParticipantId(participantIdFromUrl)) {
    throw new Error(
      "The participant code is missing or invalid."
    );
  }

  if (!VALID_CONDITIONS.has(conditionFromUrl)) {
    throw new Error(
      "The experimental condition is missing or invalid."
    );
  }

  /*
   * Preserve an existing session when the participant reloads the
   * original Qualtrics redirect URL.
   */
  if (
    existingSession &&
    existingSession.participantId === participantIdFromUrl &&
    existingSession.condition === conditionFromUrl
  ) {
    return existingSession;
  }

  const newSession = {
    participantId: participantIdFromUrl,
    condition: conditionFromUrl,

    startedAt: new Date().toISOString(),
    startedAtMilliseconds: Date.now(),

    siteOrder: [...DEFAULT_SITE_ORDER],
    currentSiteIndex: 0,

    automationPreference: null,

    experimentCompleted: false
  };

  saveSession(newSession);

  /*
   * A new experiment session should begin with an empty event list.
   */
  sessionStorage.setItem(
    EVENT_STORAGE_KEY,
    JSON.stringify([])
  );

  return newSession;
}

/**
 * Return all locally recorded events.
 *
 * @returns {Array<object>}
 */
export function getEvents() {
  const rawEvents = sessionStorage.getItem(EVENT_STORAGE_KEY);

  if (!rawEvents) {
    return [];
  }

  try {
    const events = JSON.parse(rawEvents);

    return Array.isArray(events) ? events : [];
  } catch (error) {
    console.error("Stored event data are invalid:", error);
    return [];
  }
}

/**
 * Record a defined experimental event locally.
 *
 * This does not send anything to a server.
 *
 * @param {string} siteId
 * @param {string} eventType
 * @param {unknown} eventValue
 */
export function logEvent(
  siteId,
  eventType,
  eventValue = null
) {
  const session = getSession();

  if (!session) {
    console.error(
      "Cannot log an event because no experiment session exists."
    );
    return;
  }

  const events = getEvents();

  const event = {
    sequenceNumber: events.length + 1,

    participantId: session.participantId,
    condition: session.condition,

    siteId,
    eventType,
    eventValue,

    timestamp: new Date().toISOString(),

    experimentElapsedMilliseconds:
      Date.now() - session.startedAtMilliseconds
  };

  events.push(event);

  sessionStorage.setItem(
    EVENT_STORAGE_KEY,
    JSON.stringify(events)
  );

  /*
   * Useful during development. Remove or disable this before
   * production deployment if required.
   */
  console.log("Experiment event:", event);
}

/**
 * Save the cookie preference selected by participants in the
 * automation condition.
 *
 * @param {object} preference
 */
export function setAutomationPreference(preference) {
  const session = getSession();

  if (!session) {
    throw new Error(
      "No experiment session exists."
    );
  }

  session.automationPreference = preference;

  saveSession(session);

  logEvent(
    "experiment_start",
    "automation_preference_saved",
    preference
  );
}

/**
 * Begin the first mock website.
 */
export function beginExperiment() {
  const session = getSession();

  if (!session) {
    throw new Error(
      "No experiment session exists."
    );
  }

  logEvent(
    "experiment_start",
    "experiment_started",
    {
      siteOrder: session.siteOrder
    }
  );

  const firstSite = session.siteOrder[0];

  window.location.assign(`${firstSite}.html`);
}

/**
 * Clear all experiment data from the current browser tab.
 *
 * This is intended only for development and testing.
 */
export function resetExperiment() {
  sessionStorage.removeItem(SESSION_STORAGE_KEY);
  sessionStorage.removeItem(EVENT_STORAGE_KEY);
}