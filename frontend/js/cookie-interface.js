"use strict";

import {
  getSession,
  getEvents,
  logEvent
} from "./experiment-core.js";

const CONSENT_STORAGE_PREFIX = "privacyExperimentConsent:";
const BASELINE_SITES = new Set(["site1"]);
const interfaceStates = new Map();


/* =========================================================
   SUGGESTION CONTENT
   ========================================================= */

const SUGGESTION_CONTEXTS = {

  initial_warning: {
    badge: "TRACKING + COOKIES",
    icon: "👀",
    title: "Website tracking is not always obvious",
    summary:
      "As you browse, this privacy tool may highlight tracking activity on the mock website and explain how it relates to your cookie preference.",
    chips: [
      "Browsing activity",
      "Cookie preferences",
      "Tracking"
    ],
    impact:
      "Seeing what a website records can make it easier to understand what your privacy choice actually changes.",
    details:
      "Some website tracking is expected and supports normal site functions. Other tracking is optional, used for analytics or advertising, or may not match the preference a user selected.",
    actionLabel: "See cookie options"
  },


  interest_browsing: {
    badge: "BROWSING + COOKIES",
    icon: "🎯",
    title: "Your clicks can reveal what interests you",
    summary:
      "You just interacted with content on this site. If analytics or advertising cookies are enabled, those interactions can be recorded and used to infer the topics you care about.",
    chips: [
      "Content viewed",
      "Clicks",
      "Inferred interests"
    ],
    impact:
      "This can influence recommendations, personalised content or advertising.",
    details:
      "A single click may not say much by itself, but repeated browsing signals can be combined into an interest profile over time.",
    actionLabel: "Review cookie settings"
  },


  product_browsing: {
    badge: "SHOPPING + COOKIES",
    icon: "🛍️",
    title: "Product views can become tracking signals",
    summary:
      "You just interacted with a product. With analytics or advertising cookies enabled, product views, clicks and cart activity can be recorded.",
    chips: [
      "Products viewed",
      "Cart activity",
      "Shopping interests"
    ],
    impact:
      "This can influence product recommendations and advertising based on your apparent shopping interests.",
    details:
      "Shopping behaviour can reveal preferences even when you do not make a purchase. Tracking technologies can use those signals to estimate what products or categories may interest you.",
    actionLabel: "Review cookie settings"
  },


  account: {
    badge: "ACCOUNT ACTIVITY",
    icon: "🔗",
    title: "Signing in can connect activity to an account",
    summary:
      "A signed-in website can associate browsing or shopping activity with an account even when optional cookies are disabled.",
    chips: [
      "Account activity",
      "Shopping history",
      "Signed-in session"
    ],
    impact:
      "Not all website tracking depends on optional cookies. Some account-linked activity is part of providing the signed-in service.",
    details:
      "Cookie preferences mainly control particular browser-based tracking categories. Signing in can still let a website associate actions with an account through its own first-party systems.",
    actionLabel: "Review cookie settings"
  },


  delivery: {
    badge: "LOCATION USE",
    icon: "📍",
    title: "Location information can be reused for other purposes",
    summary:
      "A delivery location may be needed to provide shipping, but the same information can also be reused for analytics, profiling or advertising.",
    chips: [
      "Perth, WA",
      "Delivery context",
      "Secondary use"
    ],
    impact:
      "The privacy issue is not only what information is collected, but also whether it is used for a purpose the user expected or agreed to.",
    details:
      "This study uses the fixed fictional location Perth, WA 6000. No real participant location is collected. The mock site can therefore demonstrate secondary use without processing a participant's real address.",
    actionLabel: "Review cookie settings"
  }

};


/* =========================================================
   GENERAL HELPERS
   ========================================================= */

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


function logInterfaceEvent(
  siteId,
  eventType,
  context,
  eventValue = {}
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

      ...eventValue

    }
  );

}


function nowMonotonic() {

  if (
    typeof performance !==
      "undefined" &&
    typeof performance.now ===
      "function"
  ) {

    return performance.now();

  }


  return Date.now();

}


function elapsedSince(
  startedAt
) {

  if (
    !Number.isFinite(
      startedAt
    )
  ) {

    return null;

  }


  return Math.max(
    0,
    Math.round(
      nowMonotonic() -
      startedAt
    )
  );

}


function timeFromPageLoad() {

  if (
    typeof performance !==
      "undefined" &&
    typeof performance.now ===
      "function"
  ) {

    return Math.max(
      0,
      Math.round(
        performance.now()
      )
    );

  }


  return null;

}


function millisecondsBetweenIso(
  startIso,
  endIso
) {

  if (
    !startIso ||
    !endIso
  ) {

    return null;

  }


  const start =
    Date.parse(
      startIso
    );


  const end =
    Date.parse(
      endIso
    );


  if (
    !Number.isFinite(
      start
    ) ||
    !Number.isFinite(
      end
    )
  ) {

    return null;

  }


  return Math.max(
    0,
    end - start
  );

}


/* =========================================================
   TASK PROGRESS
   ========================================================= */

