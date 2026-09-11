"use strict";

import {
  getSession,
  getEvents,
  logEvent
} from "./experiment-core.js";

const CONSENT_STORAGE_PREFIX = "privacyExperimentConsent:";
const BASELINE_SITES = new Set(["site1"]);
const interfaceStates = new Map();

const PRIVACY_STYLESHEET_ID =
  "experimentPrivacyInterfaceStyles";

const PRIVACY_STYLESHEET_HREF =
  "css/privacy-interface.css";

let privacyLayoutSyncQueued =
  false;

let privacyLayoutListenersReady =
  false;


/* =========================================================
   SUGGESTION CONTENT

   Participant-facing wording is deliberately short.
   The goal is quick attention and recall rather than
   detailed technical explanation.
   ========================================================= */

const SUGGESTION_CONTEXTS = {

  initial_warning: {
    badge: "PRIVACY TIP",
    icon: "👀",
    title: "This site may track what you do",
    summary:
      "Clicks and browsing can be recorded to learn about your interests.",
    chips: [
      "Clicks",
      "Browsing",
      "Interests"
    ],
    details:
      "Analytics can measure what you view and click. Advertising tools can use that activity to learn what may interest you.",
    actionLabel: "Cookie settings"
  },


  interest_browsing: {
    badge: "TRACKING",
    icon: "🎯",
    title: "This site tracked your clicks",
    summary:
      "Your activity can show what content you are interested in.",
    chips: [
      "Clicks",
      "Content",
      "Interests"
    ],
    details:
      "Analytics can record page views and clicks. Advertising tools may use the same activity to personalise content or ads.",
    actionLabel: "Cookie settings"
  },


  product_browsing: {
    badge: "SHOPPING TRACKING",
    icon: "🛍️",
    title: "This site noticed what you viewed",
    summary:
      "Product views can be used to work out what you like.",
    chips: [
      "Product views",
      "Cart activity",
      "Interests"
    ],
    details:
      "Shopping sites can learn from the products you view or add to your cart, even when you do not buy anything.",
    actionLabel: "Cookie settings"
  },


  account: {
    badge: "ACCOUNT ACTIVITY",
    icon: "🔗",
    title: "Your activity was linked to an account",
    summary:
      "Signing in can connect what you do across different visits.",
    chips: [
      "Account",
      "Browsing",
      "Shopping"
    ],
    details:
      "A signed-in site can link actions to an account even when optional cookies are off.",
    actionLabel: "Cookie settings"
  },


  delivery: {
    badge: "LOCATION USE",
    icon: "📍",
    title: "Your delivery location was used",
    summary:
      "A location given for delivery can also be used for other purposes, such as advertising.",
    chips: [
      "Location",
      "Delivery",
      "Advertising"
    ],
    details:
      "This experiment uses the fictional location Perth WA 6000. No real address or location is collected.",
    actionLabel: "Cookie settings"
  }

};


/* =========================================================
   PRIVACY INTERFACE STYLES + RESPONSIVE POSITIONING
   ========================================================= */

function ensurePrivacyInterfaceStylesheet() {

  if (
    document.getElementById(
      PRIVACY_STYLESHEET_ID
    )
  ) {

    return;

  }


  const link =
    document.createElement(
      "link"
    );


  link.id =
    PRIVACY_STYLESHEET_ID;


  link.rel =
    "stylesheet";


  link.href =
    PRIVACY_STYLESHEET_HREF;


  link.addEventListener(
    "load",
    schedulePrivacyLayoutSync
  );


  document.head.appendChild(
    link
  );

}


function elementIsVisible(
  element
) {

  if (
    !element ||
    !element.isConnected
  ) {

    return false;

  }


  const style =
    window.getComputedStyle(
      element
    );


  if (
    style.display ===
      "none" ||
    style.visibility ===
      "hidden"
  ) {

    return false;

  }


  const rect =
    element.getBoundingClientRect();


  return (
    rect.width >
      0 &&
    rect.height >
      0
  );

}


