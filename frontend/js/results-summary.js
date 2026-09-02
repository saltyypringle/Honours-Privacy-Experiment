"use strict";

import {
  getSession,
  getEvents
} from "./experiment-core.js";


const SITE_IDS = [
  "site1",
  "site2",
  "site3"
];


const INFORMATION_SITE_IDS = [
  "site1",
  "site2"
];


/* =========================================================
   BASIC HELPERS
   ========================================================= */

/**
 * Check whether a value is a normal object.
 */
function isObject(
  value
) {

  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  );

}


/**
 * Safely retrieve the object stored in an event.
 */
function getEventValue(
  event
) {

  return isObject(
    event?.eventValue
  )
    ? event.eventValue
    : {};

}


/**
 * Return all events matching a site and event type.
 */
function getMatchingEvents(
  events,
  siteId,
  eventType
) {

  return events.filter(
    function (
      event
    ) {

      return (
        event.siteId ===
          siteId &&
        event.eventType ===
          eventType
      );

    }
  );

}


/**
 * Return the first matching event.
 */
function getFirstEvent(
  events,
  siteId,
  eventType
) {

  return (
    getMatchingEvents(
      events,
      siteId,
      eventType
    )[0] ??
    null
  );

}


/**
 * Return the most recent matching event.
 */
function getLastEvent(
  events,
  siteId,
  eventType
) {

  const matches =
    getMatchingEvents(
      events,
      siteId,
      eventType
    );


  return matches.length >
    0

    ? matches[
        matches.length - 1
      ]

    : null;

}


/**
 * Count matching events.
 */
function countEvents(
  events,
  siteId,
  eventType
) {

  return getMatchingEvents(
    events,
    siteId,
    eventType
  ).length;

}


/**
 * Return a finite numeric value or null.
 */
function finiteOrNull(
  value
) {

  return Number.isFinite(
    value
  )
    ? value
    : null;

}


/**
 * Return a boolean or null.
 */
function booleanOrNull(
  value
) {

  return typeof value ===
    "boolean"

    ? value

    : null;

}


/* =========================================================
   STANDARD TASK RESPONSES
   Sites 1 and 2
   ========================================================= */

/**
 * Retrieve the stored task response for one website.
 */
function getTaskResponse(
  session,
  siteId
) {

  const responses =
    Array.isArray(
      session.taskResponses
    )
      ? session.taskResponses
      : [];


  for (
    let index =
      responses.length - 1;

    index >=
      0;

    index -=
      1
  ) {

    if (
      responses[index]
        .siteId ===
      siteId
    ) {

      return responses[
        index
      ];

    }

  }


  return null;

}


/* =========================================================
   SITE 3 — SHOPPING SUMMARY
   ========================================================= */

/**
 * Build the behavioural summary for BOXDROP.
 *
 * Importantly, this reads only experiment events and
 * safe shopping state. No form contents are used.
 */