function getTaskProgress(
  siteId
) {

  if (
    siteId ===
    "site3"
  ) {

    const progress =
      Number(
        document.body.dataset
          .shoppingTaskProgress ??
        0
      );


    return Number.isFinite(
      progress
    )
      ? progress
      : 0;

  }


  const nextBox =
    document.querySelector(
      ".next-box"
    );


  return (
    nextBox?.dataset
      .taskComplete ===
    "true"
  )
    ? 1
    : 0;

}


/* =========================================================
   COOKIE SETTINGS HELPERS
   ========================================================= */

function normaliseSettings(
  settings = {}
) {

  return {

    necessary:
      true,

    functional:
      Boolean(
        settings.functional
      ),

    analytics:
      Boolean(
        settings.analytics
      ),

    advertising:
      Boolean(
        settings.advertising
      )

  };

}


function decisionsAreEquivalent(
  existingDecision,
  settings
) {

  if (
    !existingDecision
  ) {

    return false;

  }


  const current =
    normaliseSettings(
      existingDecision.settings
    );


  const next =
    normaliseSettings(
      settings
    );


  return (

    current.functional ===
      next.functional &&

    current.analytics ===
      next.analytics &&

    current.advertising ===
      next.advertising

  );

}


function getChoiceLabel(
  choice
) {

  switch (
    choice
  ) {

    case "accept_all":
      return "Accept all";

    case "reject_optional":
      return "Reject optional";

    case "custom":
      return "Custom";

    default:
      return "Cookie preference";

  }

}


function getConsentStorageKey(
  siteId
) {

  return (
    `${CONSENT_STORAGE_PREFIX}${siteId}`
  );

}


/* =========================================================
   HISTORICAL SUGGESTION STATE
   =========================================================
   This is what prevents suggestions appearing again after
   a refresh.

   Once a suggestion type has been shown on that site,
   that context is considered used.
   ========================================================= */

function getHistoricalSuggestionState(
  siteId
) {

  const events =
    getEvents();


  const shownContexts =
    [];


  let everOpened =
    false;


  let lastContext =
    null;


  let exposureCount =
    0;


  events.forEach(
    event => {

      if (
        event.siteId !==
        siteId
      ) {

        return;

      }


      if (

        event.eventType ===
          "privacy_suggestion_shown" ||

        event.eventType ===
          "privacy_suggestion_updated"

      ) {

        const context =
          event.eventValue
            ?.context;


        if (
          context &&
          !shownContexts.includes(
            context
          )
        ) {

          shownContexts.push(
            context
          );

        }


        if (
          context
        ) {

          lastContext =
            context;

        }


        exposureCount +=
          1;

      }


      if (
        event.eventType ===
        "privacy_suggestion_opened"
      ) {

        everOpened =
          true;

      }

    }
  );


  return {

    shownContexts,

    everSeen:
      exposureCount >
      0,

    everOpened,

    lastContext,

    exposureCount

  };

}


/* =========================================================
   COOKIE DOM
   ========================================================= */

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


/* =========================================================
   COOKIE BANNER
   ========================================================= */

function setBannerVisible(
  banner,
  visible
) {

  if (
    !banner
  ) {

    return;

  }


  if (
    visible
  ) {

    banner.classList.remove(
      "hidden"
    );


    banner.style.removeProperty(
      "display"
    );


    return;

  }


  banner.classList.add(
    "hidden"
  );


  /*
   * Required because later stylesheet rules use
   * display: grid !important.
   */
  banner.style.setProperty(
    "display",
    "none",
    "important"
  );

}


function setSettingsVisible(
  elements,
  visible
) {

  elements
    .settingsPanel
    ?.classList
    .toggle(
      "visible",
      visible
    );

}


function populateSettings(
  elements,
  settings
) {

  const normalised =
    normaliseSettings(
      settings
    );


  if (
    elements.functionalCheckbox
  ) {

    elements.functionalCheckbox
      .checked =
        normalised.functional;

  }


  if (
    elements.analyticsCheckbox
  ) {

    elements.analyticsCheckbox
      .checked =
        normalised.analytics;

  }


  if (
    elements.advertisingCheckbox
  ) {

    elements.advertisingCheckbox
      .checked =
        normalised.advertising;

  }

}


/* =========================================================
   COOKIE STORAGE
   ========================================================= */

function getExistingDecision(
  siteId
) {

  const key =
    getConsentStorageKey(
      siteId
    );


  const raw =
    sessionStorage.getItem(
      key
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

    console.error(
      "Stored cookie decision is invalid:",
      error
    );


    sessionStorage.removeItem(
      key
    );


    return null;

  }

}


function storeDecision(
  siteId,
  decision
) {

  sessionStorage.setItem(

    getConsentStorageKey(
      siteId
    ),

    JSON.stringify(
      decision
    )

  );

}


/* =========================================================
   DECISION OBJECTS
   ========================================================= */

