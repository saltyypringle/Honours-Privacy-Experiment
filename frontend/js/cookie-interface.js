"use strict";

import {
  getSession,
  logEvent
} from "./experiment-core.js";

const CONSENT_STORAGE_PREFIX =
  "privacyExperimentConsent:";

/*
 * Revised experiment design:
 *
 * Site 1 = common baseline.
 * Sites 2 and 3 = assigned experimental treatment.
 */
const BASELINE_SITES =
  new Set([
    "site1"
  ]);


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


function getConsentStorageKey(
  siteId
) {

  return (
    `${CONSENT_STORAGE_PREFIX}${siteId}`
  );

}


/**
 * Milliseconds since this page navigation began.
 */
function getNavigationElapsedMilliseconds() {

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


function getMonotonicTimestamp() {

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
      getMonotonicTimestamp() -
      startedAt
    )
  );

}


/**
 * Determine how much of the website task had been
 * completed when the cookie decision occurred.
 *
 * Sites 1 and 2:
 * 0 = website task not completed
 * 1 = website task completed
 *
 * Site 3:
 * 0 = no shopping tasks completed
 * 1 = product task complete
 * 2 = login task complete
 * 3 = all shopping tasks complete
 */
function getTaskProgressAtDecision(
  siteId
) {

  /*
   * Site 3 shopping controller maintains
   * this body dataset value.
   */
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


    if (
      Number.isFinite(
        progress
      )
    ) {

      return Math.max(
        0,
        Math.min(
          3,
          Math.trunc(
            progress
          )
        )
      );

    }


    return 0;

  }


  /*
   * Sites 1 and 2 each contain one task.
   */
  const session =
    getSession();


  const responses =
    Array.isArray(
      session?.taskResponses
    )
      ? session.taskResponses
      : [];


  return responses.some(
    function (
      response
    ) {

      return (
        response.siteId ===
        siteId
      );

    }
  )
    ? 1
    : 0;

}


/**
 * Keep cookie settings in one consistent format.
 */
function normaliseSettings(
  settings
) {

  return {

    necessary:
      true,

    functional:
      Boolean(
        settings?.functional
      ),

    analytics:
      Boolean(
        settings?.analytics
      ),

    advertising:
      Boolean(
        settings?.advertising
      )

  };

}


/**
 * Check whether a participant actually changed an
 * automatically applied preference.
 *
 * Merely opening Review or change and saving the
 * same settings should NOT count as an override.
 */
function decisionsAreEquivalent(
  existingDecision,
  choice,
  settings
) {

  if (!existingDecision) {

    return false;

  }


  const existingSettings =
    normaliseSettings(
      existingDecision.settings
    );


  const nextSettings =
    normaliseSettings(
      settings
    );


  return (

    existingDecision.choice ===
      choice &&

    existingSettings.functional ===
      nextSettings.functional &&

    existingSettings.analytics ===
      nextSettings.analytics &&

    existingSettings.advertising ===
      nextSettings.advertising

  );

}


/* =========================================================
   COOKIE ELEMENTS
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
   BANNER VISIBILITY
   ========================================================= */

/**
 * IMPORTANT:
 *
 * styles.css contains a later rule that applies
 * display: grid !important to the cookie banner.
 *
 * Therefore simply adding the "hidden" class is not
 * always sufficient.
 *
 * This helper explicitly applies:
 *
 * display: none !important
 *
 * when the banner should close.
 */
function setBannerVisible(
  banner,
  visible
) {

  if (!banner) {

    return;

  }


  if (visible) {

    banner.classList.remove(
      "hidden"
    );


    banner.style.removeProperty(
      "display"
    );

  }

  else {

    banner.classList.add(
      "hidden"
    );


    banner.style.setProperty(
      "display",
      "none",
      "important"
    );

  }

}


