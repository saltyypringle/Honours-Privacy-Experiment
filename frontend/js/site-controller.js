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
 * Configuration for the task on each mock website.
 *
 * The tasks are intentionally simple and should only require
 * participants to locate one clearly visible piece of information.
 */
const SITE_CONFIGS = {
  site1: {
    siteId: "site1",

    taskId: "site1_author_lookup",

    heading: "Website task",

    prompt:
      "Who wrote the featured article?",

    options: [
      "Sarah Mitchell",
      "James Carter",
      "Emily Brown",
      "Daniel Lee"
    ],

    correctAnswer: "Sarah Mitchell",

    answerInputId: "site1TaskAnswer",

    continueButtonId: "completeTaskButton"
  },


  site2: {
    siteId: "site2",

    taskId: "site2_best_visit_months",

    heading: "Website task",

    prompt:
      "What is the best time to visit Amsterdam?",

    options: [
      "January to February",
      "March to May",
      "June to August",
      "October to December"
    ],

    correctAnswer: "March to May",

    answerInputId: "site2TaskAnswer",

    continueButtonId: "completeTaskButton"
  },


  site3: {
    siteId: "site3",

    taskId: "site3_week3_walk",

    heading: "Website task",

    prompt:
      "How long is the Week 3 walk?",

    options: [
      "20 minutes",
      "30 minutes",
      "45 minutes",
      "60 minutes"
    ],

    correctAnswer: "45 minutes",

    answerInputId: "site3TaskAnswer",

    continueButtonId: "completeTaskButton"
  },


  site4: {
    siteId: "site4",

    taskId: "site4_saturday_event_time",

    heading: "Website task",

    prompt:
      "What time does the Saturday event begin?",

    options: [
      "9:00 AM",
      "10:00 AM",
      "11:00 AM",
      "12:00 PM"
    ],

    correctAnswer: "10:00 AM",

    answerInputId: "site4TaskAnswer",

    continueButtonId: "completeTaskButton"
  }
};


/*
 * Record when the participant entered the current website.
 */
const pageStartedAt = Date.now();


/*
 * Count relevant interactions made on the current website.
 */
let relevantInteractionCount = 0;


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
  return document.body.dataset.studySite || "";
}


/**
 * Record completion information for the current website.
 *
 * @param {string} siteKey
 */
function recordSiteCompletion(siteKey) {
  logEvent(
    siteKey,
    "site_completed",
    {
      timeOnSiteMilliseconds:
        Date.now() - pageStartedAt,

      relevantInteractionCount
    }
  );
}


/**
 * Advance the participant to the next website.
 *
 * After the final website, send the participant to
 * complete.html.
 *
 * @param {string} siteKey
 */
function advanceToNextSite(siteKey) {
  const session = getSession();

  if (!session) {
    return;
  }

  recordSiteCompletion(siteKey);

  const currentIndex =
    session.siteOrder.indexOf(siteKey);

  if (currentIndex < 0) {
    console.error(
      "Current site is not in the site order."
    );

    return;
  }

  const nextIndex = currentIndex + 1;

  session.currentSiteIndex = nextIndex;

  if (nextIndex < session.siteOrder.length) {

  saveSession(session);


  /*
   * After Site 2, all participants pass through
   * the transition page before entering the
   * experimental phase.
   */
  if (siteKey === "site2") {

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
   * There are no websites remaining.
   */
  session.experimentCompleted = true;

  saveSession(session);

  logEvent(
    "experiment_end",
    "all_sites_completed",
    {
      totalExperimentTimeMilliseconds:
        Date.now() -
        session.startedAtMilliseconds
    }
  );

  window.location.assign("complete.html");
}


/**
 * Prevent links on the mock websites from taking participants
 * outside the study.
 *
 * @param {string} siteKey
 */
function blockExternalLinks(siteKey) {
  document
    .querySelectorAll(
      'a[href^="http"], a[href^="mailto:"]'
    )
    .forEach(function (link) {
      link.addEventListener(
        "click",
        function (event) {
          event.preventDefault();

          logEvent(
            siteKey,
            "external_link_selected",
            {
              linkText:
                link.textContent.trim()
            }
          );

          window.alert(
            "This link is not available on the mock website."
          );
        }
      );
    });
}


/**
 * Record relevant interface interactions.
 *
 * @param {string} siteKey
 */
function trackRelevantInteractions(siteKey) {
  document.addEventListener(
    "click",
    function (event) {
      const interactiveElement =
        event.target.closest(
          "button, a, input, select"
        );

      if (!interactiveElement) {
        return;
      }

      relevantInteractionCount += 1;

      logEvent(
        siteKey,
        "interface_interaction",
        {
          element:
            interactiveElement.tagName
              .toLowerCase(),

          action:
            interactiveElement.dataset.choice ||
            interactiveElement.id ||
            interactiveElement.textContent
              ?.trim()
              .slice(0, 80) ||
            "unknown"
        }
      );
    }
  );
}


/**
 * Initialise the current mock website.
 */
function initialiseSiteController() {
  const siteKey = getSiteKey();

  const config = SITE_CONFIGS[siteKey];

  if (!config) {
    console.error(
      "Unknown study site:",
      siteKey
    );

    return;
  }

  const session = getSession();

  if (!session) {
    document.body.innerHTML = `
      <main
        style="
          max-width: 650px;
          margin: 60px auto;
          padding: 30px;
          font-family: Arial, sans-serif;
        "
      >
        <h1>Study session not found</h1>

        <p>
          Please return to the original survey and use
          the experiment link provided there.
        </p>
      </main>
    `;

    return;
  }

  const currentIndex =
    session.siteOrder.indexOf(siteKey);

  if (currentIndex >= 0) {
    session.currentSiteIndex = currentIndex;
    saveSession(session);
  }

  logEvent(
    siteKey,
    "site_loaded",
    {
      pageTitle: document.title
    }
  );

  trackRelevantInteractions(siteKey);

  blockExternalLinks(siteKey);

  initialiseCookieInterface(siteKey);

  initialiseTaskController({
    ...config,

    onContinue: function () {
      advanceToNextSite(siteKey);
    }
  });
}


/*
 * Start the site controller.
 */
initialiseSiteController();