"use strict";

import {
  getSession,
  logEvent
} from "./experiment-core.js";


/* =========================================================
   STORAGE
   ========================================================= */

const CONSENT_STORAGE_PREFIX =
  "privacyExperimentConsent:";


/*
 * Sites 1 and 2 are the shared baseline.
 *
 * Sites 3 and 4 are the experimental phase.
 */
const BASELINE_SITES =
  new Set([
    "site1",
    "site2"
  ]);


/* =========================================================
   STUDY CONTEXT
   ========================================================= */

/**
 * Work out which experimental interface should actually
 * be shown on the current website.
 *
 * Sites 1–2:
 *   interfaceCondition = control
 *
 * Sites 3–4:
 *   interfaceCondition = assigned condition
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
    BASELINE_SITES.has(
      siteId
    );


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


/* =========================================================
   EVENT LOGGING
   ========================================================= */

/**
 * Record an interface event with the condition actually
 * displayed on the current site.
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


/* =========================================================
   TASK / COOKIE INTERFACE COORDINATION
   ========================================================= */

/**
 * Tell the task controller that the cookie interface
 * has opened.
 *
 * On narrower displays the task controller can use this
 * event to collapse the task card and prevent overlap.
 *
 * @param {string} siteId
 */
function notifyCookieInterfaceOpened(
  siteId
) {

  document.dispatchEvent(
    new CustomEvent(
      "privacyExperiment:cookieInterfaceOpened",
      {
        detail: {
          siteId
        }
      }
    )
  );

}


/**
 * Tell the task controller that the cookie interface
 * has finished.
 *
 * On narrower displays the task controller can then
 * expand the task again.
 *
 * @param {string} siteId
 */
function notifyCookieInterfaceClosed(
  siteId
) {

  document.dispatchEvent(
    new CustomEvent(
      "privacyExperiment:cookieInterfaceClosed",
      {
        detail: {
          siteId
        }
      }
    )
  );

}


/* =========================================================
   COOKIE STORAGE
   ========================================================= */

/**
 * Return the sessionStorage key for one website.
 *
 * @param {string} siteId
 * @returns {string}
 */
function getConsentStorageKey(
  siteId
) {

  return (
    `${CONSENT_STORAGE_PREFIX}${siteId}`
  );

}


/**
 * Retrieve the cookie-interface elements from the page.
 *
 * @returns {object}
 */
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
      getConsentStorageKey(
        siteId
      )
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
      getConsentStorageKey(
        siteId
      )
    );


    return null;

  }

}


/**
 * Save the participant's cookie decision.
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
    getConsentStorageKey(
      siteId
    ),
    JSON.stringify(
      decision
    )
  );


  return decision;

}


/* =========================================================
   PRIVACY SUGGESTION HELPERS
   ========================================================= */

/**
 * Remove the suggestions-condition privacy aid.
 */
function removePrivacySuggestion() {

  document
    .getElementById(
      "privacySuggestion"
    )
    ?.remove();

}


/* =========================================================
   COOKIE SETTINGS HELPERS
   ========================================================= */

/**
 * Populate the custom cookie checkboxes from a saved
 * decision.
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
 * Convert a stored cookie preference into a readable label.
 *
 * @param {string} choice
 * @returns {string}
 */
function getChoiceLabel(
  choice
) {

  switch (choice) {

    case "accept_all":

      return (
        "Accept all cookies"
      );


    case "reject_optional":

      return (
        "Reject optional cookies"
      );


    case "custom":

      return (
        "Use custom cookie settings"
      );


    default:

      return (
        "Cookie preference applied"
      );

  }

}


/* =========================================================
   AUTOMATION CONDITION
   ========================================================= */

