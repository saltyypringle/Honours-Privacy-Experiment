"use strict";

import {
  getSession,
  logEvent
} from "./experiment-core.js";


const CONSENT_STORAGE_PREFIX =
  "privacyExperimentConsent:";


/*
 * Sites 1 and 2 are the common baseline.
 *
 * Sites 3 and 4 are the experimental phase.
 */
const BASELINE_SITES = new Set([
  "site1",
  "site2"
]);


/**
 * Determine the experimental context for a site.
 *
 * The participant's assigned condition never changes.
 *
 * However:
 *
 * Sites 1–2:
 *   interfaceCondition = control
 *   phase = baseline
 *
 * Sites 3–4:
 *   interfaceCondition = assigned condition
 *   phase = experimental
 *
 * @param {string} siteId
 * @param {object} session
 * @returns {object}
 */
function getStudyContext(
  siteId,
  session
) {

  const isBaseline =
    BASELINE_SITES.has(siteId);


  return {

    assignedCondition:
      session.condition,


    interfaceCondition:
      isBaseline
        ? "control"
        : session.condition,


    phase:
      isBaseline
        ? "baseline"
        : "experimental"

  };

}


/**
 * Log an event together with the experimental
 * condition actually shown on the current site.
 *
 * @param {string} siteId
 * @param {string} eventType
 * @param {object} context
 * @param {object} additionalValue
 */
function logInterfaceEvent(
  siteId,
  eventType,
  context,
  additionalValue = {}
) {

  logEvent(
    siteId,
    eventType,
    {
      assignedCondition:
        context.assignedCondition,

      interfaceCondition:
        context.interfaceCondition,

      phase:
        context.phase,

      ...additionalValue
    }
  );

}


function getConsentStorageKey(
  siteId
) {

  return (
    `${CONSENT_STORAGE_PREFIX}${siteId}`
  );

}


function getCookieElements() {

  return {

    banner:
      document.getElementById(
        "cookieBanner"
      ),


    settingsPanel:
      document.getElementById(
        "settingsPanel"
      ),


    acceptButton:
      document.querySelector(
        '[data-choice="accept_all"]'
      ),


    rejectButton:
      document.querySelector(
        '[data-choice="reject_optional"]'
      ),


    customiseButton:
      document.querySelector(
        '[data-choice="customise"]'
      ),


    saveSettingsButton:
      document.querySelector(
        '[data-choice="save_settings"]'
      ),


    functionalCheckbox:
      document.getElementById(
        "functionalCookies"
      ),


    analyticsCheckbox:
      document.getElementById(
        "analyticsCookies"
      ),


    advertisingCheckbox:
      document.getElementById(
        "advertisingCookies"
      )

  };

}


/**
 * Retrieve an existing cookie decision for one site.
 *
 * @param {string} siteId
 * @returns {object|null}
 */
function getExistingDecision(
  siteId
) {

  const rawDecision =
    sessionStorage.getItem(
      getConsentStorageKey(siteId)
    );


  if (!rawDecision) {
    return null;
  }


  try {

    return JSON.parse(
      rawDecision
    );

  } catch (error) {

    console.error(
      "Stored cookie decision is invalid:",
      error
    );


    sessionStorage.removeItem(
      getConsentStorageKey(siteId)
    );


    return null;

  }

}


/**
 * Store the cookie decision for a site.
 *
 * @param {string} siteId
 * @param {string} choice
 * @param {object} settings
 * @param {string} source
 * @param {object} context
 * @returns {object}
 */
function saveDecision(
  siteId,
  choice,
  settings,
  source,
  context
) {

  const decision = {

    choice,

    settings,

    source,


    assignedCondition:
      context.assignedCondition,


    interfaceCondition:
      context.interfaceCondition,


    phase:
      context.phase,


    savedAt:
      new Date().toISOString()

  };


  sessionStorage.setItem(
    getConsentStorageKey(siteId),
    JSON.stringify(decision)
  );


  return decision;

}