function syncPrivacyOverlayLayout() {

  const body =
    document.body;


  if (
    !body?.dataset?.studySite
  ) {

    return;

  }


  const viewportHeight =
    window.innerHeight ||
    document.documentElement.clientHeight ||
    800;


  const viewportWidth =
    window.innerWidth ||
    document.documentElement.clientWidth ||
    1200;


  const gap =
    viewportWidth <=
      700
      ? 10
      : 16;


  const edge =
    viewportWidth <=
      700
      ? 8
      : 18;


  let bottomClearance =
    edge;


  const cookieBanner =
    document.getElementById(
      "cookieBanner"
    );


  const privacyControl =
    document.getElementById(
      "persistentPrivacyControl"
    );


  const settingsOpen =
    body.dataset
      .cookieSettingsOpen ===
    "true";


  /*
   * The full settings panel temporarily hides the tip, so
   * there is no need to force both large interfaces into the
   * same viewport space.
   */
  if (
    !settingsOpen &&
    elementIsVisible(
      cookieBanner
    )
  ) {

    const bannerRect =
      cookieBanner
        .getBoundingClientRect();


    bottomClearance =
      Math.max(
        edge,
        viewportHeight -
          bannerRect.top +
          gap
      );

  }

  else if (
    viewportWidth <=
      760 &&
    elementIsVisible(
      privacyControl
    )
  ) {

    const controlRect =
      privacyControl
        .getBoundingClientRect();


    bottomClearance =
      Math.max(
        edge,
        viewportHeight -
          controlRect.top +
          gap
      );

  }


  const availableHeight =
    Math.max(
      190,
      viewportHeight -
        bottomClearance -
        edge
    );


  const cardMaxHeight =
    Math.min(
      500,
      availableHeight
    );


  body.style.setProperty(
    "--privacy-tip-bottom",
    `${Math.round(
      bottomClearance
    )}px`
  );


  body.style.setProperty(
    "--privacy-tip-max-height",
    `${Math.round(
      cardMaxHeight
    )}px`
  );

}


function schedulePrivacyLayoutSync() {

  if (
    privacyLayoutSyncQueued
  ) {

    return;

  }


  privacyLayoutSyncQueued =
    true;


  window.requestAnimationFrame(
    () => {

      privacyLayoutSyncQueued =
        false;


      syncPrivacyOverlayLayout();

    }
  );

}


function initialisePrivacyLayoutSync(
  elements
) {

  if (
    privacyLayoutListenersReady
  ) {

    schedulePrivacyLayoutSync();


    return;

  }


  privacyLayoutListenersReady =
    true;


  window.addEventListener(
    "resize",
    schedulePrivacyLayoutSync,
    {
      passive: true
    }
  );


  if (
    typeof ResizeObserver !==
    "undefined"
  ) {

    const resizeObserver =
      new ResizeObserver(
        schedulePrivacyLayoutSync
      );


    if (
      elements.banner
    ) {

      resizeObserver.observe(
        elements.banner
      );

    }


    if (
      elements.settingsPanel
    ) {

      resizeObserver.observe(
        elements.settingsPanel
      );

    }

  }


  schedulePrivacyLayoutSync();

}


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

   Prevents the same Suggestions context from appearing
   again after a refresh.
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


    schedulePrivacyLayoutSync();


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


  schedulePrivacyLayoutSync();

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


  document.body.dataset
    .cookieSettingsOpen =
      visible
        ? "true"
        : "false";


  schedulePrivacyLayoutSync();

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


  schedulePrivacyLayoutSync();

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


  schedulePrivacyLayoutSync();


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


  schedulePrivacyLayoutSync();

}


