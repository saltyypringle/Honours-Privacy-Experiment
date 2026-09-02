"use strict";

import {
  getSession,
  logEvent
} from "./experiment-core.js";

const CONSENT_STORAGE_PREFIX = "privacyExperimentConsent:";
const BASELINE_SITES = new Set(["site1", "site2"]);

function getStudyContext(siteId, session) {
  const isBaseline = BASELINE_SITES.has(siteId);

  return {
    assignedCondition: session.condition,
    interfaceCondition: isBaseline ? "control" : session.condition,
    phase: isBaseline ? "baseline" : "experimental"
  };
}

function logInterfaceEvent(
  siteId,
  eventType,
  context,
  additionalValue = {}
) {
  logEvent(siteId, eventType, {
    assignedCondition: context.assignedCondition,
    interfaceCondition: context.interfaceCondition,
    phase: context.phase,
    ...additionalValue
  });
}

function notifyCookieInterfaceOpened(siteId) {
  document.dispatchEvent(
    new CustomEvent("privacyExperiment:cookieInterfaceOpened", {
      detail: { siteId }
    })
  );
}

function notifyCookieInterfaceClosed(siteId) {
  document.dispatchEvent(
    new CustomEvent("privacyExperiment:cookieInterfaceClosed", {
      detail: { siteId }
    })
  );
}

function getConsentStorageKey(siteId) {
  return `${CONSENT_STORAGE_PREFIX}${siteId}`;
}

function getCookieElements() {
  return {
    banner: document.getElementById("cookieBanner"),
    settingsPanel: document.getElementById("settingsPanel"),

    acceptButton:
      document.querySelector('[data-choice="accept_all"]'),

    rejectButton:
      document.querySelector('[data-choice="reject_optional"]'),

    customiseButton:
      document.querySelector('[data-choice="customise"]'),

    saveSettingsButton:
      document.querySelector('[data-choice="save_settings"]'),

    functionalCheckbox:
      document.getElementById("functionalCookies"),

    analyticsCheckbox:
      document.getElementById("analyticsCookies"),

    advertisingCheckbox:
      document.getElementById("advertisingCookies")
  };
}

function getExistingDecision(siteId) {
  const rawDecision = sessionStorage.getItem(
    getConsentStorageKey(siteId)
  );

  if (!rawDecision) {
    return null;
  }

  try {
    return JSON.parse(rawDecision);
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

function removePrivacySuggestion() {
  const suggestion =
    document.getElementById(
      "privacySuggestion"
    );

  if (!suggestion) {
    return;
  }

  /*
   * Clean up the ResizeObserver and resize listener
   * used to keep the card above the cookie footer.
   */
  if (
    typeof suggestion.__privacyCleanup ===
    "function"
  ) {
    suggestion.__privacyCleanup();
  }

  suggestion.remove();
}

function populateSettings(
  elements,
  settings
) {
  if (elements.functionalCheckbox) {
    elements.functionalCheckbox.checked =
      Boolean(settings.functional);
  }

  if (elements.analyticsCheckbox) {
    elements.analyticsCheckbox.checked =
      Boolean(settings.analytics);
  }

  if (elements.advertisingCheckbox) {
    elements.advertisingCheckbox.checked =
      Boolean(settings.advertising);
  }
}

function getChoiceLabel(choice) {
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

/* =========================================================
   AUTOMATION CONDITION
   ========================================================= */

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
      )} has been applied automatically on this website.
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
    ?.addEventListener(
      "click",
      function () {
        notice.remove();

        notifyCookieInterfaceOpened(
          siteId
        );

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

/* =========================================================
   SUGGESTIONS CONDITION
   ========================================================= */

function showPrivacySuggestion(
  siteId,
  banner,
  context
) {
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

  const suggestionTopic =
    siteId === "site4"
      ? "cookie_purposes"
      : "data_collection";

  /* =====================================================
     SITE 3 — DATA COLLECTION
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
          What can optional cookies learn about you?
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
     SITE 4 — COOKIE TYPES
     ===================================================== */

  else {
    suggestion.innerHTML = `
      <div
        class="experiment-privacy-snapshot__heading"
      >
        <strong>
          What do the different cookie types do?
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
   * Put the suggestion outside the cookie footer.
   * CSS positions it directly above the banner.
   */
  document.body.appendChild(
    suggestion
  );

  /*
   * Measure the cookie banner so the suggestion
   * always sits just above it.
   */
  function updateSuggestionPosition() {
    const bannerHeight =
      Math.ceil(
        banner
          .getBoundingClientRect()
          .height
      );

    suggestion.style.setProperty(
      "--cookie-banner-height",
      `${bannerHeight}px`
    );
  }

  updateSuggestionPosition();

  let bannerObserver =
    null;

  if (
    typeof ResizeObserver !==
    "undefined"
  ) {
    bannerObserver =
      new ResizeObserver(
        updateSuggestionPosition
      );

    bannerObserver.observe(
      banner
    );
  }

  window.addEventListener(
    "resize",
    updateSuggestionPosition
  );

  suggestion.__privacyCleanup =
    function () {
      bannerObserver
        ?.disconnect();

      window.removeEventListener(
        "resize",
        updateSuggestionPosition
      );
    };

  /*
   * Record that the privacy suggestion was displayed.
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
   * Expand / collapse the extra information.
   */
  detailsButton
    ?.addEventListener(
      "click",
      function () {
        const opening =
          details.hidden;

        details.hidden =
          !details.hidden;

        /*
         * CSS uses this class to make the card
         * wider on desktop rather than much taller.
         */
        suggestion
          .classList
          .toggle(
            "is-expanded",
            opening
          );

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
   * X button:
   * closes the privacy suggestion only.
   * The cookie banner remains visible.
   */
  dismissButton
    ?.addEventListener(
      "click",
      function () {
        removePrivacySuggestion();

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

  logInterfaceEvent(
    siteId,
    "interface_initialised",
    context
  );

  /* =======================================================
     COMPLETE COOKIE DECISION
     ======================================================= */

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
     * Close the cookie banner.
     */
    elements.banner
      .classList
      .add(
        "hidden"
      );

    /*
     * Close the custom settings panel.
     */
    elements
      .settingsPanel
      ?.classList
      .remove(
        "visible"
      );

    /*
     * Automatically close the Suggestions card
     * whenever a cookie decision is made.
     */
    removePrivacySuggestion();

    notifyCookieInterfaceClosed(
      siteId
    );

    /*
     * Detect whether an automation participant
     * manually changed the automatically applied choice.
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
     * If the participant manually changes an automated
     * choice, show the updated automation status.
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
     RESTORE EXISTING DECISION
     ======================================================= */

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
     AUTOMATION
     ======================================================= */

  if (
    context.interfaceCondition ===
    "automation"
  ) {
    const preference =
      session.automationPreference;

    /*
     * Fallback:
     * if no saved automation preference exists,
     * display the normal cookie footer.
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

  /* =======================================================
     CONTROL + SUGGESTIONS
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
   * Only suggestions participants on Sites 3–4
   * receive the separate privacy card.
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

export function resetCookiePreferences(
  siteId
) {
  sessionStorage.removeItem(
    getConsentStorageKey(
      siteId
    )
  );
}