function buildShoppingSummary(
  session,
  events
) {

  const siteId =
    "site3";


  const completedEvents =
    getMatchingEvents(
      events,
      siteId,
      "shopping_task_completed"
    );


  /**
   * Find one successfully completed shopping task.
   */
  function getCompletedTask(
    taskNumber
  ) {

    return (
      completedEvents.find(
        function (
          event
        ) {

          const value =
            getEventValue(
              event
            );


          return (
            value.taskNumber ===
              taskNumber &&
            value.success ===
              true
          );

        }
      ) ??
      null
    );

  }


  const task1 =
    getCompletedTask(
      1
    );


  const task2 =
    getCompletedTask(
      2
    );


  const task3 =
    getCompletedTask(
      3
    );


  const loginAttempts =
    getMatchingEvents(
      events,
      siteId,
      "demo_login_attempt"
    );


  const deliverySelections =
    getMatchingEvents(
      events,
      siteId,
      "delivery_option_selected"
    );


  const finalDeliverySelection =

    deliverySelections.length >
      0

      ? deliverySelections[
          deliverySelections.length -
          1
        ]

      : null;


  const finalDeliveryValue =
    getEventValue(
      finalDeliverySelection
    );


  /*
   * Only safe shopping state is stored
   * in session.shoppingState.
   */
  const storedState =

    isObject(
      session.shoppingState
    )

      ? session.shoppingState

      : {};


  const completedTaskCount =

    [
      task1,
      task2,
      task3
    ]
      .filter(
        Boolean
      )
      .length;


  const finalTaskProgress =

    Number.isFinite(
      storedState.taskProgress
    )

      ? Math.max(
          0,

          Math.min(
            3,

            Math.trunc(
              storedState.taskProgress
            )
          )
        )

      : completedTaskCount;


  return {

    /*
     * Final stage reached:
     *
     * 0 = none
     * 1 = product task
     * 2 = product + login
     * 3 = all shopping tasks
     */
    task_progress:
      finalTaskProgress,


    completed_task_count:
      completedTaskCount,


    /* -------------------------
       SHOPPING TASK 1
       ------------------------- */

    task_1_completed:
      Boolean(
        task1
      ),


    task_1_completed_at:
      task1?.timestamp ??
      null,


    task_1_product_id:
      getEventValue(
        task1
      ).productId ??
      null,


    /* -------------------------
       SHOPPING TASK 2
       ------------------------- */

    task_2_completed:
      Boolean(
        task2
      ),


    task_2_completed_at:
      task2?.timestamp ??
      null,


    /* -------------------------
       SHOPPING TASK 3
       ------------------------- */

    task_3_completed:
      Boolean(
        task3
      ),


    task_3_completed_at:
      task3?.timestamp ??
      null,


    all_tasks_completed:
      Boolean(
        task1 &&
        task2 &&
        task3
      ),


    /* -------------------------
       PRODUCT BROWSING
       ------------------------- */

    product_view_count:
      countEvents(
        events,
        siteId,
        "product_viewed"
      ),


    product_add_count:
      countEvents(
        events,
        siteId,
        "product_added_to_cart"
      ),


    /* -------------------------
       DEMO LOGIN
       ------------------------- */

    demo_login_attempt_count:
      loginAttempts.length,


    demo_login_failed_attempt_count:

      loginAttempts.filter(
        function (
          event
        ) {

          return (
            getEventValue(
              event
            ).success ===
            false
          );

        }
      ).length,


    /* -------------------------
       CHECKOUT
       ------------------------- */

    checkout_started:

      countEvents(
        events,
        siteId,
        "checkout_started"
      ) >
      0,


    checkout_start_count:

      countEvents(
        events,
        siteId,
        "checkout_started"
      ),


    delivery_details_submitted:

      countEvents(
        events,
        siteId,
        "delivery_details_submitted"
      ) >
      0,


    delivery_option_attempt_count:
      deliverySelections.length,


    final_delivery_option:
      finalDeliveryValue
        .option ??
      null,


    final_delivery_correct:
      booleanOrNull(
        finalDeliveryValue
          .correct
      ),


    shopping_site_finished:

      countEvents(
        events,
        siteId,
        "shopping_site_finished"
      ) >
      0

  };

}


/* =========================================================
   COOKIE / PRIVACY SUMMARY
   ========================================================= */

/**
 * Build the cookie-decision summary for one website.
 *
 * We retain both:
 *
 * - initial decision; and
 * - final decision.
 *
 * This matters for Automation because an automatic
 * preference can later be reviewed or changed.
 */
