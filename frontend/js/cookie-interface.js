"use strict";

import {
  getSession,
  logEvent
} from "./experiment-core.js";


const CONSENT_STORAGE_PREFIX =
  "privacyExperimentConsent:";


/*
 * Sites 1 and 2 are the common baseline.
 * Sites 3 and 4 are the experimental phase.
 */
const BASELINE_SITES = new Set([
  "site1",
  "site2"
]);


/**
 * Determine the experimental context for a site.
 *
 * Sites 1–2 always show the control interface.
 * Sites 3–4 show the participant's assigned condition.
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
 * Record an interface event together with the condition
 * actually displayed on the current website.
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


/**
 * Build the sessionStorage key used for one site's
 * cookie decision.
 */
function getConsentStorageKey(
  siteId
) {

  return (
    `${CONSENT_STORAGE_PREFIX}${siteId}`
  );

}


/**
 * Retrieve the shared cookie-interface elements
 * from the current mock website.
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
 * Store one site's cookie decision.
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


/**
 * Remove a suggestions-condition privacy tip.
 */
function removePrivacySuggestion() {

  document
    .getElementById(
      "privacySuggestion"
    )
    ?.remove();

}


/**
 * Populate custom cookie controls with an
 * existing cookie decision.
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
 * Convert an automated cookie decision into
 * a participant-friendly label.
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


/**
 * Display the notice used by the automation condition.
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
 * Display the suggestions-condition privacy learning aid.
 *
 * Site 3 focuses on:
 *   - browsing activity
 *   - device information
 *   - approximate location
 *   - inferred interests
 *
 * Site 4 focuses on:
 *   - necessary / essential cookies
 *   - functional cookies
 *   - analytics cookies
 *   - advertising cookies
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


  /*
   * Each treatment website emphasises a different
   * privacy concept.
   */
  const suggestionTopic =
    siteId === "site4"
      ? "cookie_purposes"
      : "data_collection";


  suggestion.setAttribute(
    "aria-label",
    "Privacy tip"
  );


  /*
   * =====================================================
   * SITE 3
   *
   * DATA COLLECTION / INFERENCE
   * =====================================================
   */
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

        Optional cookies and related tracking can help a site
        understand your

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
          it does not provide general access to the
          contents of your computer.

        </p>

      </div>

    `;

  }


  /*
   * =====================================================
   * SITE 4
   *
   * COOKIE PURPOSES
   * =====================================================
   */
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


  banner.prepend(
    suggestion
  );


  /*
   * Record which educational suggestion was shown.
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


  const collapsedButtonText =
    suggestionTopic ===
      "cookie_purposes"
      ? "Compare cookie types"
      : "Learn what this means";


  /*
   * Expand / collapse the educational detail.
   */
  detailsButton.addEventListener(
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
   * Allow the privacy tip to be dismissed.
   */
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
          context,
          {

            suggestionTopic

          }
        );

      }
    );

}


/**
 * Initialise the correct cookie interface for
 * the current mock website.
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
   * Record the condition actually shown on this site.
   */
  logInterfaceEvent(
    siteId,
    "interface_initialised",
    context
  );


  /**
   * Complete and record one cookie decision.
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
     * A manual choice counts as an automation
     * override when an automated decision already
     * existed on this site.
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
     * If the participant manually changes an
     * automated decision, show the revised status.
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


  /*
   * =====================================================
   * ACCEPT ALL
   * =====================================================
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
   * =====================================================
   * REJECT OPTIONAL
   * =====================================================
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
   * =====================================================
   * OPEN CUSTOM SETTINGS
   * =====================================================
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
   * =====================================================
   * SAVE CUSTOM SETTINGS
   * =====================================================
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
   * =====================================================
   * RESTORE EXISTING DECISION
   * =====================================================
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
     * Automation participants receive their
     * automation status again after refresh.
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
   * Only possible on Sites 3 and 4.
   */
  if (
    context.interfaceCondition ===
    "automation"
  ) {

    const preference =
      session.automationPreference;


    /*
     * If no general preference exists, fall back
     * to the ordinary cookie banner.
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
   * Both conditions use the normal cookie banner.
   * Suggestions additionally receive the privacy
   * learning aid.
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
 * Clear one site's cookie decision.
 *
 * Development/testing utility only.
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