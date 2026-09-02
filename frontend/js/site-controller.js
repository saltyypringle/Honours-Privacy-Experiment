"use strict";

import {
  getSession,
  saveSession,
  logEvent
} from "./experiment-core.js";

import {
  initialiseCookieInterface
} from "./cookie-interface.js";

import {
  initialiseTaskController
} from "./task-controller.js";


/*
 * Multiple-choice task configuration.
 *
 * Site 1 = PlainPath Travel
 *          Common baseline.
 *
 * Site 2 = VibeCheck / 7 × 7 = 49
 *          First experimental website.
 *
 * Site 3 = BOXDROP Collectibles
 *          Interactive shopping tasks.
 *          These are handled separately by
 *          shopping-controller.js.
 */
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


/*
 * Record the time at which the participant
 * entered the current website.
 */
const pageStartedAt =
  Date.now();


/*
 * Count relevant interactions made on the
 * current website.
 */
let relevantInteractionCount =
  0;


/**
 * Get the study site identifier from the HTML body.
 *
 * Example:
 *
 * <body data-study-site="site1">
 *
 * @returns {string}
 */
function getSiteKey() {

  return (
    document.body.dataset.studySite ||
    ""
  );

}


/**
 * Record completion information for the
 * current website.
 *
 * @param {string} siteKey
 */
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


/**
 * Advance the participant through the
 * revised three-site experiment.
 *
 * Site 1
 *   ↓
 * transition.html
 *   ↓
 * Site 2
 *   ↓
 * transition.html
 *   ↓
 * Site 3
 *   ↓
 * complete.html
 *
 * @param {string} siteKey
 */
function advanceToNextSite(
  siteKey
) {

  const session =
    getSession();


  if (!session) {

    return;

  }


  /*
   * Record completion of the website
   * that the participant is leaving.
   */
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
    currentIndex + 1;


  session.currentSiteIndex =
    nextIndex;


  /*
   * Another website remains.
   */
  if (
    nextIndex <
    session.siteOrder.length
  ) {

    saveSession(
      session
    );


    /*
     * Both Site 1 and Site 2 are followed
     * by transition.html.
     *
     * transition.html determines which
     * transition screen to display using
     * session.currentSiteIndex.
     */
    if (
      siteKey === "site1" ||
      siteKey === "site2"
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
   * No websites remain.
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


/**
 * Prevent links on the mock websites from
 * taking participants outside the study.
 *
 * @param {string} siteKey
 */
function blockExternalLinks(
  siteKey
) {

  document
    .querySelectorAll(
      'a[href^="http"], a[href^="mailto:"]'
    )
    .forEach(
      function (
        link
      ) {

        link.addEventListener(
          "click",
          function (
            event
          ) {

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


/**
 * Record relevant interface interactions.
 *
 * IMPORTANT:
 *
 * This deliberately records only structural
 * information about the interface.
 *
 * It does NOT record the value typed into
 * form inputs.
 *
 * This becomes particularly important on the
 * BOXDROP shopping website.
 *
 * @param {string} siteKey
 */
function trackRelevantInteractions(
  siteKey
) {

  document.addEventListener(
    "click",
    function (
      event
    ) {

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


      /*
       * Prefer an experiment-defined action
       * identifier where one exists.
       */
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
         * Button and link text is safe because
         * it is text we placed on the website.
         *
         * We deliberately do NOT read text/value
         * from input fields.
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


/**
 * Display an error when a participant reaches
 * a mock website without an active session.
 */
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
        Please return to the original survey and use
        the experiment link provided there.
      </p>

    </main>

  `;

}


/**
 * Initialise Site 3's action-based shopping tasks.
 *
 * The dynamic import is deliberate.
 *
 * It means Site 1 and Site 2 continue working while
 * we are developing shopping-controller.js.
 *
 * Once Site 3 exists, shopping-controller.js will
 * expose initialiseShoppingController().
 *
 * @param {string} siteKey
 */
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


        /*
         * Site 3 calls this after all
         * three shopping tasks are complete
         * and the participant presses Finish.
         */
        onContinue:
          function () {

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


    /*
     * Site 3 will contain this element.
     *
     * If the shopping controller cannot load during
     * development, a readable error can be shown.
     */
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


/**
 * Initialise the current mock website.
 */
function initialiseSiteController() {

  const siteKey =
    getSiteKey();


  /*
   * Only these three sites exist in the
   * revised experiment.
   */
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


  /*
   * Make sure this page belongs to the
   * active experiment.
   */
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
   * Keep the participant's current position
   * in sync with the website being displayed.
   */
  session.currentSiteIndex =
    currentIndex;


  saveSession(
    session
  );


  /*
   * Record arrival on the website.
   *
   * The timestamp recorded by logEvent() will
   * later let us calculate time from website
   * load to cookie decision.
   */
  logEvent(
    siteKey,
    "site_loaded",
    {

      pageTitle:
        document.title

    }
  );


  /*
   * Begin general interaction tracking.
   */
  trackRelevantInteractions(
    siteKey
  );


  /*
   * Block links that would leave the
   * mock experiment.
   */
  blockExternalLinks(
    siteKey
  );


  /*
   * Initialise the cookie interface immediately
   * when every website loads.
   */
  initialiseCookieInterface(
    siteKey
  );


  /*
   * SITE 3
   *
   * BOXDROP uses real website actions to complete
   * tasks instead of multiple-choice questions.
   */
  if (
    siteKey ===
    "site3"
  ) {

    initialiseShoppingSite(
      siteKey
    );


    return;

  }


  /*
   * SITES 1 AND 2
   *
   * These continue to use the standard
   * multiple-choice task controller.
   */
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


      onContinue:
        function () {

          advanceToNextSite(
            siteKey
          );

        }

    }
  );

}


/*
 * Start the site controller.
 */
initialiseSiteController();