/*
 * Choosing a cookie preference removes the currently
 * visible Suggestions card.
 *
 * The context is still remembered as having been shown.
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
   TRACKING STATUS

   The wording changes based on what the mock website
   actually did.

   This keeps the message simple and makes the important
   privacy cases easy to remember.
   ========================================================= */

function getSuggestionDisplay(
  contextName,
  tracking
) {

  const base =
    SUGGESTION_CONTEXTS[
      contextName
    ];


  if (
    !base
  ) {

    return null;

  }


  if (
    !tracking ||
    typeof tracking !==
      "object"
  ) {

    return {
      ...base
    };

  }


  const isDeliveryLocation =
    tracking.dataCategory ===
    "mock_delivery_location";


  const isProductActivity =
    tracking.dataCategory ===
      "product_interest" ||
    tracking.dataCategory ===
      "cart_activity";


  /* =======================================================
     PRIVACY CHOICE IGNORED
     ======================================================= */

  if (
    tracking.preferenceMismatch
  ) {

    return {

      ...base,

      badge:
        "PRIVACY WARNING",

      icon:
        "⚠️",

      title:
        "This site ignored your privacy choice",

      summary:
        isDeliveryLocation
          ? "Advertising was off, but this mock site still used the delivery location for ads."
          : "Tracking was turned off, but this mock site recorded the activity anyway.",

      chips:
        isDeliveryLocation
          ? [
              "Privacy choice",
              "Location",
              "Ads"
            ]
          : [
              "Privacy choice",
              "Tracking",
              "Recorded"
            ],

      details:
        "Cookie settings show what you want, but a site can still ignore them if it does not follow your choice.",

      actionLabel:
        "Check my settings"

    };

  }


  /* =======================================================
     TRACKING BLOCKED
     ======================================================= */

  if (
    tracking.outcome ===
    "blocked"
  ) {

    return {

      ...base,

      badge:
        "BLOCKED",

      icon:
        "✓",

      title:
        tracking.preferenceState ===
          "no_cookie_decision"
          ? "This tracking was blocked"
          : isProductActivity
            ? "Your settings blocked product tracking"
            : "Your settings blocked this tracking",

      summary:
        tracking.preferenceState ===
          "no_cookie_decision"
          ? "The site tried to record this activity before you had allowed Analytics."
          : isProductActivity
            ? "The site tried to record your shopping activity, but Analytics was off."
            : "The site tried to record this activity, but the matching cookie setting was off.",

      chips:
        isProductActivity
          ? [
              "Blocked",
              "Analytics",
              "Shopping"
            ]
          : [
              "Blocked",
              "Analytics"
            ],

      details:
        "In this mock site, the analytics tracker followed your cookie choice and did not record the activity.",

      actionLabel:
        "Cookie settings"

    };

  }


  /* =======================================================
     INFORMATION REUSED FOR ANOTHER PURPOSE
     ======================================================= */

  if (
    tracking.disclosureMismatch
  ) {

    return {

      ...base,

      badge:
        "PRIVACY NOTICE",

      icon:
        "↗",

      title:
        "Your information was used in another way",

      summary:
        isDeliveryLocation
          ? "The delivery location was needed for shipping, but this mock site also used it for advertising."
          : "The site used this information for a purpose that was not clearly explained.",

      chips:
        isDeliveryLocation
          ? [
              "Location",
              "Shipping",
              "Advertising"
            ]
          : [
              "Extra use",
              "Privacy"
            ],

      details:
        "Information given for one reason can sometimes be reused for another reason. The important question is whether that extra use was clear to you.",

      actionLabel:
        "Cookie settings"

    };

  }


  /* =======================================================
     ACCOUNT-LINKED ACTIVITY
     ======================================================= */

  if (
    tracking.consentRelevant ===
    false
  ) {

    return {

      ...base,

      badge:
        "ACCOUNT ACTIVITY",

      icon:
        "🔗",

      title:
        "Your activity was linked to an account",

      summary:
        "Signing in let this mock site connect shopping activity to the demo account.",

      chips: [
        "Account",
        "Shopping",
        "Linked"
      ],

      details:
        "This kind of account activity can happen even when optional cookies are off because the site already knows which account is signed in.",

      actionLabel:
        "Cookie settings"

    };

  }


  return {
    ...base
  };

}