function buildCookieSummary(
  siteId,
  events
) {

  const cookieEvents =
    getMatchingEvents(
      events,
      siteId,
      "cookie_choice"
    );


  const firstCookieEvent =
    cookieEvents[0] ??
    null;


  const finalCookieEvent =

    cookieEvents.length >
      0

      ? cookieEvents[
          cookieEvents.length -
          1
        ]

      : null;


  const firstCookieValue =
    getEventValue(
      firstCookieEvent
    );


  const finalCookieValue =
    getEventValue(
      finalCookieEvent
    );


  const cookieSettings =

    isObject(
      finalCookieValue.settings
    )

      ? finalCookieValue.settings

      : {};


  /* =======================================================
     CUSTOMISE
     ======================================================= */

  const settingsOpenCount =

    countEvents(
      events,
      siteId,
      "cookie_settings_opened"
    );


  /* =======================================================
     SUGGESTIONS
     ======================================================= */

  const suggestionShownEvent =

    getFirstEvent(
      events,
      siteId,
      "privacy_suggestion_shown"
    );


  const suggestionValue =

    getEventValue(
      suggestionShownEvent
    );


  const suggestionOpenCount =

    countEvents(
      events,
      siteId,
      "privacy_suggestion_opened"
    );


  const suggestionDismissCount =

    countEvents(
      events,
      siteId,
      "privacy_suggestion_dismissed"
    );


  /* =======================================================
     AUTOMATION
     ======================================================= */

  const automationReviewCount =

    countEvents(
      events,
      siteId,
      "automation_choice_reviewed"
    );


  /*
   * If the participant changed an automated preference
   * at least once, this remains true even if they later
   * open the interface again.
   */
  const automationOverride =

    cookieEvents.some(
      function (
        event
      ) {

        return (
          getEventValue(
            event
          )
            .automationOverride ===
          true
        );

      }
    );


  const automationAppliedEvent =

    getFirstEvent(
      events,
      siteId,
      "automation_preference_applied"
    );


  const automationAppliedValue =

    getEventValue(
      automationAppliedEvent
    );


  return {

    /* =====================================================
       CORE COOKIE VARIABLES
       ===================================================== */

    /*
     * 1. Did a cookie decision occur?
     */
    cookie_decision_made:
      Boolean(
        firstCookieEvent
      ),


    /*
     * Initial choice.
     *
     * Particularly useful for Automation.
     */
    cookie_initial_choice:
      firstCookieValue
        .choice ??
      null,


    cookie_initial_source:
      firstCookieValue
        .source ??
      null,


    /*
     * Final recorded choice.
     *
     * For Control/Suggestions this will normally
     * be identical to the initial choice.
     *
     * For Automation it may differ if overridden.
     */
    cookie_choice:
      finalCookieValue
        .choice ??
      null,


    cookie_source:
      finalCookieValue
        .source ??
      null,


    cookie_functional:
      booleanOrNull(
        cookieSettings
          .functional
      ),


    cookie_analytics:
      booleanOrNull(
        cookieSettings
          .analytics
      ),


    cookie_advertising:
      booleanOrNull(
        cookieSettings
          .advertising
      ),


    /* =====================================================
       CUSTOMISE
       ===================================================== */

    customise_opened:

      settingsOpenCount >
      0,


    cookie_settings_open_count:
      settingsOpenCount,


    /* =====================================================
       COOKIE TIMING
       ===================================================== */

    /*
     * Site load → INITIAL cookie decision.
     *
     * This is the main decision-time variable.
     */
    cookie_decision_time_ms:
      finiteOrNull(
        firstCookieValue
          .timeFromSiteLoadToDecisionMilliseconds
      ),


    /*
     * How much of the website task had already
     * been completed at the initial decision.
     *
     * Site 3:
     * 0, 1, 2 or 3.
     */
    task_progress_at_cookie_decision:
      finiteOrNull(
        firstCookieValue
          .taskProgressAtDecision
      ),


    /* =====================================================
       SUGGESTIONS CONDITION
       ===================================================== */

    suggestion_topic:
      suggestionValue
        .suggestionTopic ??
      null,


    suggestion_shown:
      Boolean(
        suggestionShownEvent
      ),


    suggestion_opened:

      suggestionOpenCount >
      0,


    suggestion_open_count:
      suggestionOpenCount,


    suggestion_dismissed:

      suggestionDismissCount >
      0,


    suggestion_dismiss_count:
      suggestionDismissCount,


    /*
     * Suggestion exposure → cookie decision.
     */
    suggestion_to_cookie_decision_ms:
      finiteOrNull(
        firstCookieValue
          .timeFromSuggestionShownToDecisionMilliseconds
      ),


    /* =====================================================
       AUTOMATION CONDITION
       ===================================================== */

    automation_reviewed:

      automationReviewCount >
      0,


    automation_review_count:
      automationReviewCount,


    automation_override:
      automationOverride,


    automation_applied:
      Boolean(
        automationAppliedEvent
      ),


    automation_application_time_ms:
      finiteOrNull(
        automationAppliedValue
          .timeFromSiteLoadToApplicationMilliseconds
      )

  };

}


/* =========================================================
   SITE SUMMARY
   ========================================================= */