/**
 * Remove the contextual privacy suggestion.
 */
function removePrivacySuggestion() {

  document
    .getElementById(
      "privacySuggestion"
    )
    ?.remove();

}


/**
 * Populate the custom cookie controls.
 *
 * @param {object} elements
 * @param {object} settings
 */
function populateSettings(
  elements,
  settings
) {

  if (
    elements.functionalCheckbox
  ) {

    elements
      .functionalCheckbox
      .checked =
        Boolean(
          settings.functional
        );

  }


  if (
    elements.analyticsCheckbox
  ) {

    elements
      .analyticsCheckbox
      .checked =
        Boolean(
          settings.analytics
        );

  }


  if (
    elements.advertisingCheckbox
  ) {

    elements
      .advertisingCheckbox
      .checked =
        Boolean(
          settings.advertising
        );

  }

}


/**
 * Human-readable label for an automated choice.
 *
 * @param {string} choice
 * @returns {string}
 */
function getChoiceLabel(
  choice
) {

  switch (choice) {

    case "accept_all":

      return "Accept all cookies";


    case "reject_optional":

      return "Reject optional cookies";


    case "custom":

      return "Use custom cookie settings";


    default:

      return "Cookie preference applied";

  }

}


/**
 * Display the automation notice.
 *
 * @param {string} siteId
 * @param {object} elements
 * @param {object} decision
 * @param {object} context
 * @param {boolean} updated
 */
function showAutomationNotice(
  siteId,
  elements,
  decision,
  context,
  updated = false
) {

  document
    .getElementById(
      "automationNotice"
    )
    ?.remove();


  const notice =
    document.createElement(
      "aside"
    );


  notice.id =
    "automationNotice";


  notice.className =
    "experiment-automation-notice";


  notice.setAttribute(
    "aria-label",
    "Automated cookie preference"
  );


  notice.innerHTML = `
    <strong>
      ${
        updated
          ? "Cookie preference updated"
          : "Saved preference applied"
      }
    </strong>

    <p>
      ${getChoiceLabel(decision.choice)}
    </p>

    <button
      type="button"
      id="reviewAutomatedChoice"
    >
      Review or change
    </button>
  `;


  document.body.appendChild(
    notice
  );


  document
    .getElementById(
      "reviewAutomatedChoice"
    )
    .addEventListener(
      "click",
      function () {

        notice.remove();


        elements.banner
          .classList
          .remove(
            "hidden"
          );


        populateSettings(
          elements,
          decision.settings
        );


        elements
          .settingsPanel
          ?.classList
          .add(
            "visible"
          );


        logInterfaceEvent(
          siteId,
          "automation_choice_reviewed",
          context,
          {
            existingChoice:
              decision.choice
          }
        );

      }
    );

}


/**
 * Display the contextual privacy suggestion.
 *
 * This function should only be called when the site's
 * interfaceCondition is "suggestions".
 *
 * @param {string} siteId
 * @param {HTMLElement} banner
 * @param {object} context
 */