/**
 * Display the small automation status notice.
 *
 * The accompanying CSS positions this away from the
 * website task so that the two components do not overlap.
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

  /*
   * Only one automation notice should exist.
   */
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

      ${getChoiceLabel(
        decision.choice
      )}

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


  const reviewButton =
    document.getElementById(
      "reviewAutomatedChoice"
    );


  reviewButton
    ?.addEventListener(
      "click",
      function () {

        /*
         * Remove the small automation status card while
         * the full cookie interface is being reviewed.
         */
        notice.remove();


        /*
         * Tell the task controller that another interface
         * is about to occupy screen space.
         */
        notifyCookieInterfaceOpened(
          siteId
        );


        /*
         * Reopen the full cookie banner.
         */
        elements.banner
          .classList
          .remove(
            "hidden"
          );


        /*
         * Restore the automated choices into the
         * customisation controls.
         */
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


/* =========================================================
   SUGGESTIONS CONDITION
   ========================================================= */

/**
 * Display the suggestions-condition privacy learning aid.
 *
 * Site 3:
 *   focuses on information that optional tracking may
 *   collect or infer.
 *
 * Site 4:
 *   focuses on what the main cookie categories do.
 *
 * This gives participants two short but complementary
 * pieces of privacy information.
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

  /*
   * Remove any stale suggestion before creating another.
   */
  removePrivacySuggestion();


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
    "Privacy tip"
  );


  /*
   * Site 3 teaches data collection/inference.
   * Site 4 teaches cookie purposes.
   */
  const suggestionTopic =
    siteId === "site4"
      ? "cookie_purposes"
      : "data_collection";


  /* =====================================================
     SITE 3:
     WHAT CAN OPTIONAL TRACKING LEARN?
     ===================================================== */

  if (
    suggestionTopic ===
    "data_collection"
  ) {

    suggestion.innerHTML = `

      <div
        class="experiment-privacy-snapshot__heading"
      >

        <strong>

          Privacy tip: What might optional tracking learn about you?

        </strong>


        <button
          type="button"
          id="dismissPrivacySuggestion"
          aria-label="Dismiss privacy tip"
        >

          ×

        </button>

      </div>


      <p
        class="experiment-privacy-summary"
      >

        Optional cookies and related tracking can help
        a site understand your

        <strong>
          browsing activity
        </strong>,

        <strong>
          device information
        </strong>,

        <strong>
          approximate location
        </strong>

        and

        <strong>
          interests inferred from browsing
        </strong>.

      </p>


      <button
        type="button"
        id="showPrivacyDetails"
        class="experiment-privacy-details-toggle"
        aria-expanded="false"
      >

        Learn what this means

      </button>


      <div
        id="privacySuggestionDetails"
        class="experiment-privacy-details"
        hidden
      >

        <div
          class="experiment-privacy-learning-grid"
        >


          <div
            class="experiment-privacy-learning-item"
          >

            <strong>
              Browsing activity
            </strong>

            <span>

              Pages viewed, clicks and time spent
              on parts of a website.

            </span>

          </div>


          <div
            class="experiment-privacy-learning-item"
          >

            <strong>
              Device information
            </strong>

            <span>

              Information such as browser,
              operating system and device type.

            </span>

          </div>


          <div
            class="experiment-privacy-learning-item"
          >

            <strong>
              Approximate location
            </strong>

            <span>

              A general location such as country,
              region or approximate city.

            </span>

          </div>


          <div
            class="experiment-privacy-learning-item"
          >

            <strong>
              Inferred interests
            </strong>

            <span>

              Topics or products associated with
              patterns in browsing activity.

            </span>

          </div>


        </div>


        <p
          class="experiment-privacy-note"
        >

          Optional tracking generally observes
          information about your visit and device;
          it does not provide general access to
          the contents of your computer.

        </p>

      </div>

    `;

  }


  /* =====================================================
     SITE 4:
     WHAT DO THE COOKIE TYPES DO?
     ===================================================== */

  else {

    suggestion.innerHTML = `

      <div
        class="experiment-privacy-snapshot__heading"
      >

        <strong>

          Privacy tip: What do the cookie types do?

        </strong>


        <button
          type="button"
          id="dismissPrivacySuggestion"
          aria-label="Dismiss privacy tip"
        >

          ×

        </button>

      </div>


      <p
        class="experiment-privacy-summary"
      >

        <strong>
          Functional
        </strong>

        cookies remember choices such as
        language or display preferences.


        <strong>
          Analytics
        </strong>

        cookies help measure how a site is used,
        while

        <strong>
          advertising
        </strong>

        cookies can support personalised ads
        and interest-based content.

      </p>


      <button
        type="button"
        id="showPrivacyDetails"
        class="experiment-privacy-details-toggle"
        aria-expanded="false"
      >

        Compare cookie types

      </button>


      <div
        id="privacySuggestionDetails"
        class="experiment-privacy-details"
        hidden
      >

        <div
          class="experiment-privacy-learning-grid"
        >


          <div
            class="experiment-privacy-learning-item"
          >

            <strong>
              Necessary / essential
            </strong>

            <span>

              Support core website functions and
              are generally required for the site
              to work properly.

            </span>

          </div>


          <div
            class="experiment-privacy-learning-item"
          >

            <strong>
              Functional
            </strong>

            <span>

              Remember choices you make, such as
              language, region or display preferences.

            </span>

          </div>


          <div
            class="experiment-privacy-learning-item"
          >

            <strong>
              Analytics
            </strong>

            <span>

              Help understand how people use the
              site, such as pages viewed, clicks,
              device information and time spent.

            </span>

          </div>


          <div
            class="experiment-privacy-learning-item"
          >

            <strong>
              Advertising
            </strong>

            <span>

              Can support personalised advertising
              and the inference of interests from
              browsing activity.

            </span>

          </div>


        </div>


        <p
          class="experiment-privacy-note"
        >

          These descriptions can help you decide
          which optional cookie categories match
          your preferences.

        </p>

      </div>

    `;

  }


  /*
   * Keep the suggestion inside the cookie banner.
   *
   * It therefore behaves as part of the privacy
   * interface instead of becoming another floating
   * overlay on the page.
   */
  banner.prepend(
    suggestion
  );


  /*
   * Record which treatment content was shown.
   */
  logInterfaceEvent(
    siteId,
    "privacy_suggestion_shown",
    context,
    {

      suggestionTopic

    }
  );


  const details =
    document.getElementById(
      "privacySuggestionDetails"
    );


  const detailsButton =
    document.getElementById(
      "showPrivacyDetails"
    );


  const dismissButton =
    document.getElementById(
      "dismissPrivacySuggestion"
    );


  const collapsedButtonText =
    suggestionTopic ===
      "cookie_purposes"
      ? "Compare cookie types"
      : "Learn what this means";


  /*
   * Expand / collapse the explanation.
   */
  detailsButton
    ?.addEventListener(
      "click",
      function () {

        const opening =
          details.hidden;


        details.hidden =
          !details.hidden;


        detailsButton.textContent =
          details.hidden
            ? collapsedButtonText
            : "Show less";


        detailsButton.setAttribute(
          "aria-expanded",
          details.hidden
            ? "false"
            : "true"
        );


        logInterfaceEvent(
          siteId,

          opening
            ? "privacy_suggestion_opened"
            : "privacy_suggestion_closed",

          context,

          {

            suggestionTopic

          }
        );

      }
    );


  /*
   * Allow the participant to dismiss the suggestion
   * without making a cookie choice.
   */
  dismissButton
    ?.addEventListener(
      "click",
      function () {

        suggestion.remove();


        logInterfaceEvent(
          siteId,
          "privacy_suggestion_dismissed",
          context,
          {

            suggestionTopic

          }
        );

      }
    );

}