function createInitialDecision(
  choice,
  settings,
  source,
  context
) {

  const savedAt =
    new Date()
      .toISOString();


  const normalisedSettings =
    normaliseSettings(
      settings
    );


  return {

    choice,

    settings:
      normalisedSettings,

    source,

    assignedCondition:
      context.assignedCondition,

    interfaceCondition:
      context.interfaceCondition,

    phase:
      context.phase,

    initialChoice:
      choice,

    initialSettings:
      normalisedSettings,

    initialSource:
      source,

    initialSavedAt:
      savedAt,

    revisionCount:
      0,

    savedAt

  };

}


function createRevisedDecision(
  previous,
  choice,
  settings,
  source
) {

  return {

    ...previous,

    choice,

    settings:
      normaliseSettings(
        settings
      ),

    source,

    revisionCount:
      (
        previous.revisionCount ??
        0
      ) +
      1,

    savedAt:
      new Date()
        .toISOString()

  };

}


/* =========================================================
   COOKIE CONFIRMATION
   ========================================================= */

function showCookieDecisionConfirmation(
  message
) {

  document
    .getElementById(
      "cookieDecisionConfirmation"
    )
    ?.remove();


  const confirmation =
    document.createElement(
      "div"
    );


  confirmation.id =
    "cookieDecisionConfirmation";


  confirmation.className =
    "experiment-cookie-confirmation";


  confirmation.setAttribute(
    "role",
    "status"
  );


  confirmation.setAttribute(
    "aria-live",
    "polite"
  );


  confirmation.textContent =
    message;


  document.body.appendChild(
    confirmation
  );


  requestAnimationFrame(
    () => {

      confirmation
        .classList
        .add(
          "is-visible"
        );

    }
  );


  window.setTimeout(
    () => {

      confirmation
        .classList
        .remove(
          "is-visible"
        );


      window.setTimeout(
        () => {

          confirmation.remove();

        },
        220
      );

    },
    1900
  );

}


/* =========================================================
   PERSISTENT PRIVACY CONTROL
   ========================================================= */

function removePersistentPrivacyControl() {

  document
    .getElementById(
      "persistentPrivacyControl"
    )
    ?.remove();

}


function showPersistentPrivacyControl(
  state
) {

  removePersistentPrivacyControl();


  const decision =
    getExistingDecision(
      state.siteId
    );


  if (
    !decision
  ) {

    return;

  }


  const automation =

    state.context
      .interfaceCondition ===
    "automation";


  const control =
    document.createElement(
      "aside"
    );


  control.id =
    "persistentPrivacyControl";


  control.className =
    "experiment-privacy-control";


  control.setAttribute(
    "aria-label",
    "Cookie privacy preference"
  );


  control.innerHTML = `

    <div class="experiment-privacy-control__copy">

      <span>
        ${
          automation
            ? "Privacy preference"
            : "Cookies"
        }
      </span>

      <strong>
        ${getChoiceLabel(
          decision.choice
        )}
      </strong>

    </div>

    <button
      type="button"
      id="persistentPrivacyReviewButton"
    >
      ${
        automation
          ? "Review or change"
          : "Cookie settings"
      }
    </button>

  `;


  document.body.appendChild(
    control
  );


  control
    .querySelector(
      "#persistentPrivacyReviewButton"
    )
    ?.addEventListener(
      "click",
      () => {

        openCookieSettings(
          state,
          {

            origin:
              automation
                ? "automation_status"
                : "persistent_control"

          }
        );

      }
    );

}


/* =========================================================
   OPEN COOKIE SETTINGS
   ========================================================= */

function openCookieSettings(
  state,
  {
    origin =
      "persistent_control"
  } = {}
) {

  const existingDecision =
    getExistingDecision(
      state.siteId
    );


  if (
    existingDecision
  ) {

    populateSettings(
      state.elements,
      existingDecision.settings
    );

  }


  setBannerVisible(
    state.elements.banner,
    true
  );


  setSettingsVisible(
    state.elements,
    true
  );


  state.settingsOpenedAt =
    nowMonotonic();


  state.settingsOpenCount +=
    1;


  const reopened =
    Boolean(
      existingDecision
    );


  if (
    reopened
  ) {

    state.settingsReopenCount +=
      1;

  }


  logInterfaceEvent(

    state.siteId,

    reopened
      ? "cookie_settings_reopened"
      : "cookie_settings_opened",

    state.context,

    {

      origin,

      existingChoice:
        existingDecision
          ?.choice ??
        null,

      settingsOpenCount:
        state.settingsOpenCount,

      settingsReopenCount:
        state.settingsReopenCount,

      taskProgressAtOpen:
        getTaskProgress(
          state.siteId
        ),

      timeFromSiteLoadToOpenMilliseconds:
        timeFromPageLoad()

    }

  );


  if (

    state.context
      .interfaceCondition ===
      "automation" &&

    reopened

  ) {

    logInterfaceEvent(

      state.siteId,

      "automation_choice_reviewed",

      state.context,

      {

        existingChoice:
          existingDecision.choice,

        taskProgressAtReview:
          getTaskProgress(
            state.siteId
          ),

        timeFromSiteLoadToReviewMilliseconds:
          timeFromPageLoad()

      }

    );

  }

}


