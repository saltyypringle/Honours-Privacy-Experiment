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
} from "./js/task-controller.js";

const SITE_CONFIGS = {
  site1: {
    siteId: "site1",
    taskId: "site1_author_lookup",
    heading: "Website task",

    prompt:
      "Find the author of the featured article titled " +
      "“Breaking: Major Economic Shifts Reshape Global Markets”",

    correctAnswer: "Sarah Mitchell",
    answerInputId: "site1TaskAnswer",
    continueButtonId: "completeTaskButton"
  },

  site2: {
    siteId: "site2",
    taskId: "site2_best_visit_months",
    heading: "Website task",

    prompt:
      "According to the Amsterdam destination guide, " +
      "what months are identified as the best time to visit?",

    correctAnswer: "March to May",
    answerInputId: "site2TaskAnswer",
    continueButtonId: "completeTaskButton"
  },

  site3: {
    siteId: "site3",
    taskId: "site3_week3_activity",
    heading: "Website task",

    prompt:
      "According to the beginner walking plan, " +
      "what additional activity is recommended in Week 3?",

    correctAnswer: "Add one 45-minute walk",
    answerInputId: "site3TaskAnswer",
    continueButtonId: "completeTaskButton"
  }
};

const pageStartedAt = Date.now();

let relevantInteractionCount = 0;

function getSiteKey() {
  return document.body.dataset.studySite || "";
}

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

    window.location.assign(
      `${session.siteOrder[nextIndex]}.html`
    );

    return;
  }

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

initialiseSiteController();