/* =========================================================
   SAVED COOKIE DECISIONS
   ========================================================= */

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

  }

  catch (
    error
  ) {

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


function saveDecision(
  siteId,
  choice,
  settings,
  source,
  context
) {

  const decision = {

    choice,

    settings:
      normaliseSettings(
        settings
      ),

    source,

    assignedCondition:
      context.assignedCondition,

    interfaceCondition:
      context.interfaceCondition,

    phase:
      context.phase,

    savedAt:
      new Date()
        .toISOString()

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


function populateSettings(
  elements,
  settings
) {

  if (
    elements.functionalCheckbox
  ) {

    elements.functionalCheckbox.checked =
      Boolean(
        settings.functional
      );

  }


  if (
    elements.analyticsCheckbox
  ) {

    elements.analyticsCheckbox.checked =
      Boolean(
        settings.analytics
      );

  }


  if (
    elements.advertisingCheckbox
  ) {

    elements.advertisingCheckbox.checked =
      Boolean(
        settings.advertising
      );

  }

}


function getChoiceLabel(
  choice
) {

  switch (
    choice
  ) {

    case "accept_all":
      return "Accept all cookies";

    case "reject_optional":
      return "Reject optional cookies";

    case "custom":
      return "Custom cookie settings";

    default:
      return "Cookie preference";

  }

}


/* =========================================================
   COOKIE DECISION CONFIRMATION
   ========================================================= */

/**
 * Briefly tell the participant that the cookie
 * preference was successfully saved.
 *
 * Styling is kept here so this fix does not require
 * another edit to styles.css.
 */
function showCookieDecisionConfirmation(
  choice
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


  confirmation.setAttribute(
    "role",
    "status"
  );


  confirmation.setAttribute(
    "aria-live",
    "polite"
  );


  confirmation.textContent =
    `Cookie preference saved: ${getChoiceLabel(choice)}`;


  Object.assign(
    confirmation.style,
    {

      position:
        "fixed",

      left:
        "50%",

      bottom:
        "22px",

      zIndex:
        "6500",

      maxWidth:
        "calc(100vw - 32px)",

      padding:
        "11px 16px",

      border:
        "1px solid #b7c9b9",

      borderRadius:
        "8px",

      background:
        "#f2faf4",

      color:
        "#31533a",

      boxShadow:
        "0 10px 30px rgba(15, 23, 42, 0.16)",

      fontFamily:
        'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',

      fontSize:
        "0.84rem",

      fontWeight:
        "700",

      textAlign:
        "center",

      pointerEvents:
        "none",

      transform:
        "translateX(-50%)"

    }
  );


  document.body.appendChild(
    confirmation
  );


  window.setTimeout(
    function () {

      confirmation.remove();

    },
    2200
  );

}


/* =========================================================
   PRIVACY SUGGESTION CLEAN-UP
   ========================================================= */

function removePrivacySuggestion() {

  const suggestion =
    document.getElementById(
      "privacySuggestion"
    );


  if (!suggestion) {

    return;

  }


  if (
    typeof suggestion.__privacyCleanup ===
    "function"
  ) {

    suggestion.__privacyCleanup();

  }


  suggestion.remove();

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


        /*
         * Re-open the normal cookie footer.
         */
        setBannerVisible(
          elements.banner,
          true
        );


        /*
         * Populate checkboxes with the current
         * automated choice.
         */
        populateSettings(
          elements,
          decision.settings
        );


        /*
         * Show the detailed settings immediately
         * so the participant can review them.
         */
        elements
          .settingsPanel
          ?.classList
          .add(
            "visible"
          );


        notifyCookieInterfaceOpened(
          siteId
        );


        logInterfaceEvent(
          siteId,
          "automation_choice_reviewed",
          context,
          {

            existingChoice:
              decision.choice,

            taskProgressAtReview:
              getTaskProgressAtDecision(
                siteId
              ),

            timeFromSiteLoadToReviewMilliseconds:
              getNavigationElapsedMilliseconds()

          }
        );

      }
    );

}


/* =========================================================
   SUGGESTIONS CONDITION
   ========================================================= */

/**
 * Site 2:
 * general optional-cookie explanation.
 *
 * Site 3:
 * shopping-specific optional-cookie explanation.
 */
function getSuggestionTopic(
  siteId
) {

  return siteId ===
    "site3"

    ? "shopping_cookie_uses"

    : "data_collection";

}


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
    getSuggestionTopic(
      siteId
    );


  /* =====================================================
     SITE 3 — SHOPPING-SPECIFIC SUGGESTION
     ===================================================== */

  if (
    suggestionTopic ===
    "shopping_cookie_uses"
  ) {

    suggestion.innerHTML = `
      <div class="experiment-privacy-snapshot__heading">

        <strong>
          How might optional cookies be used while you shop?
        </strong>

        <button
          type="button"
          id="dismissPrivacySuggestion"
          aria-label="Dismiss privacy tip"
        >
          ×
        </button>

      </div>


      <p class="experiment-privacy-summary">

        Shopping sites may use optional cookies to understand
        which products you view, measure how you use the site
        and personalise recommendations or advertising.

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

        <div class="experiment-privacy-learning-grid">


          <div class="experiment-privacy-learning-item">

            <strong>
              Necessary
            </strong>

            <span>
              Support core functions such as keeping an item
              in the cart and moving through checkout.
            </span>

          </div>


          <div class="experiment-privacy-learning-item">

            <strong>
              Functional
            </strong>

            <span>
              Can remember choices or preferences while using
              the shopping website.
            </span>

          </div>


          <div class="experiment-privacy-learning-item">

            <strong>
              Analytics
            </strong>

            <span>
              Can help measure product views, clicks and
              other website interactions.
            </span>

          </div>


          <div class="experiment-privacy-learning-item">

            <strong>
              Advertising
            </strong>

            <span>
              Can use browsing interests to personalise ads,
              recommendations or related content.
            </span>

          </div>


        </div>

      </div>
    `;

  }


  /* =====================================================
     SITE 2 — GENERAL DATA-COLLECTION SUGGESTION
     ===================================================== */

  else {

    suggestion.innerHTML = `
      <div class="experiment-privacy-snapshot__heading">

        <strong>
          What can optional cookies learn about your visit?
        </strong>

        <button
          type="button"
          id="dismissPrivacySuggestion"
          aria-label="Dismiss privacy tip"
        >
          ×
        </button>

      </div>


      <p class="experiment-privacy-summary">

        Optional cookies and related tracking can help a
        website understand your

        <strong>browsing activity</strong>,

        <strong>device information</strong>,

        <strong>approximate location</strong>

        and

        <strong>interests inferred from browsing</strong>.

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

        <div class="experiment-privacy-learning-grid">


          <div class="experiment-privacy-learning-item">

            <strong>
              Browsing activity
            </strong>

            <span>
              Pages viewed, clicks and time spent on parts
              of a website.
            </span>

          </div>


          <div class="experiment-privacy-learning-item">

            <strong>
              Device information
            </strong>

            <span>
              Information such as browser, operating system
              and device type.
            </span>

          </div>


          <div class="experiment-privacy-learning-item">

            <strong>
              Approximate location
            </strong>

            <span>
              A general location such as country, region
              or approximate city.
            </span>

          </div>


          <div class="experiment-privacy-learning-item">

            <strong>
              Inferred interests
            </strong>

            <span>
              Topics or products associated with patterns
              in browsing activity.
            </span>

          </div>


        </div>

      </div>
    `;

  }


  /*
   * Put the separate privacy card in the page.
   */
  document.body.appendChild(
    suggestion
  );


  /*
   * Keep the card immediately above the
   * persistent cookie footer.
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
   * Timestamp for Suggestions exposure.
   */
  const shownAt =
    getMonotonicTimestamp();


  logInterfaceEvent(
    siteId,
    "privacy_suggestion_shown",
    context,
    {

      suggestionTopic,

      taskProgressAtExposure:
        getTaskProgressAtDecision(
          siteId
        ),

      timeFromSiteLoadToSuggestionMilliseconds:
        getNavigationElapsedMilliseconds()

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


  /* =======================================================
     OPEN / CLOSE SUGGESTION DETAILS
     ======================================================= */

  detailsButton
    ?.addEventListener(
      "click",
      function () {

        const opening =
          details.hidden;


        details.hidden =
          !opening;


        suggestion
          .classList
          .toggle(
            "is-expanded",
            opening
          );


        detailsButton.textContent =
          opening
            ? "Show less"
            : "Learn what this means";


        detailsButton.setAttribute(
          "aria-expanded",
          opening
            ? "true"
            : "false"
        );


        logInterfaceEvent(
          siteId,

          opening
            ? "privacy_suggestion_opened"
            : "privacy_suggestion_closed",

          context,

          {

            suggestionTopic,

            taskProgressAtInteraction:
              getTaskProgressAtDecision(
                siteId
              ),

            timeSinceSuggestionShownMilliseconds:
              elapsedSince(
                shownAt
              )

          }
        );

      }
    );


  /* =======================================================
     DISMISS SUGGESTION
     ======================================================= */

  dismissButton
    ?.addEventListener(
      "click",
      function () {

        const timeSinceShown =
          elapsedSince(
            shownAt
          );


        removePrivacySuggestion();


        logInterfaceEvent(
          siteId,
          "privacy_suggestion_dismissed",
          context,
          {

            suggestionTopic,

            taskProgressAtDismissal:
              getTaskProgressAtDecision(
                siteId
              ),

            timeSinceSuggestionShownMilliseconds:
              timeSinceShown

          }
        );

      }
    );


  /*
   * Return timestamp so cookie-choice timing
   * can be measured from Suggestions exposure.
   */
  return shownAt;

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


  const interfaceInitialisedAt =
    getMonotonicTimestamp();


  /*
   * Only populated for Suggestions participants.
   */
  let suggestionShownAt =
    null;


  logInterfaceEvent(
    siteId,
    "interface_initialised",
    context,
    {

      timeFromSiteLoadMilliseconds:
        getNavigationElapsedMilliseconds()

    }
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


    const normalisedSettings =
      normaliseSettings(
        settings
      );


    const isInitialDecision =
      !existingDecision;


    /*
     * A manual save following Automation counts as an
     * override only when the actual decision changed.
     */
    const automationOverride =

      context.interfaceCondition ===
        "automation" &&

      source ===
        "manual" &&

      existingDecision?.source ===
        "automation" &&

      !decisionsAreEquivalent(
        existingDecision,
        choice,
        normalisedSettings
      );


    /*
     * Record the task state at the precise point
     * the cookie decision is completed.
     */
    const taskProgressAtDecision =
      getTaskProgressAtDecision(
        siteId
      );


    const decision =
      saveDecision(
        siteId,
        choice,
        normalisedSettings,
        source,
        context
      );


    /*
     * Close cookie footer.
     *
     * setBannerVisible() deliberately uses an inline
     * !important rule because styles.css currently
     * contains display:grid!important.
     */
    setBannerVisible(
      elements.banner,
      false
    );


    /*
     * Close Customise settings.
     */
    elements
      .settingsPanel
      ?.classList
      .remove(
        "visible"
      );


    /*
     * Suggestions disappear when the cookie decision
     * has been completed.
     */
    removePrivacySuggestion();


    notifyCookieInterfaceClosed(
      siteId
    );


    /*
     * Manual decisions receive a short visual confirmation.
     *
     * Automated decisions already receive the separate
     * Saved preference applied notice.
     */
    if (
      source ===
      "manual"
    ) {

      showCookieDecisionConfirmation(
        choice
      );

    }


    logInterfaceEvent(
      siteId,
      "cookie_choice",
      context,
      {

        /*
         * Was a cookie decision made?
         */
        decisionMade:
          true,


        /*
         * Accept / Reject / Custom.
         */
        choice,


        settings:
          normalisedSettings,


        source,


        /*
         * Initial choice vs later review.
         */
        isInitialDecision,


        /*
         * Automation only.
         */
        automationOverride,


        /*
         * Task progress when cookies were handled.
         */
        taskProgressAtDecision,


        /*
         * Site load → cookie decision.
         */
        timeFromSiteLoadToDecisionMilliseconds:
          getNavigationElapsedMilliseconds(),


        /*
         * Cookie-interface initialisation → decision.
         */
        timeFromInterfaceInitialisationToDecisionMilliseconds:
          elapsedSince(
            interfaceInitialisedAt
          ),


        /*
         * Suggestions exposure → decision.
         *
         * Null for Control and Automation.
         */
        timeFromSuggestionShownToDecisionMilliseconds:
          Number.isFinite(
            suggestionShownAt
          )
            ? elapsedSince(
                suggestionShownAt
              )
            : null

      }
    );


    /*
     * After manually reviewing an Automation choice,
     * return to the Automation status notice.
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

        const opening =
          !elements
            .settingsPanel
            ?.classList
            .contains(
              "visible"
            );


        elements
          .settingsPanel
          ?.classList
          .toggle(
            "visible"
          );


        /*
         * Record actual openings rather than every click.
         */
        if (opening) {

          notifyCookieInterfaceOpened(
            siteId
          );


          logInterfaceEvent(
            siteId,
            "cookie_settings_opened",
            context,
            {

              taskProgressAtOpen:
                getTaskProgressAtDecision(
                  siteId
                ),

              timeFromSiteLoadToOpenMilliseconds:
                getNavigationElapsedMilliseconds()

            }
          );

        }

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


  /*
   * This is mainly used when the participant refreshes
   * a website after already making its cookie decision.
   */
  if (existingDecision) {

    setBannerVisible(
      elements.banner,
      false
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
     AUTOMATION CONDITION
     ======================================================= */

  if (
    context.interfaceCondition ===
    "automation"
  ) {

    const preference =
      session.automationPreference;


    /*
     * Safety fallback:
     *
     * An Automation participant should normally have
     * selected a preference after Site 1.
     *
     * If none exists, show the normal manual footer.
     */
    if (!preference) {

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
            getNavigationElapsedMilliseconds()

        }
      );


      logInterfaceEvent(
        siteId,
        "cookie_banner_shown",
        context,
        {

          taskProgressAtExposure:
            getTaskProgressAtDecision(
              siteId
            ),

          timeFromSiteLoadMilliseconds:
            getNavigationElapsedMilliseconds()

        }
      );


      return;

    }


    /*
     * The transition page stores the preference using
     * these top-level fields:
     *
     * choice
     * functional
     * analytics
     * advertising
     */
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
     * Apply the saved preference immediately.
     */
    const decision =
      completeDecision(
        preference.choice,
        settings,
        "automation"
      );


    /*
     * Show status and allow review/change.
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
          decision.settings,

        taskProgressAtApplication:
          getTaskProgressAtDecision(
            siteId
          ),

        timeFromSiteLoadToApplicationMilliseconds:
          getNavigationElapsedMilliseconds()

      }
    );


    return;

  }


  /* =======================================================
     CONTROL + SUGGESTIONS
     ======================================================= */

  /*
   * Manual cookie footer appears immediately.
   */
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
        getTaskProgressAtDecision(
          siteId
        ),

      timeFromSiteLoadMilliseconds:
        getNavigationElapsedMilliseconds()

    }
  );


  /*
   * Site 1 is always baseline/control.
   *
   * Therefore Suggestions appears only on:
   *
   * Site 2
   * Site 3
   */
  if (
    context.interfaceCondition ===
    "suggestions"
  ) {

    suggestionShownAt =
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