function closeCookieSettings(
  state
) {

  setSettingsVisible(
    state.elements,
    false
  );


  setBannerVisible(
    state.elements.banner,
    false
  );


  state.settingsOpenedAt =
    null;

}


/* =========================================================
   SUGGESTIONS
   ========================================================= */

function removePrivacySuggestion() {

  document
    .getElementById(
      "privacySuggestion"
    )
    ?.remove();

}


/*
 * Choosing a cookie preference removes the current
 * Suggestions card.
 *
 * Importantly, that context remains marked as "shown".
 * It cannot appear again afterwards.
 */
function hideSuggestionAfterCookieChoice(
  state
) {

  if (
    state.context
      .interfaceCondition !==
    "suggestions"
  ) {

    return;

  }


  const visibleContext =
    state.visibleSuggestionContext;


  if (
    !visibleContext
  ) {

    return;

  }


  removePrivacySuggestion();


  state.visibleSuggestionContext =
    null;


  state.suggestionShownAt =
    null;


  logInterfaceEvent(

    state.siteId,

    "privacy_suggestion_hidden_after_cookie_choice",

    state.context,

    {

      context:
        visibleContext,

      taskProgress:
        getTaskProgress(
          state.siteId
        )

    }

  );

}


function buildSuggestionChips(
  chips
) {

  return chips

    .map(
      chip => `

        <span class="experiment-contextual-privacy-tip__chip">
          ${chip}
        </span>

      `
    )

    .join("");

}

/* =========================================================
   TRACKING ACTIVITY CALLOUT
   ========================================================= */

function buildTrackingActivityHtml(
  tracking
) {

  if (
    !tracking ||
    typeof tracking !==
      "object"
  ) {

    return "";

  }


  const dataLabel =
    tracking.dataLabel ||
    "this activity";


  const purpose =
    tracking.purpose ||
    "website tracking";


  const cookieCategory =

    tracking.cookieCategory

      ? (

          tracking.cookieCategory
            .charAt(0)
            .toUpperCase() +

          tracking.cookieCategory
            .slice(1)

        )

      : null;


  let status =
    "recorded";


  let title =
    "Tracking detected";


  let message =
    `This mock site recorded ${dataLabel.toLowerCase()} for ${purpose.toLowerCase()}.`;


  /*
   * The website attempted optional tracking, but the
   * participant's preference prevented it.
   */
  if (
    tracking.outcome ===
    "blocked"
  ) {

    status =
      "blocked";


    title =
      "Tracking attempt blocked";


    if (
      tracking.preferenceState ===
      "no_cookie_decision"
    ) {

      message =
        `This mock site attempted to record ${dataLabel.toLowerCase()}, but the optional ${tracking.cookieCategory || "tracking"} category had not been enabled.`;

    }

    else {

      message =
        `This mock site attempted to record ${dataLabel.toLowerCase()}, but your current ${tracking.cookieCategory || "cookie"} preference blocked it.`;

    }

  }


  /*
   * Most important experimental case:
   *
   * the participant disabled the relevant cookie category
   * but the mock site recorded the activity anyway.
   */
  else if (
    tracking.preferenceMismatch
  ) {

    status =
      "mismatch";


    title =
      "Preference mismatch detected";


    message =
      `This mock site recorded ${dataLabel.toLowerCase()} even though ${cookieCategory || "the relevant optional tracking"} is turned off in your current preference.`;


    if (
      tracking.disclosureMismatch
    ) {

      message +=
        " This use was also not explicitly described in the cookie message.";

    }

  }


  /*
   * The information was used for a secondary purpose that
   * was not explicitly disclosed.
   */
  else if (
    tracking.disclosureMismatch
  ) {

    status =
      "unexpected";


    title =
      "Unexpected secondary use detected";


    message =
      `This mock site used ${dataLabel.toLowerCase()} for ${purpose.toLowerCase()}, a use that was not explicitly described in the cookie message.`;

  }


  /*
   * Account/service activity that is not controlled by the
   * optional-cookie preference.
   */
  else if (
    tracking.consentRelevant ===
    false
  ) {

    status =
      "service";


    title =
      "Account-linked activity detected";


    message =
      `This mock site associated ${dataLabel.toLowerCase()} with the signed-in demo session. This can happen independently of optional-cookie settings.`;

  }


  /*
   * Ordinary allowed tracking.
   */
  else if (
    tracking.categoryAllowed ===
    true
  ) {

    message +=
      ` This is consistent with your current ${tracking.cookieCategory} setting.`;

  }


  return `
    <div
      class="experiment-contextual-privacy-tip__tracking"
      data-status="${status}"
    >

      <strong>
        ${title}
      </strong>

      <p>
        ${message}
      </p>

    </div>
  `;

}


/* =========================================================
   RENDER PRIVACY SUGGESTION
   ========================================================= */