/* =========================================================
   ACTIONABLE ADVICE

   Only appears when the website ignores the user's privacy
   preference.

   It is phrased as advice for a real website so we do not
   encourage the participant to leave the experiment itself.
   ========================================================= */

function buildTrackingAdviceHtml(
  tracking
) {

  if (
    !tracking ||
    tracking.preferenceMismatch !==
      true
  ) {

    return "";

  }


  return `

    <div
      class="experiment-contextual-privacy-tip__advice"
      role="note"
    >

      <strong>
        What can you do?
      </strong>

      <p>
        On a real site, share less personal information. If a site ignores your privacy choices and you do not trust it, consider leaving.
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


  const tracking =
    metadata?.tracking ??
    null;


  const display =
    getSuggestionDisplay(
      contextName,
      tracking
    );


  if (
    !display
  ) {

    return false;

  }


  /*
   * Each privacy context appears once only.
   *
   * Closing it, choosing cookies, refreshing the page,
   * clicking again or focusing another field does not reset
   * it.
   */
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
   * A genuinely new context replaces an older visible
   * suggestion.
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
    "Website privacy and tracking information"
  );


  suggestion.innerHTML = `

    <div class="experiment-contextual-privacy-tip__topline">

      <div class="experiment-contextual-privacy-tip__badge-wrap">

        <span
          class="experiment-contextual-privacy-tip__icon"
          aria-hidden="true"
        >
          ${display.icon}
        </span>

        <span class="experiment-contextual-privacy-tip__badge">
          ${display.badge}
        </span>

      </div>

      <button
        type="button"
        id="dismissPrivacySuggestion"
        class="experiment-contextual-privacy-tip__dismiss"
        aria-label="Dismiss privacy tip"
      >
        ×
      </button>

    </div>

    <h3 class="experiment-contextual-privacy-tip__title">
      ${display.title}
    </h3>

    <p class="experiment-contextual-privacy-tip__summary">
      ${display.summary}
    </p>

    <div class="experiment-contextual-privacy-tip__chips">

      ${
        buildSuggestionChips(
          display.chips
        )
      }

    </div>

    ${
      buildTrackingAdviceHtml(
        tracking
      )
    }

    <div class="experiment-contextual-privacy-tip__actions">

      <button
        type="button"
        id="showPrivacyDetails"
        class="experiment-contextual-privacy-tip__learn"
        aria-expanded="false"
      >
        Why?
      </button>

      <button
        type="button"
        id="privacySuggestionSettingsButton"
        class="experiment-contextual-privacy-tip__settings"
      >
        ${display.actionLabel}
      </button>

    </div>

    <div
      id="privacySuggestionDetails"
      class="experiment-contextual-privacy-tip__details"
      hidden
    >

      <p>
        ${display.details}
      </p>

    </div>

  `;


  document.body.appendChild(
    suggestion
  );


  schedulePrivacyLayoutSync();


  /*
   * Mark the context as used immediately.
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
            : "Why?";


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


        schedulePrivacyLayoutSync();


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
   * Avoid duplicate UI and duplicate context events.
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
   PUBLIC PRIVACY CONTEXT HOOK
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


  /*
   * Remove the current suggestion after a cookie action.
   *
   * Future new contexts can still appear.
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

  ensurePrivacyInterfaceStylesheet();


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


  initialisePrivacyLayoutSync(
    elements
  );


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


  /*
   * Site 2 starts with one brief privacy tip.
   *
   * Site 3 waits for a real shopping interaction.
   */
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


  document.body.dataset
    .cookieSettingsOpen =
      "false";


  schedulePrivacyLayoutSync();

}