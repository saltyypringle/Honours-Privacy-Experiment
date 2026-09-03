"use strict";

import {
  getSession,
  saveSession,
  logEvent
} from "./experiment-core.js";

import {
  initialiseCookieInterface,
  setPrivacyContext
} from "./cookie-interface.js";

import {
  initialiseTaskController
} from "./task-controller.js";


const SITE_CONFIGS = {

  site1: {

    siteId:
      "site1",

    taskId:
      "site1_best_visit_months",

    heading:
      "Website task",

    prompt:
      "What is the best time to visit Amsterdam?",

    options: [
      "January to February",
      "March to May",
      "June to August",
      "October to December"
    ],

    correctAnswer:
      "March to May",

    answerInputId:
      "site1TaskAnswer",

    continueButtonId:
      "completeTaskButton"

  },


  site2: {

    siteId:
      "site2",

    taskId:
      "site2_7x7_meaning",

    heading:
      "Website task",

    prompt:
      'According to the website, what is the "7 × 7 = 49" trend used to describe?',

    options: [
      "Something that feels obviously attractive or right",
      "Someone who is exactly 49 years old",
      "A difficult maths problem",
      "A way of saying something is expensive"
    ],

    correctAnswer:
      "Something that feels obviously attractive or right",

    answerInputId:
      "site2TaskAnswer",

    continueButtonId:
      "completeTaskButton"

  }

};


const pageStartedAt =
  Date.now();


let relevantInteractionCount =
  0;


/* =========================================================
   SITE IDENTIFIER
   ========================================================= */

function getSiteKey() {

  return (
    document.body.dataset.studySite ||
    ""
  );

}


/* =========================================================
   SITE COMPLETION
   ========================================================= */

function recordSiteCompletion(
  siteKey
) {

  logEvent(
    siteKey,
    "site_completed",
    {

      timeOnSiteMilliseconds:
        Date.now() -
        pageStartedAt,

      relevantInteractionCount

    }
  );

}


/* =========================================================
   NAVIGATION
   ========================================================= */

function advanceToNextSite(
  siteKey
) {

  const session =
    getSession();


  if (
    !session
  ) {

    return;

  }


  recordSiteCompletion(
    siteKey
  );


  const currentIndex =
    session.siteOrder.indexOf(
      siteKey
    );


  if (
    currentIndex <
    0
  ) {

    console.error(
      "Current site is not in the site order."
    );


    return;

  }


  const nextIndex =
    currentIndex +
    1;


  session.currentSiteIndex =
    nextIndex;


  /*
   * Another site remains.
   */
  if (
    nextIndex <
    session.siteOrder.length
  ) {

    saveSession(
      session
    );


    /*
     * Site 1 and Site 2 both use transition.html.
     */
    if (
      siteKey ===
        "site1" ||
      siteKey ===
        "site2"
    ) {

      window.location.assign(
        "transition.html"
      );


      return;

    }


    window.location.assign(
      `${session.siteOrder[nextIndex]}.html`
    );


    return;

  }


  /*
   * Experiment complete.
   */
  session.experimentCompleted =
    true;


  saveSession(
    session
  );


  logEvent(
    "experiment_end",
    "all_sites_completed",
    {

      totalExperimentTimeMilliseconds:
        Date.now() -
        session.startedAtMilliseconds

    }
  );


  window.location.assign(
    "complete.html"
  );

}


/* =========================================================
   EXTERNAL LINKS
   ========================================================= */

function blockExternalLinks(
  siteKey
) {

  document
    .querySelectorAll(
      'a[href^="http"], a[href^="mailto:"]'
    )
    .forEach(
      link => {

        link.addEventListener(
          "click",
          event => {

            event.preventDefault();


            logEvent(
              siteKey,
              "external_link_selected",
              {

                linkText:
                  link.textContent
                    .trim()
                    .slice(
                      0,
                      80
                    )

              }
            );


            window.alert(
              "This link is not available on the mock website."
            );

          }
        );

      }
    );

}


