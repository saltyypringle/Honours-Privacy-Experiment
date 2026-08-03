"use strict";

import {
  getSession,
  logEvent
} from "./experiment-core.js";

const CONSENT_STORAGE_PREFIX =
  "privacyExperimentConsent:";

function getConsentStorageKey(siteId) {
  return `${CONSENT_STORAGE_PREFIX}${siteId}`;
}

function getCookieElements() {
  return {
    banner:
      document.getElementById("cookieBanner"),

    settingsPanel:
      document.getElementById("settingsPanel"),

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
  source
) {
  const decision = {
    choice,
    settings,
    source,
    savedAt: new Date().toISOString()
  };

  sessionStorage.setItem(
    getConsentStorageKey(siteId),
    JSON.stringify(decision)
  );

  return decision;
}

function removePrivacySuggestion() {
  document
    .getElementById("privacySuggestion")
    ?.remove();
}

function populateSettings(elements, settings) {
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

function showAutomationNotice(
  siteId,
  elements,
  decision,
  updated = false
) {
  document
    .getElementById("automationNotice")
    ?.remove();

  const notice = document.createElement("aside");

  notice.id = "automationNotice";
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

  document.body.appendChild(notice);

  document
    .getElementById("reviewAutomatedChoice")
    .addEventListener("click", function () {
      notice.remove();

      elements.banner.classList.remove("hidden");

      populateSettings(
        elements,
        decision.settings
      );

      elements.settingsPanel?.classList.add(
        "visible"
      );

      logEvent(
        siteId,
        "automation_choice_reviewed",
        {
          existingChoice: decision.choice
        }
      );
    });
}

function showPrivacySuggestion(siteId, banner) {
  const suggestion =
    document.createElement("aside");

  suggestion.id = "privacySuggestion";
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
        <strong>Device information:</strong>
        browser, operating system and device type
      </p>

      <p>
        <strong>Browsing activity:</strong>
        pages viewed, clicks and time spent
      </p>

      <p>
        <strong>Approximate location:</strong>
        country, region or approximate city
      </p>

      <p>
        <strong>Inferred interests:</strong>
        topics or products associated with browsing activity
      </p>
    </div>
  `;

  banner.prepend(suggestion);

  logEvent(
    siteId,
    "privacy_suggestion_shown"
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
      const opening = details.hidden;

      details.hidden = !details.hidden;

      detailsButton.textContent =
        details.hidden
          ? "Show me"
          : "Show less";

      logEvent(
        siteId,
        opening
          ? "privacy_suggestion_opened"
          : "privacy_suggestion_closed"
      );
    }
  );

  document
    .getElementById(
      "dismissPrivacySuggestion"
    )
    .addEventListener("click", function () {
      suggestion.remove();

      logEvent(
        siteId,
        "privacy_suggestion_dismissed"
      );
    });
}

export function initialiseCookieInterface(siteId) {
  const session = getSession();

  if (!session) {
    throw new Error(
      "No experiment session was found."
    );
  }

  const elements = getCookieElements();

  if (!elements.banner) {
    throw new Error(
      "The cookie banner could not be found."
    );
  }

  function completeDecision(
    choice,
    settings,
    source
  ) {
    const existingDecision =
      getExistingDecision(siteId);

    const decision = saveDecision(
      siteId,
      choice,
      settings,
      source
    );

    elements.banner.classList.add("hidden");

    elements.settingsPanel?.classList.remove(
      "visible"
    );

    removePrivacySuggestion();

    const automationOverride =
      session.condition === "automation" &&
      source === "manual" &&
      existingDecision?.source === "automation";

    logEvent(
      siteId,
      "cookie_choice",
      {
        choice,
        settings,
        source,
        automationOverride
      }
    );

    if (
      session.condition === "automation" &&
      source === "manual"
    ) {
      showAutomationNotice(
        siteId,
        elements,
        decision,
        true
      );
    }

    return decision;
  }

  elements.acceptButton?.addEventListener(
    "click",
    function () {
      completeDecision(
        "accept_all",
        {
          necessary: true,
          functional: true,
          analytics: true,
          advertising: true
        },
        "manual"
      );
    }
  );

  elements.rejectButton?.addEventListener(
    "click",
    function () {
      completeDecision(
        "reject_optional",
        {
          necessary: true,
          functional: false,
          analytics: false,
          advertising: false
        },
        "manual"
      );
    }
  );

  elements.customiseButton?.addEventListener(
    "click",
    function () {
      elements.settingsPanel?.classList.toggle(
        "visible"
      );

      logEvent(
        siteId,
        "cookie_settings_opened"
      );
    }
  );

  elements.saveSettingsButton?.addEventListener(
    "click",
    function () {
      completeDecision(
        "custom",
        {
          necessary: true,

          functional:
            elements.functionalCheckbox
              ?.checked ?? false,

          analytics:
            elements.analyticsCheckbox
              ?.checked ?? false,

          advertising:
            elements.advertisingCheckbox
              ?.checked ?? false
        },
        "manual"
      );
    }
  );

  const existingDecision =
    getExistingDecision(siteId);

  if (existingDecision) {
    elements.banner.classList.add("hidden");

    logEvent(
      siteId,
      "cookie_choice_restored",
      {
        choice: existingDecision.choice,
        source: existingDecision.source
      }
    );

    if (session.condition === "automation") {
      showAutomationNotice(
        siteId,
        elements,
        existingDecision
      );
    }

    return;
  }

  if (session.condition === "automation") {
    const preference =
      session.automationPreference;

    if (!preference) {
      elements.banner.classList.remove("hidden");

      logEvent(
        siteId,
        "automation_preference_missing"
      );

      return;
    }

    const settings = {
      necessary: true,
      functional:
        Boolean(preference.functional),
      analytics:
        Boolean(preference.analytics),
      advertising:
        Boolean(preference.advertising)
    };

    const decision = completeDecision(
      preference.choice,
      settings,
      "automation"
    );

    showAutomationNotice(
      siteId,
      elements,
      decision
    );

    logEvent(
      siteId,
      "automation_preference_applied",
      {
        choice: decision.choice,
        settings: decision.settings
      }
    );

    return;
  }

  elements.banner.classList.remove("hidden");

  logEvent(
    siteId,
    "cookie_banner_shown",
    {
      condition: session.condition
    }
  );

  if (session.condition === "suggestions") {
    showPrivacySuggestion(
      siteId,
      elements.banner
    );
  }
}

export function resetCookiePreferences(siteId) {
  sessionStorage.removeItem(
    getConsentStorageKey(siteId)
  );
}