function showPrivacySuggestion(
  siteId,
  banner,
  context
) {

  const suggestion =
    document.createElement(
      "aside"
    );


  suggestion.id =
    "privacySuggestion";


  suggestion.className =
    "experiment-privacy-snapshot";


  suggestion.setAttribute(
    "aria-label",
    "Privacy information"
  );


  suggestion.innerHTML = `
    <div class="experiment-privacy-snapshot__heading">

      <strong>
        🔒 What could this site learn about you?
      </strong>

      <button
        type="button"
        id="dismissPrivacySuggestion"
        aria-label="Dismiss privacy information"
      >
        ×
      </button>

    </div>

    <p>
      Your device, browsing activity, approximate
      location and interests.
    </p>

    <button
      type="button"
      id="showPrivacyDetails"
    >
      Show me
    </button>

    <div
      id="privacySuggestionDetails"
      class="experiment-privacy-details"
      hidden
    >

      <p>
        <strong>
          Device information:
        </strong>

        browser, operating system and device type
      </p>

      <p>
        <strong>
          Browsing activity:
        </strong>

        pages viewed, clicks and time spent
      </p>

      <p>
        <strong>
          Approximate location:
        </strong>

        country, region or approximate city
      </p>

      <p>
        <strong>
          Inferred interests:
        </strong>

        topics or products associated with browsing activity
      </p>

    </div>
  `;


  banner.prepend(
    suggestion
  );


  logInterfaceEvent(
    siteId,
    "privacy_suggestion_shown",
    context
  );


  const details =
    document.getElementById(
      "privacySuggestionDetails"
    );


  const detailsButton =
    document.getElementById(
      "showPrivacyDetails"
    );


  detailsButton.addEventListener(
    "click",
    function () {

      const opening =
        details.hidden;


      details.hidden =
        !details.hidden;


      detailsButton.textContent =
        details.hidden
          ? "Show me"
          : "Show less";


      logInterfaceEvent(
        siteId,

        opening
          ? "privacy_suggestion_opened"
          : "privacy_suggestion_closed",

        context
      );

    }
  );


  document
    .getElementById(
      "dismissPrivacySuggestion"
    )
    .addEventListener(
      "click",
      function () {

        suggestion.remove();


        logInterfaceEvent(
          siteId,
          "privacy_suggestion_dismissed",
          context
        );

      }
    );

}


/**
 * Initialise the cookie interface for a mock website.
 *
 * @param {string} siteId
 */