function renderPrivacySuggestion(
  state,
  contextName,
  metadata = {}
) {

  if (
    state.context
      .interfaceCondition !==
    "suggestions"
  ) {

    return false;

  }


  const definition =
    SUGGESTION_CONTEXTS[
      contextName
    ];

  const tracking =
    metadata?.tracking ??
    null;  


  if (
    !definition
  ) {

    return false;

  }


  /* =======================================================
     ANTI-SPAM RULE

     Each privacy context can appear ONCE only.

     Examples:
       initial_warning    → once
       interest_browsing  → once
       product_browsing   → once
       account            → once
       delivery           → once

     Closing it, choosing cookies, refreshing the page,
     clicking again, focusing another field, etc. does not
     reset it.
     ======================================================= */

  if (
    state.shownSuggestionContexts
      .has(
        contextName
      )
  ) {

    return false;

  }


  const previousContext =
    state.lastSuggestionContext;


  /*
   * A genuinely NEW context replaces any older visible
   * suggestion that the participant has ignored.
   */
  removePrivacySuggestion();


  const suggestion =
    document.createElement(
      "aside"
    );


  suggestion.id =
    "privacySuggestion";


  suggestion.className =
    "experiment-contextual-privacy-tip";


  suggestion.dataset.context =
    contextName;

    if (
      tracking?.behaviourClassification
  ) {

    suggestion.dataset.trackingStatus =
      tracking.behaviourClassification;

  }  


  suggestion.dataset.sequence =
    String(
      state.suggestionExposureCount +
      1
    );


  suggestion.setAttribute(
    "aria-label",
    "Tracking and cookie suggestion"
  );


  suggestion.innerHTML = `

    <div class="experiment-contextual-privacy-tip__topline">

      <div class="experiment-contextual-privacy-tip__badge-wrap">

        <span
          class="experiment-contextual-privacy-tip__icon"
          aria-hidden="true"
        >
          ${definition.icon}
        </span>

        <span class="experiment-contextual-privacy-tip__badge">
          ${definition.badge}
        </span>

      </div>


      <button
        type="button"
        id="dismissPrivacySuggestion"
        class="experiment-contextual-privacy-tip__dismiss"
        aria-label="Dismiss tracking insight"
      >
        ×
      </button>

    </div>


    <h3 class="experiment-contextual-privacy-tip__title">
      ${definition.title}
    </h3>


    <p class="experiment-contextual-privacy-tip__summary">
      ${definition.summary}
    </p>


    <div class="experiment-contextual-privacy-tip__chips">

      ${
        buildSuggestionChips(
          definition.chips
        )
      }

        </div>


    ${
      buildTrackingActivityHtml(
        tracking
      )
    }


    <p class="experiment-contextual-privacy-tip__impact">

      <strong>
        This may affect you:
      </strong>

      ${definition.impact}

    </p>


    <div class="experiment-contextual-privacy-tip__actions">

      <button
        type="button"
        id="showPrivacyDetails"
        class="experiment-contextual-privacy-tip__learn"
        aria-expanded="false"
      >
        Why does this matter?
      </button>


      <button
        type="button"
        id="privacySuggestionSettingsButton"
        class="experiment-contextual-privacy-tip__settings"
      >
        ${definition.actionLabel}
      </button>

    </div>


    <div
      id="privacySuggestionDetails"
      class="experiment-contextual-privacy-tip__details"
      hidden
    >

      <p>
        ${definition.details}
      </p>

    </div>

  `;


  document.body.appendChild(
    suggestion
  );


  /*
   * Mark it as used immediately.
   *
   * From this point onwards this context cannot be shown
   * again on this site.
   */
  state.shownSuggestionContexts
    .add(
      contextName
    );


  state.lastSuggestionContext =
    contextName;


  state.visibleSuggestionContext =
    contextName;


  state.currentSuggestionOpened =
    false;


  state.suggestionEverSeen =
    true;


  state.suggestionShownAt =
    nowMonotonic();


  state.suggestionExposureCount +=
    1;


  logInterfaceEvent(

    state.siteId,

    state.suggestionExposureCount ===
      1

      ? "privacy_suggestion_shown"

      : "privacy_suggestion_updated",

    state.context,

    {

      context:
        contextName,

      previousContext,

      suggestionExposureCount:
        state.suggestionExposureCount,

      taskProgressAtExposure:
        getTaskProgress(
          state.siteId
        ),

      timeFromSiteLoadToSuggestionMilliseconds:
        timeFromPageLoad(),

      ...metadata

    }

  );


  const details =
    suggestion.querySelector(
      "#privacySuggestionDetails"
    );


  const detailsButton =
    suggestion.querySelector(
      "#showPrivacyDetails"
    );


  detailsButton
    ?.addEventListener(
      "click",
      () => {

        const opening =
          details.hidden;


        details.hidden =
          !opening;


        detailsButton.textContent =
          opening
            ? "Show less"
            : "Why does this matter?";


        detailsButton.setAttribute(
          "aria-expanded",
          opening
            ? "true"
            : "false"
        );


        if (
          opening
        ) {

          state.currentSuggestionOpened =
            true;


          state.suggestionEverOpened =
            true;

        }


        logInterfaceEvent(

          state.siteId,

          opening
            ? "privacy_suggestion_opened"
            : "privacy_suggestion_closed",

          state.context,

          {

            context:
              contextName,

            taskProgressAtInteraction:
              getTaskProgress(
                state.siteId
              ),

            timeSinceSuggestionShownMilliseconds:
              elapsedSince(
                state.suggestionShownAt
              )

          }

        );

      }
    );


  suggestion
    .querySelector(
      "#dismissPrivacySuggestion"
    )
    ?.addEventListener(
      "click",
      () => {

        const timeSinceShown =
          elapsedSince(
            state.suggestionShownAt
          );


        removePrivacySuggestion();


        state.visibleSuggestionContext =
          null;


        state.suggestionShownAt =
          null;


        logInterfaceEvent(

          state.siteId,

          "privacy_suggestion_dismissed",

          state.context,

          {

            context:
              contextName,

            taskProgressAtDismissal:
              getTaskProgress(
                state.siteId
              ),

            timeSinceSuggestionShownMilliseconds:
              timeSinceShown

          }

        );

      }
    );


  suggestion
    .querySelector(
      "#privacySuggestionSettingsButton"
    )
    ?.addEventListener(
      "click",
      () => {

        logInterfaceEvent(

          state.siteId,

          "privacy_suggestion_settings_opened",

          state.context,

          {

            context:
              contextName,

            taskProgressAtInteraction:
              getTaskProgress(
                state.siteId
              ),

            timeSinceSuggestionShownMilliseconds:
              elapsedSince(
                state.suggestionShownAt
              )

          }

        );


        openCookieSettings(
          state,
          {

            origin:
              "privacy_suggestion"

          }
        );

      }
    );


  return true;

}