/* =========================================================
   GENERAL INTERACTION LOGGING
   =========================================================
   Record structural interface interactions only.

   Values typed into form controls are never read or logged
   by this function.
   ========================================================= */

function trackRelevantInteractions(
  siteKey
) {

  document.addEventListener(
    "click",
    event => {

      if (
        !(
          event.target instanceof
          Element
        )
      ) {

        return;

      }


      const interactiveElement =
        event.target.closest(
          "button, a, input, select"
        );


      if (
        !interactiveElement
      ) {

        return;

      }


      relevantInteractionCount +=
        1;


      let action =

        interactiveElement
          .dataset
          .choice ||

        interactiveElement
          .dataset
          .action ||

        interactiveElement.id ||

        null;


      if (
        !action
      ) {

        const tagName =
          interactiveElement
            .tagName
            .toLowerCase();


        /*
         * Text from buttons and links is mock-site content
         * that we created ourselves.
         *
         * Input values are deliberately not read.
         */
        if (
          tagName ===
            "button" ||
          tagName ===
            "a"
        ) {

          action =

            interactiveElement
              .textContent
              ?.trim()
              .slice(
                0,
                80
              ) ||

            "unknown";

        }

        else {

          action =
            "form_control";

        }

      }


      logEvent(
        siteKey,
        "interface_interaction",
        {

          element:
            interactiveElement
              .tagName
              .toLowerCase(),

          action

        }
      );

    }
  );

}


/* =========================================================
   RESEARCH-INTERFACE FILTER
   =========================================================
   These controls belong to the experiment itself rather
   than the mock website.

   They must not trigger Site 2's contextual Suggestions.
   ========================================================= */

function isExperimentInterfaceElement(
  element
) {

  return Boolean(
    element.closest(
      [

        ".next-box",

        ".cookie-banner",

        ".experiment-privacy-control",

        ".experiment-contextual-privacy-tip"

      ].join(
        ", "
      )
    )
  );

}


/* =========================================================
   SITE 2 — DYNAMIC PRIVACY CONTEXT
   =========================================================

   cookie-interface.js shows:

     👀 initial_warning

   when a Suggestions participant first enters Site 2.

   Genuine mock-site interactions then trigger:

     🎯 interest_browsing


   This works BEFORE OR AFTER cookies are selected.

   Example A:

   initial warning
      ↓
   participant ignores cookies
      ↓
   clicks website content
      ↓
   warning changes to interest_browsing


   Example B:

   initial warning
      ↓
   participant chooses cookies
      ↓
   warning disappears
      ↓
   participant interacts with website
      ↓
   interest_browsing appears


   Example C:

   interest_browsing
      ↓
   participant presses ×
      ↓
   card remains closed
      ↓
   participant makes another genuine interaction
      ↓
   interest_browsing can appear again
   ========================================================= */

function initialiseSite2PrivacyContexts() {

  document.addEventListener(
    "click",
    event => {

      if (
        !(
          event.target instanceof
          Element
        )
      ) {

        return;

      }


      const interactiveElement =
        event.target.closest(
          "button, a, input, select, textarea"
        );


      if (
        !interactiveElement
      ) {

        return;

      }


      /*
       * Ignore the research task, cookies and privacy
       * assistant itself.
       */
      if (
        isExperimentInterfaceElement(
          interactiveElement
        )
      ) {

        return;

      }


      const tagName =
        interactiveElement
          .tagName
          .toLowerCase();


      /*
       * Record only structural information describing
       * what kind of mock-site control caused the context.
       *
       * We never inspect values entered by the participant.
       */
      const action =

        interactiveElement
          .dataset
          .action ||

        interactiveElement.id ||

        (
          tagName ===
            "a"

            ? "site_link"

            : tagName ===
                "button"

              ? "site_button"

              : "site_control"
        );


      setPrivacyContext(
        "site2",
        "interest_browsing",
        {

          trigger:
            "site_content_interaction",

          interactionElement:
            tagName,

          interactionAction:
            action

        }
      );

    }
  );

}