function buildSiteSummary(
  siteId,
  session,
  events
) {

  const taskResponse =

    getTaskResponse(
      session,
      siteId
    );


  const completionEvent =

    getLastEvent(
      events,
      siteId,
      "site_completed"
    );


  const completionValue =

    getEventValue(
      completionEvent
    );


  const cookie =

    buildCookieSummary(
      siteId,
      events
    );


  const shopping =

    siteId ===
      "site3"

      ? buildShoppingSummary(
          session,
          events
        )

      : null;


  return {

    /*
     * Sites 1 and 2 use normal multiple-choice tasks.
     *
     * Site 3 is represented as one shopping sequence
     * containing three behavioural tasks.
     */
    task_id:

      siteId ===
        "site3"

        ? "site3_shopping_sequence"

        : taskResponse
            ?.taskId ??
          null,


    /*
     * Site 3 is considered successful at the site level
     * only if all three shopping tasks were completed.
     */
    task_correct:

      siteId ===
        "site3"

        ? shopping
            .all_tasks_completed

        : typeof taskResponse
            ?.isCorrect ===
            "boolean"

          ? taskResponse
              .isCorrect

          : null,


    task_submitted_at:

      siteId ===
        "site3"

        ? shopping
            .task_3_completed_at

        : taskResponse
            ?.submittedAt ??
          null,


    /*
     * Cookie/intervention variables.
     */
    ...cookie,


    /*
     * General site behaviour.
     */
    time_on_site_ms:
      finiteOrNull(
        completionValue
          .timeOnSiteMilliseconds
      ),


    interaction_count:

      Number.isFinite(
        completionValue
          .relevantInteractionCount
      )

        ? completionValue
            .relevantInteractionCount

        : countEvents(
            events,
            siteId,
            "interface_interaction"
          ),


    /*
     * Only Site 3 has this object.
     */
    shopping

  };

}


/* =========================================================
   PARTICIPANT SUMMARY
   ========================================================= */

export function buildResultsSummary() {

  const session =
    getSession();


  const events =
    getEvents();


  if (!session) {

    throw new Error(
      "No study session was found."
    );

  }


  const completionEvent =

    getLastEvent(
      events,
      "experiment_end",
      "all_sites_completed"
    );


  const completionValue =

    getEventValue(
      completionEvent
    );


  const sites = {};


  SITE_IDS.forEach(
    function (
      siteId
    ) {

      sites[
        siteId
      ] =
        buildSiteSummary(
          siteId,
          session,
          events
        );

    }
  );


  const totalDuration =

    Number.isFinite(
      completionValue
        .totalExperimentTimeMilliseconds
    )

      ? completionValue
          .totalExperimentTimeMilliseconds

      : Date.now() -
        session
          .startedAtMilliseconds;


  /* =======================================================
     INFORMATION-TASK TOTAL
     ======================================================= */

  const informationCorrectCount =

    INFORMATION_SITE_IDS.reduce(
      function (
        total,
        siteId
      ) {

        return (

          total +

          (
            sites[
              siteId
            ]
              .task_correct ===
            true

              ? 1

              : 0
          )

        );

      },
      0
    );


  /* =======================================================
     SHOPPING-TASK TOTAL
     ======================================================= */

  const shoppingCompletedCount =

    sites
      .site3
      .shopping
      .completed_task_count;


  return {

    /*
     * Kept as 1.0 for compatibility with the
     * existing backend.
     */
    schema_version:
      "1.0",


    /*
     * Identifies the revised experimental design.
     */
    experiment_version:
      "three_site_v2",


    participant_id:
      session.participantId,


    condition:
      session.condition,


    site_order:

      Array.isArray(
        session.siteOrder
      )

        ? session.siteOrder

        : [
            ...SITE_IDS
          ],


    started_at:
      session.startedAt,


    completed_at:

      completionEvent
        ?.timestamp ??

      new Date()
        .toISOString(),


    total_duration_ms:
      totalDuration,


    total_event_count:
      events.length,


    sites,


    totals: {

      /*
       * There are now five actual behavioural tasks:
       *
       * Site 1 = 1
       * Site 2 = 1
       * Site 3 = 3
       */
      expected_task_count:
        5,


      correct_information_task_count:
        informationCorrectCount,


      shopping_task_completed_count:
        shoppingCompletedCount,


      /*
       * Overall successful task count out of 5.
       */
      correct_task_count:

        informationCorrectCount +
        shoppingCompletedCount,


      /*
       * Number of websites on which a cookie
       * decision was made.
       */
      cookie_decision_count:

        SITE_IDS.reduce(
          function (
            total,
            siteId
          ) {

            return (

              total +

              (
                sites[
                  siteId
                ]
                  .cookie_decision_made

                  ? 1

                  : 0
              )

            );

          },
          0
        ),


      /*
       * General interface interactions.
       */
      interaction_count:

        SITE_IDS.reduce(
          function (
            total,
            siteId
          ) {

            return (

              total +

              (
                sites[
                  siteId
                ]
                  .interaction_count ??
                0
              )

            );

          },
          0
        ),


      /*
       * Custom cookie-settings openings.
       */
      customise_open_count:

        SITE_IDS.reduce(
          function (
            total,
            siteId
          ) {

            return (

              total +

              sites[
                siteId
              ]
                .cookie_settings_open_count

            );

          },
          0
        ),


      /*
       * Suggestions engagement.
       */
      suggestion_open_count:

        SITE_IDS.reduce(
          function (
            total,
            siteId
          ) {

            return (

              total +

              sites[
                siteId
              ]
                .suggestion_open_count

            );

          },
          0
        ),


      suggestion_dismiss_count:

        SITE_IDS.reduce(
          function (
            total,
            siteId
          ) {

            return (

              total +

              sites[
                siteId
              ]
                .suggestion_dismiss_count

            );

          },
          0
        ),


      /*
       * Automation engagement.
       */
      automation_review_count:

        SITE_IDS.reduce(
          function (
            total,
            siteId
          ) {

            return (

              total +

              sites[
                siteId
              ]
                .automation_review_count

            );

          },
          0
        ),


      automation_override_count:

        SITE_IDS.reduce(
          function (
            total,
            siteId
          ) {

            return (

              total +

              (
                sites[
                  siteId
                ]
                  .automation_override

                  ? 1

                  : 0
              )

            );

          },
          0
        )

    }

  };

}