/* =========================================================
   PRIVACY CONTEXT HANDLING
   ========================================================= */

function handlePrivacyContext(
  state,
  contextName,
  metadata = {}
) {

  if (
    state.context
      .interfaceCondition !==
    "suggestions"
  ) {

    return;

  }


  if (
    !SUGGESTION_CONTEXTS[
      contextName
    ]
  ) {

    return;

  }


  /*
   * Do nothing at all for a context that has already
   * appeared.
   *
   * This prevents repeated focus/click/input events from
   * creating either UI spam or unnecessary privacy-context
   * event spam.
   */
  if (
    state.shownSuggestionContexts
      .has(
        contextName
      )
  ) {

    return;

  }


  logInterfaceEvent(

    state.siteId,

    "privacy_context_detected",

    state.context,

    {

      context:
        contextName,

      taskProgress:
        getTaskProgress(
          state.siteId
        ),

      ...metadata

    }

  );


  renderPrivacySuggestion(
    state,
    contextName,
    metadata
  );

}


/* =========================================================
   PUBLIC CONTEXT HOOK
   ========================================================= */

export function setPrivacyContext(
  siteId,
  contextName,
  metadata = {}
) {

  const state =
    interfaceStates.get(
      siteId
    );


  if (
    !state
  ) {

    return;

  }


  handlePrivacyContext(
    state,
    contextName,
    metadata
  );

}


/* =========================================================
   COMPLETE COOKIE DECISION
   ========================================================= */