/* =========================================================
   MAIN COOKIE INTERFACE
   ========================================================= */

/**
 * Initialise the cookie interface for one mock website.
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
   * Determine which condition should actually appear.
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
   * Record which experimental interface is being shown.
   */
  logInterfaceEvent(
    siteId,
    "interface_initialised",
    context
  );


  /* =======================================================
     COMPLETE COOKIE DECISION
     ======================================================= */

  /**
   * Complete and record a cookie decision.
   *
   * @param {string} choice
   * @param {object} settings
   * @param {string} source
   * @returns {object}
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


    /*
     * Hide the full cookie banner.
     */
    elements.banner
      .classList
      .add(
        "hidden"
      );


    /*
     * Close custom settings.
     */
    elements
      .settingsPanel
      ?.classList
      .remove(
        "visible"
      );


    /*
     * Remove any suggestion contained in the banner.
     */
    removePrivacySuggestion();


    /*
     * Tell the task controller that the cookie layer
     * has finished.
     *
     * This allows the task to automatically expand
     * again on split-screen/mobile layouts.
     */
    notifyCookieInterfaceClosed(
      siteId
    );


    /*
     * A manual decision counts as an automation override
     * when an automated decision previously existed.
     */
    const automationOverride =
      context.interfaceCondition ===
        "automation" &&

      source ===
        "manual" &&

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
     * applied setting, display the updated automation
     * status.
     */
    if (
      context.interfaceCondition ===
        "automation" &&

      source ===
        "manual"
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


  /* =======================================================
     ACCEPT ALL
     ======================================================= */

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


  /* =======================================================
     REJECT OPTIONAL
     ======================================================= */

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


  /* =======================================================
     CUSTOMISE
     ======================================================= */

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


  /* =======================================================
     SAVE CUSTOM SETTINGS
     ======================================================= */

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


  /* =======================================================
     RESTORE AN EXISTING DECISION
     ======================================================= */

  const existingDecision =
    getExistingDecision(
      siteId
    );


  if (existingDecision) {

    /*
     * The participant has already made a decision
     * on this particular site.
     */
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
     * Restore the automation status card only when the
     * current site is actually in automation mode.
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


  /* =======================================================
     AUTOMATION CONDITION
     =======================================================
     Only Sites 3–4 can reach this branch.
     ======================================================= */

  if (
    context.interfaceCondition ===
    "automation"
  ) {

    const preference =
      session.automationPreference;


    /*
     * If something went wrong and no automated
     * preference exists, show the standard cookie
     * banner rather than silently choosing.
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


    /*
     * Apply the saved preference automatically.
     *
     * completeDecision() hides the ordinary banner.
     */
    const decision =
      completeDecision(
        preference.choice,
        settings,
        "automation"
      );


    /*
     * Show only the compact automation status notice.
     */
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


  /* =======================================================
     CONTROL + SUGGESTIONS
     =======================================================
     Both use the ordinary cookie banner.
     Suggestions additionally receive the educational
     component inside that same banner.
     ======================================================= */

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


  /*
   * Suggestions are only shown during the treatment
   * phase to participants assigned to that condition.
   */
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


/* =========================================================
   DEVELOPMENT / TESTING
   ========================================================= */

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
    getConsentStorageKey(
      siteId
    )
  );

}