/* =========================================================
   QUALTRICS FLATTENING
   ========================================================= */

/**
 * Convert booleans to simple values suitable
 * for Qualtrics Embedded Data.
 */
function encodeBoolean(
  value
) {

  if (
    value ===
    true
  ) {

    return "1";

  }


  if (
    value ===
    false
  ) {

    return "0";

  }


  return "";

}


/**
 * Flatten the participant summary.
 *
 * This remains available for the eventual
 * Qualtrics return-data integration.
 */
export function flattenResultsSummary(
  summary
) {

  const flattened = {

    participant_id:
      summary.participant_id,


    condition:
      summary.condition,


    site_order:
      summary.site_order
        .join(","),


    total_duration_ms:
      summary.total_duration_ms,


    total_event_count:
      summary.total_event_count,


    expected_task_count:
      summary
        .totals
        .expected_task_count,


    correct_task_count:
      summary
        .totals
        .correct_task_count,


    correct_information_task_count:
      summary
        .totals
        .correct_information_task_count,


    shopping_task_completed_count:
      summary
        .totals
        .shopping_task_completed_count,


    cookie_decision_count:
      summary
        .totals
        .cookie_decision_count,


    total_interaction_count:
      summary
        .totals
        .interaction_count,


    customise_open_count:
      summary
        .totals
        .customise_open_count,


    suggestion_open_count:
      summary
        .totals
        .suggestion_open_count,


    suggestion_dismiss_count:
      summary
        .totals
        .suggestion_dismiss_count,


    automation_review_count:
      summary
        .totals
        .automation_review_count,


    automation_override_count:
      summary
        .totals
        .automation_override_count

  };


  /* =======================================================
     SITE-LEVEL VARIABLES
     ======================================================= */

  SITE_IDS.forEach(
    function (
      siteId
    ) {

      const site =
        summary
          .sites[
            siteId
          ];


      /* -------------------------
         TASK
         ------------------------- */

      flattened[
        `${siteId}_task_correct`
      ] =
        encodeBoolean(
          site.task_correct
        );


      /* -------------------------
         COOKIE DECISION
         ------------------------- */

      flattened[
        `${siteId}_cookie_decision_made`
      ] =
        encodeBoolean(
          site.cookie_decision_made
        );


      flattened[
        `${siteId}_cookie_initial_choice`
      ] =
        site
          .cookie_initial_choice ??
        "";


      flattened[
        `${siteId}_cookie_initial_source`
      ] =
        site
          .cookie_initial_source ??
        "";


      flattened[
        `${siteId}_cookie_choice`
      ] =
        site
          .cookie_choice ??
        "";


      flattened[
        `${siteId}_cookie_source`
      ] =
        site
          .cookie_source ??
        "";


      flattened[
        `${siteId}_functional`
      ] =
        encodeBoolean(
          site.cookie_functional
        );


      flattened[
        `${siteId}_analytics`
      ] =
        encodeBoolean(
          site.cookie_analytics
        );


      flattened[
        `${siteId}_advertising`
      ] =
        encodeBoolean(
          site.cookie_advertising
        );


      /* -------------------------
         CUSTOMISE
         ------------------------- */

      flattened[
        `${siteId}_customise_opened`
      ] =
        encodeBoolean(
          site.customise_opened
        );


      flattened[
        `${siteId}_customise_open_count`
      ] =
        site
          .cookie_settings_open_count;


      /* -------------------------
         COOKIE TIMING
         ------------------------- */

      flattened[
        `${siteId}_cookie_decision_time_ms`
      ] =
        site
          .cookie_decision_time_ms ??
        "";


      flattened[
        `${siteId}_task_progress_at_cookie_decision`
      ] =
        site
          .task_progress_at_cookie_decision ??
        "";


      /* -------------------------
         SUGGESTIONS
         ------------------------- */

      flattened[
        `${siteId}_suggestion_shown`
      ] =
        encodeBoolean(
          site.suggestion_shown
        );


      flattened[
        `${siteId}_suggestion_opened`
      ] =
        encodeBoolean(
          site.suggestion_opened
        );


      flattened[
        `${siteId}_suggestion_dismissed`
      ] =
        encodeBoolean(
          site.suggestion_dismissed
        );


      flattened[
        `${siteId}_suggestion_to_cookie_decision_ms`
      ] =
        site
          .suggestion_to_cookie_decision_ms ??
        "";


      /* -------------------------
         AUTOMATION
         ------------------------- */

      flattened[
        `${siteId}_automation_reviewed`
      ] =
        encodeBoolean(
          site.automation_reviewed
        );


      flattened[
        `${siteId}_automation_override`
      ] =
        encodeBoolean(
          site.automation_override
        );


      /* -------------------------
         GENERAL SITE BEHAVIOUR
         ------------------------- */

      flattened[
        `${siteId}_time_ms`
      ] =
        site
          .time_on_site_ms ??
        "";


      flattened[
        `${siteId}_interaction_count`
      ] =
        site
          .interaction_count ??
        "";

    }
  );


  /* =======================================================
     SITE 3 — SHOPPING VARIABLES
     ======================================================= */

  const shopping =
    summary
      .sites
      .site3
      .shopping;


  flattened
    .site3_shopping_task_progress =
      shopping.task_progress;


  flattened
    .site3_shopping_task_1_completed =
      encodeBoolean(
        shopping
          .task_1_completed
      );


  flattened
    .site3_shopping_task_2_completed =
      encodeBoolean(
        shopping
          .task_2_completed
      );


  flattened
    .site3_shopping_task_3_completed =
      encodeBoolean(
        shopping
          .task_3_completed
      );


  flattened
    .site3_shopping_all_tasks_completed =
      encodeBoolean(
        shopping
          .all_tasks_completed
      );


  flattened
    .site3_product_view_count =
      shopping
        .product_view_count;


  flattened
    .site3_product_add_count =
      shopping
        .product_add_count;


  flattened
    .site3_demo_login_attempt_count =
      shopping
        .demo_login_attempt_count;


  flattened
    .site3_demo_login_failed_attempt_count =
      shopping
        .demo_login_failed_attempt_count;


  flattened
    .site3_checkout_started =
      encodeBoolean(
        shopping
          .checkout_started
      );


  flattened
    .site3_delivery_details_submitted =
      encodeBoolean(
        shopping
          .delivery_details_submitted
      );


  flattened
    .site3_delivery_option_attempt_count =
      shopping
        .delivery_option_attempt_count;


  flattened
    .site3_final_delivery_option =
      shopping
        .final_delivery_option ??
      "";


  flattened
    .site3_final_delivery_correct =
      encodeBoolean(
        shopping
          .final_delivery_correct
      );


  return flattened;

}


/* =========================================================
   LEGACY QUALTRICS URL HELPER
   ========================================================= */

/**
 * Convert the flattened result into URL parameters.
 *
 * We may ultimately use postMessage rather than a long
 * URL, but retaining this function does no harm and
 * preserves compatibility with the earlier design.
 */
export function buildQualtricsUrl(
  baseUrl,
  summary
) {

  const url =
    new URL(
      baseUrl
    );


  const flattened =
    flattenResultsSummary(
      summary
    );


  Object.entries(
    flattened
  ).forEach(
    function (
      [key, value]
    ) {

      url.searchParams.set(
        key,
        String(
          value
        )
      );

    }
  );


  return url.toString();

}