function completeDecision(
  state,
  choice,
  settings,
  source
) {

  const existingDecision =
    getExistingDecision(
      state.siteId
    );


  const normalisedSettings =
    normaliseSettings(
      settings
    );


  const isInitialDecision =
    !existingDecision;


  const unchanged =
    decisionsAreEquivalent(
      existingDecision,
      normalisedSettings
    );


  const taskProgressAtDecision =
    getTaskProgress(
      state.siteId
    );


  const settingsOpenedAt =
    state.settingsOpenedAt;


  /* =======================================================
     SAME EFFECTIVE PREFERENCE
     ======================================================= */

  if (
    existingDecision &&
    unchanged
  ) {

    closeCookieSettings(
      state
    );


    logInterfaceEvent(

      state.siteId,

      "cookie_settings_saved_unchanged",

      state.context,

      {

        choice:
          existingDecision.choice,

        previousChoice:
          existingDecision.choice,

        requestedChoice:
          choice,

        settings:
          normalisedSettings,

        effectivePreferenceChanged:
          false,

        source,

        taskProgressAtDecision,

        timeFromSettingsOpenToSaveMilliseconds:
          elapsedSince(
            settingsOpenedAt
          )

      }

    );


    hideSuggestionAfterCookieChoice(
      state
    );


    showPersistentPrivacyControl(
      state
    );


    if (
      source ===
      "manual"
    ) {

      showCookieDecisionConfirmation(
        "Cookie preference unchanged"
      );

    }


    return existingDecision;

  }


  /* =======================================================
     INITIAL OR CHANGED PREFERENCE
     ======================================================= */

  const decision =

    isInitialDecision

      ? createInitialDecision(

          choice,

          normalisedSettings,

          source,

          state.context

        )

      : createRevisedDecision(

          existingDecision,

          choice,

          normalisedSettings,

          source

        );


  storeDecision(
    state.siteId,
    decision
  );


  closeCookieSettings(
    state
  );


  const automationOverride =

    state.context
      .interfaceCondition ===
      "automation" &&

    source ===
      "manual" &&

    !isInitialDecision;


  logInterfaceEvent(

    state.siteId,

    "cookie_choice",

    state.context,

    {

      decisionMade:
        true,

      choice,

      settings:
        normalisedSettings,

      source,

      isInitialDecision,

      changedFromPrevious:
        !isInitialDecision,

      previousChoice:
        existingDecision
          ?.choice ??
        null,

      automationOverride,

      revisionCount:
        decision.revisionCount,

      taskProgressAtDecision,

      timeFromSiteLoadToDecisionMilliseconds:
        timeFromPageLoad(),

      timeFromInterfaceInitialisationToDecisionMilliseconds:
        elapsedSince(
          state.interfaceInitialisedAt
        ),

      timeFromSettingsOpenToDecisionMilliseconds:
        elapsedSince(
          settingsOpenedAt
        ),

      timeFromSuggestionShownToDecisionMilliseconds:

        Number.isFinite(
          state.suggestionShownAt
        )

          ? elapsedSince(
              state.suggestionShownAt
            )

          : null,

      suggestionContextAtDecision:

        state.visibleSuggestionContext ??

        state.lastSuggestionContext ??

        null

    }

  );


  if (
    !isInitialDecision
  ) {

    logInterfaceEvent(

      state.siteId,

      "cookie_preference_changed",

      state.context,

      {

        from:
          existingDecision.choice,

        to:
          choice,

        previousSettings:
          normaliseSettings(
            existingDecision.settings
          ),

        settings:
          normalisedSettings,

        source,

        revisionCount:
          decision.revisionCount,

        context:

          state.visibleSuggestionContext ??

          state.lastSuggestionContext ??

          null,

        suggestionSeenBeforeChange:
          Boolean(
            state.suggestionEverSeen
          ),

        suggestionOpenedBeforeChange:
          Boolean(
            state.suggestionEverOpened
          ),

        timeInitialChoiceToChangeMilliseconds:
          millisecondsBetweenIso(
            decision.initialSavedAt,
            decision.savedAt
          )

      }

    );

  }


  if (
    automationOverride
  ) {

    logInterfaceEvent(

      state.siteId,

      "automation_override",

      state.context,

      {

        from:
          existingDecision.choice,

        to:
          choice,

        taskProgressAtOverride:
          taskProgressAtDecision

      }

    );

  }


  if (
    isInitialDecision
  ) {

    state.initialDecisionAt =
      nowMonotonic();

  }


  /*
   * Remove any currently visible Suggestions card.
   *
   * Its context remains permanently recorded as already
   * shown.
   */
  hideSuggestionAfterCookieChoice(
    state
  );


  showPersistentPrivacyControl(
    state
  );


  if (
    source ===
    "manual"
  ) {

    showCookieDecisionConfirmation(

      isInitialDecision

        ? `Cookie preference saved: ${getChoiceLabel(
            choice
          )}`

        : `Cookie preference updated: ${getChoiceLabel(
            choice
          )}`

    );

  }


  return decision;

}


/* =========================================================
   INITIALISE COOKIE INTERFACE
   ========================================================= */