/* =========================================================
   MISSING SESSION
   ========================================================= */

function showMissingSessionMessage() {

  document.body.innerHTML = `

    <main
      style="
        max-width: 650px;
        margin: 60px auto;
        padding: 30px;
        font-family: Arial, sans-serif;
      "
    >

      <h1>
        Study session not found
      </h1>

      <p>
        Please return to the original survey and use the
        experiment link provided there.
      </p>

    </main>

  `;

}


/* =========================================================
   SITE 3 — SHOPPING CONTROLLER
   ========================================================= */

async function initialiseShoppingSite(
  siteKey
) {

  try {

    const {
      initialiseShoppingController
    } =
      await import(
        "./shopping-controller.js"
      );


    initialiseShoppingController(
      {

        siteId:
          siteKey,


        onContinue() {

          advanceToNextSite(
            siteKey
          );

        }

      }
    );

  }

  catch (
    error
  ) {

    console.error(
      "Unable to initialise the shopping website:",
      error
    );


    const message =
      document.getElementById(
        "shoppingTaskError"
      );


    if (
      message
    ) {

      message.hidden =
        false;


      message.textContent =
        "The shopping task could not be loaded. Please return to the study and try again.";

    }

  }

}


/* =========================================================
   INITIALISE CURRENT SITE
   ========================================================= */

function initialiseSiteController() {

  const siteKey =
    getSiteKey();


  if (
    ![
      "site1",
      "site2",
      "site3"
    ].includes(
      siteKey
    )
  ) {

    console.error(
      "Unknown study site:",
      siteKey
    );


    return;

  }


  const session =
    getSession();


  if (
    !session
  ) {

    showMissingSessionMessage();


    return;

  }


  const currentIndex =
    session.siteOrder.indexOf(
      siteKey
    );


  if (
    currentIndex <
    0
  ) {

    console.error(
      "Current page is not part of the active site order:",
      siteKey
    );


    return;

  }


  /*
   * Keep the session position aligned with the page.
   */
  session.currentSiteIndex =
    currentIndex;


  saveSession(
    session
  );


  /* =======================================================
     SITE LOAD EVENT
     ======================================================= */

  logEvent(
    siteKey,
    "site_loaded",
    {

      pageTitle:
        document.title

    }
  );


  /* =======================================================
     SHARED WEBSITE BEHAVIOUR
     ======================================================= */

  trackRelevantInteractions(
    siteKey
  );


  blockExternalLinks(
    siteKey
  );


  /*
   * Site 1 remains the common baseline inside
   * cookie-interface.js.
   *
   * Sites 2 and 3 use the participant's assigned
   * experimental condition.
   */
  initialiseCookieInterface(
    siteKey
  );


  /* =======================================================
     SITE 2 SUGGESTIONS
     =======================================================
     The initial_warning comes from cookie-interface.js.

     This listener supplies interest_browsing whenever the
     participant genuinely interacts with Site 2.

     Control and Automation conditions safely ignore
     setPrivacyContext().
     ======================================================= */

  if (
    siteKey ===
    "site2"
  ) {

    initialiseSite2PrivacyContexts();

  }


  /* =======================================================
     SITE 3
     ======================================================= */

  if (
    siteKey ===
    "site3"
  ) {

    initialiseShoppingSite(
      siteKey
    );


    return;

  }


  /* =======================================================
     SITES 1 + 2 STANDARD TASKS
     ======================================================= */

  const config =
    SITE_CONFIGS[
      siteKey
    ];


  if (
    !config
  ) {

    console.error(
      "No task configuration exists for:",
      siteKey
    );


    return;

  }


  initialiseTaskController(
    {

      ...config,


      onContinue() {

        advanceToNextSite(
          siteKey
        );

      }

    }
  );

}


/* =========================================================
   START
   ========================================================= */

initialiseSiteController();