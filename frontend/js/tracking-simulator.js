"use strict";

import {
  getSession,
  getEvents,
  logEvent
} from "./experiment-core.js";


const CONSENT_STORAGE_PREFIX =
  "privacyExperimentConsent:";


const OPTIONAL_COOKIE_CATEGORIES =
  new Set([
    "functional",
    "analytics",
    "advertising"
  ]);


/* =========================================================
   STORED COOKIE PREFERENCE
   ========================================================= */

function getStoredDecision(
  siteId
) {

  const raw =
    sessionStorage.getItem(
      `${CONSENT_STORAGE_PREFIX}${siteId}`
    );


  if (
    !raw
  ) {

    return null;

  }


  try {

    return JSON.parse(
      raw
    );

  }

  catch (
    error
  ) {

    console.warn(
      "Unable to read cookie preference for simulated tracking:",
      error
    );


    return null;

  }

}


/* =========================================================
   COOKIE-PREFERENCE SNAPSHOT
   ========================================================= */

function getPreferenceSnapshot(
  siteId,
  cookieCategory
) {

  const decision =
    getStoredDecision(
      siteId
    );


  const choice =
    decision?.choice ??
    null;


  /*
   * Some website activity does not depend on an
   * optional-cookie category.
   */
  if (
    !cookieCategory
  ) {

    return {

      choice,

      categoryAllowed:
        null,

      preferenceState:
        decision
          ? "not_applicable"
          : "no_cookie_decision"

    };

  }


  /*
   * Necessary cookies are always permitted.
   */
  if (
    cookieCategory ===
    "necessary"
  ) {

    return {

      choice,

      categoryAllowed:
        true,

      preferenceState:
        "allowed"

    };

  }


  if (
    !OPTIONAL_COOKIE_CATEGORIES
      .has(
        cookieCategory
      )
  ) {

    throw new Error(
      `Unknown cookie category: ${cookieCategory}`
    );

  }


  /*
   * No consent decision has been made yet.
   */
  if (
    !decision
  ) {

    return {

      choice:
        null,

      categoryAllowed:
        null,

      preferenceState:
        "no_cookie_decision"

    };

  }


  const allowed =
    Boolean(
      decision
        .settings?.[
          cookieCategory
        ]
    );


  return {

    choice,

    categoryAllowed:
      allowed,

    preferenceState:
      allowed
        ? "allowed"
        : "not_allowed"

  };

}


/* =========================================================
   DUPLICATE PROTECTION
   ========================================================= */

function getExistingTrackingActivity(
  siteId,
  trackingId
) {

  return (
    getEvents()
      .find(
        event => (

          event.siteId ===
            siteId &&

          event.eventType ===
            "simulated_tracking_activity" &&

          event.eventValue
            ?.trackingId ===
            trackingId

        )
      )
      ?.eventValue ??
    null
  );

}


/* =========================================================
   TRACKING CLASSIFICATION
   ========================================================= */

function classifyTracking({
  outcome,
  consentRelevant,
  preferenceState,
  disclosureStatus,
  purposeClass
}) {

  /*
   * Website recorded optional tracking despite the
   * participant having disabled that category.
   */
  const preferenceMismatch =

    consentRelevant ===
      true &&

    outcome ===
      "recorded" &&

    preferenceState ===
      "not_allowed";


  /*
   * Website recorded optional tracking before the
   * participant made any cookie decision.
   */
  const recordedBeforeChoice =

    consentRelevant ===
      true &&

    outcome ===
      "recorded" &&

    preferenceState ===
      "no_cookie_decision";


  /*
   * Website used information for a purpose that was not
   * explicitly described in the cookie information.
   */
  const disclosureMismatch =

    outcome ===
      "recorded" &&

    disclosureStatus ===
      "not_explicitly_disclosed";


  let behaviourClassification =
    "expected";


  if (
    preferenceMismatch
  ) {

    behaviourClassification =
      "preference_inconsistent";

  }

  else if (
    recordedBeforeChoice
  ) {

    behaviourClassification =
      "recorded_before_choice";

  }

  else if (
    disclosureMismatch
  ) {

    behaviourClassification =
      "not_explicitly_disclosed";

  }

  else if (
    purposeClass ===
    "service_function"
  ) {

    behaviourClassification =
      "service_related";

  }

  else if (
    outcome ===
    "blocked"
  ) {

    behaviourClassification =
      "blocked_by_preference";

  }


  return {

    preferenceMismatch,

    recordedBeforeChoice,

    disclosureMismatch,

    behaviourClassification

  };

}


/* =========================================================
   SIMULATE WEBSITE TRACKING
   ========================================================= */

/**
 * Creates one deterministic piece of mock website tracking.
 *
 * IMPORTANT:
 *
 * Callers must pass only predefined structural/mock values.
 * Never pass values typed by the participant.
 */
export function simulateTrackingActivity(
  siteId,
  config = {}
) {

  if (
    !getSession()
  ) {

    throw new Error(
      "No experiment session exists for simulated tracking."
    );

  }


  const {

    trackingId,

    trackerType,

    cookieCategory =
      null,

    dataCategory,

    dataLabel,

    purpose,

    purposeClass,

    disclosureStatus =
      "disclosed",

    consentRelevant =
      true,

    respectsPreference =
      true,

    privacyContext =
      "ordinary_browsing",

    metadata =
      {}

  } = config;


  if (
    !trackingId ||
    !trackerType ||
    !dataCategory ||
    !dataLabel ||
    !purpose ||
    !purposeClass
  ) {

    throw new Error(
      "Simulated tracking activity is missing required configuration."
    );

  }


  /*
   * Each named tracking event occurs once per website.
   *
   * This prevents refreshes or repeated clicks from
   * producing duplicate ground-truth events.
   */
  const existingActivity =
    getExistingTrackingActivity(
      siteId,
      trackingId
    );


  if (
    existingActivity
  ) {

    return existingActivity;

  }


  const preference =
    getPreferenceSnapshot(
      siteId,
      cookieCategory
    );


  let outcome;


  /*
   * Service activity, necessary activity, or intentionally
   * preference-inconsistent mock tracking is recorded.
   */
  if (

    consentRelevant ===
      false ||

    cookieCategory ===
      "necessary" ||

    respectsPreference ===
      false

  ) {

    outcome =
      "recorded";

  }

  else {

    /*
     * Ordinary optional tracking respects the participant's
     * cookie setting.
     */
    outcome =

      preference
        .categoryAllowed ===
        true

        ? "recorded"

        : "blocked";

  }


  const classification =
    classifyTracking({

      outcome,

      consentRelevant,

      preferenceState:
        preference
          .preferenceState,

      disclosureStatus,

      purposeClass

    });


  const eventValue = {

    trackingId,

    trackerType,

    cookieCategory,

    dataCategory,

    dataLabel,

    purpose,

    purposeClass,

    privacyContext,

    disclosureStatus,

    consentRelevant,

    respectsPreference,

    outcome,

    preferenceChoice:
      preference.choice,

    preferenceState:
      preference
        .preferenceState,

    categoryAllowed:
      preference
        .categoryAllowed,

    ...classification,

    metadata

  };


  /*
   * This is the experiment's objective ground truth.
   */
  logEvent(
    siteId,
    "simulated_tracking_activity",
    eventValue
  );


  /*
   * Other interface components can optionally listen
   * for the tracking event.
   */
  document.dispatchEvent(

    new CustomEvent(

      "privacyExperiment:simulatedTrackingActivity",

      {

        detail: {

          siteId,

          ...eventValue

        }

      }

    )

  );


  return eventValue;

}