export function initialiseCookieInterface(
  siteId
) {

  const session =
    getSession();


  if (
    !session
  ) {

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


  if (
    !elements.banner
  ) {

    throw new Error(
      "The cookie banner could not be found."
    );

  }


  const historicalSuggestionState =
    getHistoricalSuggestionState(
      siteId
    );


  const state = {

    siteId,

    session,

    context,

    elements,

    interfaceInitialisedAt:
      nowMonotonic(),

    initialDecisionAt:
      null,

    settingsOpenedAt:
      null,

    settingsOpenCount:
      0,

    settingsReopenCount:
      0,

    suggestionShownAt:
      null,

    lastSuggestionContext:
      historicalSuggestionState
        .lastContext,

    visibleSuggestionContext:
      null,

    currentSuggestionOpened:
      false,

    suggestionEverSeen:
      historicalSuggestionState
        .everSeen,

    suggestionEverOpened:
      historicalSuggestionState
        .everOpened,

    suggestionExposureCount:
      historicalSuggestionState
        .exposureCount,

    /*
     * The important anti-spam state.
     *
     * Contexts reconstructed from existing events remain
     * suppressed after a refresh.
     */
    shownSuggestionContexts:
      new Set(
        historicalSuggestionState
          .shownContexts
      )

  };


  interfaceStates.set(
    siteId,
    state
  );


  logInterfaceEvent(

    siteId,

    "interface_initialised",

    context,

    {

      timeFromSiteLoadMilliseconds:
        timeFromPageLoad()

    }

  );


  /* =======================================================
     ACCEPT ALL
     ======================================================= */

  elements
    .acceptButton
    ?.addEventListener(
      "click",
      () => {

        completeDecision(

          state,

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
      () => {

        completeDecision(

          state,

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
      () => {

        const opening =

          !elements
            .settingsPanel
            ?.classList
            .contains(
              "visible"
            );


        setSettingsVisible(
          elements,
          opening
        );


        if (
          !opening
        ) {

          return;

        }


        const existingDecision =
          getExistingDecision(
            siteId
          );


        if (
          existingDecision
        ) {

          populateSettings(
            elements,
            existingDecision.settings
          );

        }


        state.settingsOpenedAt =
          nowMonotonic();


        state.settingsOpenCount +=
          1;


        if (
          existingDecision
        ) {

          state.settingsReopenCount +=
            1;

        }


        logInterfaceEvent(

          siteId,

          existingDecision

            ? "cookie_settings_reopened"

            : "cookie_settings_opened",

          context,

          {

            origin:
              "banner_customise",

            existingChoice:
              existingDecision
                ?.choice ??
              null,

            settingsOpenCount:
              state.settingsOpenCount,

            settingsReopenCount:
              state.settingsReopenCount,

            taskProgressAtOpen:
              getTaskProgress(
                siteId
              ),

            timeFromSiteLoadToOpenMilliseconds:
              timeFromPageLoad()

          }

        );

      }
    );


  /* =======================================================
     SAVE CUSTOM
     ======================================================= */

  elements
    .saveSettingsButton
    ?.addEventListener(
      "click",
      () => {

        completeDecision(

          state,

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
     GENERIC PRIVACY CONTEXT EVENT
     ======================================================= */

  document.addEventListener(

    "privacyExperiment:privacyContext",

    event => {

      const detail =
        event.detail ??
        {};


      if (
        detail.siteId &&
        detail.siteId !==
          siteId
      ) {

        return;

      }


      if (
        !detail.context
      ) {

        return;

      }


      handlePrivacyContext(

        state,

        detail.context,

        detail.metadata ??
          {}

      );

    }

  );


  /* =======================================================
     RESTORE EXISTING COOKIE DECISION
     ======================================================= */

  const existingDecision =
    getExistingDecision(
      siteId
    );


  if (
    existingDecision
  ) {

    setBannerVisible(
      elements.banner,
      false
    );


    setSettingsVisible(
      elements,
      false
    );


    populateSettings(
      elements,
      existingDecision.settings
    );


    logInterfaceEvent(

      siteId,

      "cookie_choice_restored",

      context,

      {

        choice:
          existingDecision.choice,

        source:
          existingDecision.source,

        revisionCount:
          existingDecision
            .revisionCount ??
          0

      }

    );


    showPersistentPrivacyControl(
      state
    );


    /*
     * Do not automatically restore a Suggestions card.
     *
     * Only a privacy context that has NEVER been shown
     * before may appear after the refresh.
     */
    return;

  }


  /* =======================================================
     AUTOMATION
     ======================================================= */

  if (
    context
      .interfaceCondition ===
    "automation"
  ) {

    const preference =
      session
        .automationPreference;


    if (
      !preference
    ) {

      setBannerVisible(
        elements.banner,
        true
      );


      logInterfaceEvent(

        siteId,

        "automation_preference_missing",

        context,

        {

          timeFromSiteLoadMilliseconds:
            timeFromPageLoad()

        }

      );


      logInterfaceEvent(

        siteId,

        "cookie_banner_shown",

        context,

        {

          taskProgressAtExposure:
            getTaskProgress(
              siteId
            ),

          timeFromSiteLoadMilliseconds:
            timeFromPageLoad()

        }

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

        state,

        preference.choice,

        settings,

        "automation"

      );


    logInterfaceEvent(

      siteId,

      "automation_preference_applied",

      context,

      {

        choice:
          decision.choice,

        settings:
          decision.settings,

        taskProgressAtApplication:
          getTaskProgress(
            siteId
          ),

        timeFromSiteLoadToApplicationMilliseconds:
          timeFromPageLoad()

      }

    );


    showCookieDecisionConfirmation(

      `Saved privacy preference applied: ${getChoiceLabel(
        decision.choice
      )}`

    );


    return;

  }


  /* =======================================================
     MANUAL COOKIE BANNER
     ======================================================= */

  setBannerVisible(
    elements.banner,
    true
  );


  logInterfaceEvent(

    siteId,

    "cookie_banner_shown",

    context,

    {

      taskProgressAtExposure:
        getTaskProgress(
          siteId
        ),

      timeFromSiteLoadMilliseconds:
        timeFromPageLoad()

    }

  );


  /* =======================================================
     INITIAL SUGGESTIONS WARNING
     ======================================================= */

    if (
    context
      .interfaceCondition ===
      "suggestions" &&

    siteId ===
      "site2"
  ) {

    handlePrivacyContext(

      state,

      "initial_warning",

      {

        trigger:
          "site_load",

        initialContext:
          true

      }

    );

  }

}


/* =========================================================
   DEVELOPMENT RESET
   ========================================================= */

export function resetCookiePreferences(
  siteId
) {

  sessionStorage.removeItem(
    getConsentStorageKey(
      siteId
    )
  );


  interfaceStates.delete(
    siteId
  );


  removePersistentPrivacyControl();


  removePrivacySuggestion();


  document
    .getElementById(
      "cookieDecisionConfirmation"
    )
    ?.remove();

}