export function initialiseCookieInterface(
  siteId
) {

  const session =
    getSession();


  if (!session) {

    throw new Error(
      "No experiment session was found."
    );

  }


  /*
   * Work out which interface should ACTUALLY be shown.
   */
  const context =
    getStudyContext(
      siteId,
      session
    );


  const elements =
    getCookieElements();


  if (!elements.banner) {

    throw new Error(
      "The cookie banner could not be found."
    );

  }


  /*
   * Record which condition is being displayed on this site.
   *
   * This is important because assignedCondition and
   * interfaceCondition are deliberately different during
   * the baseline phase for automation and suggestions
   * participants.
   */
  logInterfaceEvent(
    siteId,
    "interface_initialised",
    context
  );


  /**
   * Complete and record a cookie decision.
   */
  function completeDecision(
    choice,
    settings,
    source
  ) {

    const existingDecision =
      getExistingDecision(
        siteId
      );


    const decision =
      saveDecision(
        siteId,
        choice,
        settings,
        source,
        context
      );


    elements.banner
      .classList
      .add(
        "hidden"
      );


    elements
      .settingsPanel
      ?.classList
      .remove(
        "visible"
      );


    removePrivacySuggestion();


    /*
     * A manual decision counts as an automation override
     * only when this site is actually displaying the
     * automation interface.
     */
    const automationOverride =
      context.interfaceCondition ===
        "automation" &&
      source === "manual" &&
      existingDecision?.source ===
        "automation";


    logInterfaceEvent(
      siteId,
      "cookie_choice",
      context,
      {

        choice,

        settings,

        source,

        automationOverride

      }
    );


    /*
     * If an automation participant manually changes the
     * automated decision, show the updated notice.
     */
    if (
      context.interfaceCondition ===
        "automation" &&
      source === "manual"
    ) {

      showAutomationNotice(
        siteId,
        elements,
        decision,
        context,
        true
      );

    }


    return decision;

  }


  /*
   * ACCEPT ALL
   */
  elements
    .acceptButton
    ?.addEventListener(
      "click",
      function () {

        completeDecision(
          "accept_all",
          {

            necessary:
              true,

            functional:
              true,

            analytics:
              true,

            advertising:
              true

          },
          "manual"
        );

      }
    );


  /*
   * REJECT OPTIONAL
   */
  elements
    .rejectButton
    ?.addEventListener(
      "click",
      function () {

        completeDecision(
          "reject_optional",
          {

            necessary:
              true,

            functional:
              false,

            analytics:
              false,

            advertising:
              false

          },
          "manual"
        );

      }
    );


  /*
   * OPEN CUSTOM SETTINGS
   */
  elements
    .customiseButton
    ?.addEventListener(
      "click",
      function () {

        elements
          .settingsPanel
          ?.classList
          .toggle(
            "visible"
          );


        logInterfaceEvent(
          siteId,
          "cookie_settings_opened",
          context
        );

      }
    );


  /*
   * SAVE CUSTOM SETTINGS
   */
  elements
    .saveSettingsButton
    ?.addEventListener(
      "click",
      function () {

        completeDecision(
          "custom",
          {

            necessary:
              true,


            functional:
              elements
                .functionalCheckbox
                ?.checked ??
              false,


            analytics:
              elements
                .analyticsCheckbox
                ?.checked ??
              false,


            advertising:
              elements
                .advertisingCheckbox
                ?.checked ??
              false

          },
          "manual"
        );

      }
    );


  /*
   * Restore an existing decision if the participant
   * refreshed this particular site.
   */
  const existingDecision =
    getExistingDecision(
      siteId
    );


  if (existingDecision) {

    elements.banner
      .classList
      .add(
        "hidden"
      );


    logInterfaceEvent(
      siteId,
      "cookie_choice_restored",
      context,
      {

        choice:
          existingDecision.choice,

        source:
          existingDecision.source

      }
    );


    /*
     * Only show an automation notice if THIS site is
     * actually in the automation condition.
     */
    if (
      context.interfaceCondition ===
      "automation"
    ) {

      showAutomationNotice(
        siteId,
        elements,
        existingDecision,
        context
      );

    }


    return;

  }


  /*
   * =====================================================
   * AUTOMATION CONDITION
   * =====================================================
   *
   * This is only possible during Sites 3–4.
   */
  if (
    context.interfaceCondition ===
    "automation"
  ) {

    const preference =
      session.automationPreference;


    /*
     * The automation preference should normally have been
     * collected on the transition page after Site 2.
     *
     * If it is missing, fall back to the normal cookie
     * banner rather than silently making a choice.
     */
    if (!preference) {

      elements.banner
        .classList
        .remove(
          "hidden"
        );


      logInterfaceEvent(
        siteId,
        "automation_preference_missing",
        context
      );


      return;

    }


    const settings = {

      necessary:
        true,


      functional:
        Boolean(
          preference.functional
        ),


      analytics:
        Boolean(
          preference.analytics
        ),


      advertising:
        Boolean(
          preference.advertising
        )

    };


    const decision =
      completeDecision(
        preference.choice,
        settings,
        "automation"
      );


    showAutomationNotice(
      siteId,
      elements,
      decision,
      context
    );


    logInterfaceEvent(
      siteId,
      "automation_preference_applied",
      context,
      {

        choice:
          decision.choice,

        settings:
          decision.settings

      }
    );


    return;

  }


  /*
   * =====================================================
   * CONTROL + SUGGESTIONS
   * =====================================================
   *
   * Both use the ordinary cookie banner.
   *
   * Suggestions additionally receive the privacy
   * information component.
   */
  elements.banner
    .classList
    .remove(
      "hidden"
    );


  logInterfaceEvent(
    siteId,
    "cookie_banner_shown",
    context
  );


  if (
    context.interfaceCondition ===
    "suggestions"
  ) {

    showPrivacySuggestion(
      siteId,
      elements.banner,
      context
    );

  }

}


/**
 * Clear one site's locally stored cookie decision.
 *
 * Development/testing utility only.
 *
 * @param {string} siteId
 */
export function resetCookiePreferences(
  siteId
) {

  sessionStorage.removeItem(
    getConsentStorageKey(siteId)
  );

}