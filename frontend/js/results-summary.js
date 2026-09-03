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

function isObject(
  value
) {

  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  );

}


function getEventValue(
  event
) {

  return isObject(
    event?.eventValue
  )
    ? event.eventValue
    : {};

}


function getMatchingEvents(
  events,
  siteId,
  eventType
) {

  return events.filter(
    event => (
      event.siteId ===
        siteId &&
      event.eventType ===
        eventType
    )
  );

}


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
        matches.length -
        1
      ]

    : null;

}


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


function finiteOrNull(
  value
) {

  return Number.isFinite(
    value
  )
    ? value
    : null;

}


function booleanOrNull(
  value
) {

  return typeof value ===
    "boolean"

    ? value

    : null;

}


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


function timestampMilliseconds(
  event
) {

  if (
    !event?.timestamp
  ) {

    return null;

  }


  const value =
    Date.parse(
      event.timestamp
    );


  return Number.isFinite(
    value
  )
    ? value
    : null;

}


function millisecondsBetweenEvents(
  startEvent,
  endEvent
) {

  const start =
    timestampMilliseconds(
      startEvent
    );


  const end =
    timestampMilliseconds(
      endEvent
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


function eventOccurredBy(
  event,
  comparisonEvent
) {

  if (
    !event ||
    !comparisonEvent
  ) {

    return false;

  }


  /*
   * sequenceNumber is preferable because it represents
   * the actual chronological event order.
   */
  if (
    Number.isFinite(
      event.sequenceNumber
    ) &&
    Number.isFinite(
      comparisonEvent.sequenceNumber
    )
  ) {

    return (
      event.sequenceNumber <=
      comparisonEvent.sequenceNumber
    );

  }


  /*
   * Timestamp fallback for older event records.
   */
  const eventTime =
    timestampMilliseconds(
      event
    );


  const comparisonTime =
    timestampMilliseconds(
      comparisonEvent
    );


  return (
    Number.isFinite(
      eventTime
    ) &&
    Number.isFinite(
      comparisonTime
    ) &&
    eventTime <=
      comparisonTime
  );

}


function uniqueOrdered(
  values
) {

  const seen =
    new Set();


  const result =
    [];


  values.forEach(
    value => {

      if (
        value === null ||
        value === undefined ||
        value === "" ||
        seen.has(
          value
        )
      ) {

        return;

      }


      seen.add(
        value
      );


      result.push(
        value
      );

    }
  );


  return result;

}


/* =========================================================
   STANDARD TASK RESPONSES
   SITES 1 AND 2
   ========================================================= */

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


  /*
   * Search backwards in case an updated response for
   * the same site exists.
   */
  for (

    let index =
      responses.length -
      1;

    index >=
      0;

    index -=
      1

  ) {

    if (
      responses[
        index
      ]?.siteId ===
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


  function getCompletedTask(
    taskNumber
  ) {

    return (

      completedEvents.find(
        event => {

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
   * shoppingState contains safe structural state only.
   *
   * No raw login or other personal information is stored.
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

    /* -------------------------
       OVERALL SHOPPING PROGRESS
       ------------------------- */

    task_progress:
      finalTaskProgress,


    completed_task_count:
      completedTaskCount,


    /* -------------------------
       TASK 1 — PRODUCT
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
       TASK 2 — DEMO ACCOUNT
       ------------------------- */

    task_2_completed:
      Boolean(
        task2
      ),


    task_2_completed_at:
      task2?.timestamp ??
      null,


    /* -------------------------
       TASK 3 — DELIVERY
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
        event => (

          getEventValue(
            event
          ).success ===
          false

        )
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

function buildCookieSummary(
  siteId,
  events
) {

  /* =======================================================
     COOKIE CHOICES
     ======================================================= */

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


  const initialSettings =
    normaliseSettings(
      firstCookieValue.settings
    );


  const finalSettings =
    normaliseSettings(
      finalCookieValue.settings
    );


  /* =======================================================
     INTERFACE ASSIGNMENT
     ======================================================= */

  const interfaceInitialisedEvent =
    getFirstEvent(
      events,
      siteId,
      "interface_initialised"
    );


  const interfaceValue =
    getEventValue(
      interfaceInitialisedEvent
    );


  /* =======================================================
     SETTINGS / REVISION
     ======================================================= */

  const settingsOpenCount =
    countEvents(
      events,
      siteId,
      "cookie_settings_opened"
    );


  const settingsReopenCount =
    countEvents(
      events,
      siteId,
      "cookie_settings_reopened"
    );


  const settingsSavedUnchangedCount =
    countEvents(
      events,
      siteId,
      "cookie_settings_saved_unchanged"
    );


  const preferenceChangedEvents =
    getMatchingEvents(
      events,
      siteId,
      "cookie_preference_changed"
    );


  const firstPreferenceChangedEvent =
    preferenceChangedEvents[
      0
    ] ??
    null;


  const firstPreferenceChangedValue =
    getEventValue(
      firstPreferenceChangedEvent
    );


  /* =======================================================
     SUGGESTIONS EXPOSURE
     ======================================================= */

  const suggestionUpdatedEvents =
    getMatchingEvents(
      events,
      siteId,
      "privacy_suggestion_updated"
    );


  /*
   * A Suggestions exposure consists of either:
   *
   * - the first card being shown; or
   * - the existing card updating to another context.
   */
  const suggestionExposureEvents =

    events.filter(
      event => (

        event.siteId ===
          siteId &&

        (
          event.eventType ===
            "privacy_suggestion_shown" ||

          event.eventType ===
            "privacy_suggestion_updated"
        )

      )
    );


  const suggestionOpenedEvents =
    getMatchingEvents(
      events,
      siteId,
      "privacy_suggestion_opened"
    );


  const suggestionDismissedEvents =
    getMatchingEvents(
      events,
      siteId,
      "privacy_suggestion_dismissed"
    );


  const suggestionSettingsOpenedEvents =
    getMatchingEvents(
      events,
      siteId,
      "privacy_suggestion_settings_opened"
    );


  /*
   * Use actual displayed Suggestions contexts rather
   * than merely every privacy_context_detected event.
   *
   * This avoids counting a context that was detected
   * but never displayed.
   */
  const suggestionContextsSeen =

    uniqueOrdered(

      suggestionExposureEvents.map(
        event => (

          getEventValue(
            event
          ).context ??

          null

        )
      )

    );


  const firstSuggestionContext =
    suggestionContextsSeen[
      0
    ] ??
    null;


  const finalSuggestionContext =

    suggestionContextsSeen.length >
      0

      ? suggestionContextsSeen[
          suggestionContextsSeen.length -
          1
        ]

      : null;


  /* =======================================================
     SUGGESTIONS BEFORE FIRST COOKIE CHANGE
     ======================================================= */

  const exposuresBeforeFirstChange =

    firstPreferenceChangedEvent

      ? suggestionExposureEvents.filter(
          event =>

            eventOccurredBy(
              event,
              firstPreferenceChangedEvent
            )
        )

      : [];


  const firstExposureBeforeChange =
    exposuresBeforeFirstChange[
      0
    ] ??
    null;


  /*
   * Most recently displayed Suggestions context before
   * the participant changed their cookie preference.
   */
  const activeExposureBeforeChange =

    exposuresBeforeFirstChange.length >
      0

      ? exposuresBeforeFirstChange[
          exposuresBeforeFirstChange.length -
          1
        ]

      : null;


  const suggestionSeenBeforeChangeDerived =

    exposuresBeforeFirstChange.length >
    0;


  const suggestionOpenedBeforeChangeDerived =

    firstPreferenceChangedEvent

      ? suggestionOpenedEvents.some(
          event =>

            eventOccurredBy(
              event,
              firstPreferenceChangedEvent
            )
        )

      : false;


  /*
   * Prefer the value explicitly captured at the moment
   * of the cookie change.
   *
   * Fall back to chronological derivation for older logs.
   */
  const suggestionSeenBeforeChange =

    typeof firstPreferenceChangedValue
      .suggestionSeenBeforeChange ===
      "boolean"

      ? firstPreferenceChangedValue
          .suggestionSeenBeforeChange

      : firstPreferenceChangedEvent

        ? suggestionSeenBeforeChangeDerived

        : null;


  const suggestionOpenedBeforeChange =

    typeof firstPreferenceChangedValue
      .suggestionOpenedBeforeChange ===
      "boolean"

      ? firstPreferenceChangedValue
          .suggestionOpenedBeforeChange

      : firstPreferenceChangedEvent

        ? suggestionOpenedBeforeChangeDerived

        : null;


  /*
   * Most recent Suggestions exposure → first genuine
   * cookie-preference change.
   *
   * This is the main contextual Suggestions timing
   * measure.
   */
  const suggestionToCookieChangeMs =
    millisecondsBetweenEvents(
      activeExposureBeforeChange,
      firstPreferenceChangedEvent
    );


  /*
   * First Suggestions exposure on this website →
   * first genuine cookie-preference change.
   *
   * Kept separately because it captures cumulative
   * exposure rather than the currently active context.
   */
  const firstSuggestionToCookieChangeMs =
    millisecondsBetweenEvents(
      firstExposureBeforeChange,
      firstPreferenceChangedEvent
    );


  /* =======================================================
     AUTOMATION
     ======================================================= */

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


  const automationReviewCount =
    countEvents(
      events,
      siteId,
      "automation_choice_reviewed"
    );


  const automationOverrideCount =
    countEvents(
      events,
      siteId,
      "automation_override"
    );


  /* =======================================================
     RETURN COOKIE SUMMARY
     ======================================================= */

  return {

    /* -------------------------
       EXPERIMENTAL CONTEXT
       ------------------------- */

    assigned_condition:
      interfaceValue
        .assignedCondition ??
      firstCookieValue
        .assignedCondition ??
      null,


    interface_condition:
      interfaceValue
        .interfaceCondition ??
      firstCookieValue
        .interfaceCondition ??
      null,


    phase:
      interfaceValue
        .phase ??
      firstCookieValue
        .phase ??
      null,


    /* -------------------------
       INITIAL COOKIE CHOICE
       ------------------------- */

    cookie_decision_made:
      Boolean(
        firstCookieEvent
      ),


    cookie_initial_choice:
      firstCookieValue
        .choice ??
      null,


    cookie_initial_source:
      firstCookieValue
        .source ??
      null,


    cookie_initial_functional:

      firstCookieEvent

        ? initialSettings
            .functional

        : null,


    cookie_initial_analytics:

      firstCookieEvent

        ? initialSettings
            .analytics

        : null,


    cookie_initial_advertising:

      firstCookieEvent

        ? initialSettings
            .advertising

        : null,


    /* -------------------------
       FINAL COOKIE CHOICE
       ------------------------- */

    cookie_final_choice:
      finalCookieValue
        .choice ??
      null,


    cookie_final_source:
      finalCookieValue
        .source ??
      null,


    cookie_final_functional:

      finalCookieEvent

        ? finalSettings
            .functional

        : null,


    cookie_final_analytics:

      finalCookieEvent

        ? finalSettings
            .analytics

        : null,


    cookie_final_advertising:

      finalCookieEvent

        ? finalSettings
            .advertising

        : null,


    /*
     * Backwards-compatible aliases.
     *
     * These represent the FINAL preference.
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

      finalCookieEvent

        ? finalSettings
            .functional

        : null,


    cookie_analytics:

      finalCookieEvent

        ? finalSettings
            .analytics

        : null,


    cookie_advertising:

      finalCookieEvent

        ? finalSettings
            .advertising

        : null,


    /* -------------------------
       COOKIE REVISION
       ------------------------- */

    cookie_choice_changed:

      preferenceChangedEvents.length >
      0,


    cookie_change_count:
      preferenceChangedEvents.length,


    cookie_settings_reopened:

      settingsReopenCount >
      0,


    cookie_settings_reopen_count:
      settingsReopenCount,


    cookie_settings_saved_unchanged_count:
      settingsSavedUnchangedCount,


    /*
     * Initial cookie decision → first genuine
     * preference change.
     *
     * Prefer the precise value generated by
     * cookie-interface.js.
     */
    time_initial_choice_to_change_ms:

      firstPreferenceChangedEvent

        ? (

            finiteOrNull(
              firstPreferenceChangedValue
                .timeInitialChoiceToChangeMilliseconds
            ) ??

            millisecondsBetweenEvents(
              firstCookieEvent,
              firstPreferenceChangedEvent
            )

          )

        : null,


    context_before_cookie_change:
      firstPreferenceChangedValue
        .context ??
      null,


    suggestion_seen_before_cookie_change:
      suggestionSeenBeforeChange,


    suggestion_opened_before_cookie_change:
      suggestionOpenedBeforeChange,


    /* -------------------------
       SETTINGS INTERACTION
       ------------------------- */

    customise_opened:

      (
        settingsOpenCount +
        settingsReopenCount
      ) >
      0,


    /*
     * Initial settings-panel openings before a decision.
     */
    cookie_settings_open_count:
      settingsOpenCount,


    /*
     * Includes both initial openings and later reopenings.
     */
    cookie_settings_total_open_count:

      settingsOpenCount +
      settingsReopenCount,


    /* -------------------------
       COOKIE TIMING
       ------------------------- */

    cookie_decision_time_ms:
      finiteOrNull(
        firstCookieValue
          .timeFromSiteLoadToDecisionMilliseconds
      ),


    cookie_final_decision_time_ms:
      finiteOrNull(
        finalCookieValue
          .timeFromSiteLoadToDecisionMilliseconds
      ),


    task_progress_at_cookie_decision:
      finiteOrNull(
        firstCookieValue
          .taskProgressAtDecision
      ),


    task_progress_at_final_cookie_decision:
      finiteOrNull(
        finalCookieValue
          .taskProgressAtDecision
      ),


    /* -------------------------
       SUGGESTIONS
       ------------------------- */

    /*
     * Compatibility alias for the older field name.
     *
     * It now correctly represents the FIRST contextual
     * Suggestions topic shown on the website.
     */
    suggestion_topic:
      firstSuggestionContext,


    suggestion_shown:

      suggestionExposureEvents.length >
      0,


    suggestion_exposure_count:
      suggestionExposureEvents.length,


    suggestion_opened:

      suggestionOpenedEvents.length >
      0,


    suggestion_open_count:
      suggestionOpenedEvents.length,


    suggestion_dismissed:

      suggestionDismissedEvents.length >
      0,


    suggestion_dismiss_count:
      suggestionDismissedEvents.length,


    suggestion_update_count:
      suggestionUpdatedEvents.length,


    suggestion_settings_opened:

      suggestionSettingsOpenedEvents.length >
      0,


    suggestion_settings_open_count:
      suggestionSettingsOpenedEvents.length,


    suggestion_contexts_seen:
      suggestionContextsSeen,


    suggestion_first_context:
      firstSuggestionContext,


    suggestion_final_context:
      finalSuggestionContext,


    /*
     * Context active immediately before the first
     * genuine preference change.
     */
    context_before_first_cookie_change:

      getEventValue(
        activeExposureBeforeChange
      ).context ??

      firstPreferenceChangedValue
        .context ??

      null,


    /*
     * Active Suggestions context → cookie change.
     */
    suggestion_to_cookie_change_ms:
      suggestionToCookieChangeMs,


    /*
     * First Suggestions exposure → cookie change.
     */
    first_suggestion_to_cookie_change_ms:
      firstSuggestionToCookieChangeMs,


    /* -------------------------
       AUTOMATION
       ------------------------- */

    automation_applied:
      Boolean(
        automationAppliedEvent
      ),


    automation_applied_choice:
      automationAppliedValue
        .choice ??
      null,


    automation_application_time_ms:
      finiteOrNull(
        automationAppliedValue
          .timeFromSiteLoadToApplicationMilliseconds
      ),


    automation_reviewed:

      automationReviewCount >
      0,


    automation_review_count:
      automationReviewCount,


    automation_override:

      automationOverrideCount >
      0,


    automation_override_count:
      automationOverrideCount

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

    /* -------------------------
       TASK
       ------------------------- */

    task_id:

      siteId ===
        "site3"

        ? "site3_shopping_sequence"

        : taskResponse
            ?.taskId ??
          null,


    /*
     * Preserve the participant's actual selected answer
     * for the information tasks.
     */
    task_answer:

      siteId ===
        "site3"

        ? null

        : taskResponse
            ?.answer ??
          null,


    /*
     * Useful for later validation/reanalysis.
     */
    task_correct_answer:

      siteId ===
        "site3"

        ? null

        : taskResponse
            ?.correctAnswer ??
          null,


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


    /* -------------------------
       PRIVACY / COOKIE DATA
       ------------------------- */

    ...cookie,


    /* -------------------------
       GENERAL SITE BEHAVIOUR
       ------------------------- */

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


    /* -------------------------
       SITE 3 ONLY
       ------------------------- */

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


  if (
    !session
  ) {

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


  const sites =
    {};


  SITE_IDS.forEach(
    siteId => {

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

      : Number.isFinite(
          session.startedAtMilliseconds
        )

        ? Math.max(

            0,

            Date.now() -
            session.startedAtMilliseconds

          )

        : null;


  /* =======================================================
     INFORMATION TASK TOTAL
     ======================================================= */

  const informationCorrectCount =

    INFORMATION_SITE_IDS.reduce(

      (
        total,
        siteId
      ) => (

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

      ),

      0

    );


  /* =======================================================
     SHOPPING TASK TOTAL
     ======================================================= */

  const shoppingCompletedCount =

    sites
      .site3
      .shopping
      .completed_task_count;


  return {

    /*
     * Keep the backend-facing schema version unchanged
     * until we inspect the Cloudflare Worker.
     */
    schema_version:
      "1.0",


    experiment_version:
      "three_site_v2",


    /*
     * More precise revision marker for the current
     * derived-results structure.
     */
    results_schema_revision:
      "2026-09-contextual-privacy-v2",


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
      session.startedAt ??
      null,


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
       * Five behavioural tasks:
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


      correct_task_count:

        informationCorrectCount +
        shoppingCompletedCount,


      /* -------------------------
         COOKIE DECISIONS
         ------------------------- */

      cookie_decision_count:

        SITE_IDS.reduce(

          (
            total,
            siteId
          ) => (

            total +

            (
              sites[
                siteId
              ]
                .cookie_decision_made

                ? 1

                : 0
            )

          ),

          0

        ),


      cookie_change_count:

        SITE_IDS.reduce(

          (
            total,
            siteId
          ) => (

            total +

            sites[
              siteId
            ]
              .cookie_change_count

          ),

          0

        ),


      cookie_settings_reopen_count:

        SITE_IDS.reduce(

          (
            total,
            siteId
          ) => (

            total +

            sites[
              siteId
            ]
              .cookie_settings_reopen_count

          ),

          0

        ),


      cookie_settings_saved_unchanged_count:

        SITE_IDS.reduce(

          (
            total,
            siteId
          ) => (

            total +

            sites[
              siteId
            ]
              .cookie_settings_saved_unchanged_count

          ),

          0

        ),


      /* -------------------------
         GENERAL INTERACTIONS
         ------------------------- */

      interaction_count:

        SITE_IDS.reduce(

          (
            total,
            siteId
          ) => (

            total +

            (
              sites[
                siteId
              ]
                .interaction_count ??
              0
            )

          ),

          0

        ),


      /*
       * Initial settings-panel opens.
       *
       * Reopens are counted separately above.
       */
      customise_open_count:

        SITE_IDS.reduce(

          (
            total,
            siteId
          ) => (

            total +

            sites[
              siteId
            ]
              .cookie_settings_open_count

          ),

          0

        ),


      /* -------------------------
         SUGGESTIONS
         ------------------------- */

      suggestion_exposure_count:

        SITE_IDS.reduce(

          (
            total,
            siteId
          ) => (

            total +

            sites[
              siteId
            ]
              .suggestion_exposure_count

          ),

          0

        ),


      suggestion_open_count:

        SITE_IDS.reduce(

          (
            total,
            siteId
          ) => (

            total +

            sites[
              siteId
            ]
              .suggestion_open_count

          ),

          0

        ),


      suggestion_dismiss_count:

        SITE_IDS.reduce(

          (
            total,
            siteId
          ) => (

            total +

            sites[
              siteId
            ]
              .suggestion_dismiss_count

          ),

          0

        ),


      suggestion_settings_open_count:

        SITE_IDS.reduce(

          (
            total,
            siteId
          ) => (

            total +

            sites[
              siteId
            ]
              .suggestion_settings_open_count

          ),

          0

        ),


      /* -------------------------
         AUTOMATION
         ------------------------- */

      automation_review_count:

        SITE_IDS.reduce(

          (
            total,
            siteId
          ) => (

            total +

            sites[
              siteId
            ]
              .automation_review_count

          ),

          0

        ),


      automation_override_count:

        SITE_IDS.reduce(

          (
            total,
            siteId
          ) => (

            total +

            sites[
              siteId
            ]
              .automation_override_count

          ),

          0

        )

    }

  };

}


/* =========================================================
   QUALTRICS FLATTENING
   ========================================================= */

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
 * Convert the nested participant summary into flat
 * name/value pairs suitable for Qualtrics Embedded Data.
 */
export function flattenResultsSummary(
  summary
) {

  const flattened = {

    /* -------------------------
       PARTICIPANT
       ------------------------- */

    participant_id:
      summary.participant_id,


    condition:
      summary.condition,


    site_order:
      summary.site_order
        .join(","),


    total_duration_ms:
      summary.total_duration_ms ??
      "",


    total_event_count:
      summary.total_event_count,


    /* -------------------------
       TASK TOTALS
       ------------------------- */

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


    /* -------------------------
       COOKIE TOTALS
       ------------------------- */

    cookie_decision_count:
      summary
        .totals
        .cookie_decision_count,


    cookie_change_count:
      summary
        .totals
        .cookie_change_count,


    cookie_settings_reopen_count:
      summary
        .totals
        .cookie_settings_reopen_count,


    cookie_settings_saved_unchanged_count:
      summary
        .totals
        .cookie_settings_saved_unchanged_count,


    /* -------------------------
       GENERAL TOTALS
       ------------------------- */

    total_interaction_count:
      summary
        .totals
        .interaction_count,


    customise_open_count:
      summary
        .totals
        .customise_open_count,


    /* -------------------------
       SUGGESTIONS TOTALS
       ------------------------- */

    suggestion_exposure_count:
      summary
        .totals
        .suggestion_exposure_count,


    suggestion_open_count:
      summary
        .totals
        .suggestion_open_count,


    suggestion_dismiss_count:
      summary
        .totals
        .suggestion_dismiss_count,


    suggestion_settings_open_count:
      summary
        .totals
        .suggestion_settings_open_count,


    /* -------------------------
       AUTOMATION TOTALS
       ------------------------- */

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
    siteId => {

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


      flattened[
        `${siteId}_task_answer`
      ] =
        site
          .task_answer ??
        "";


      /* -------------------------
         INTERFACE ASSIGNMENT
         ------------------------- */

      flattened[
        `${siteId}_interface_condition`
      ] =
        site
          .interface_condition ??
        "";


      flattened[
        `${siteId}_phase`
      ] =
        site
          .phase ??
        "";


      /* -------------------------
         INITIAL COOKIE CHOICE
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
        `${siteId}_cookie_initial_functional`
      ] =
        encodeBoolean(
          site.cookie_initial_functional
        );


      flattened[
        `${siteId}_cookie_initial_analytics`
      ] =
        encodeBoolean(
          site.cookie_initial_analytics
        );


      flattened[
        `${siteId}_cookie_initial_advertising`
      ] =
        encodeBoolean(
          site.cookie_initial_advertising
        );


      /* -------------------------
         FINAL COOKIE CHOICE
         ------------------------- */

      /*
       * Backwards-compatible aliases.
       */
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
        `${siteId}_cookie_final_choice`
      ] =
        site
          .cookie_final_choice ??
        "";


      flattened[
        `${siteId}_cookie_final_source`
      ] =
        site
          .cookie_final_source ??
        "";


      flattened[
        `${siteId}_functional`
      ] =
        encodeBoolean(
          site.cookie_final_functional
        );


      flattened[
        `${siteId}_analytics`
      ] =
        encodeBoolean(
          site.cookie_final_analytics
        );


      flattened[
        `${siteId}_advertising`
      ] =
        encodeBoolean(
          site.cookie_final_advertising
        );


      /* -------------------------
         COOKIE CHANGE
         ------------------------- */

      flattened[
        `${siteId}_cookie_choice_changed`
      ] =
        encodeBoolean(
          site.cookie_choice_changed
        );


      flattened[
        `${siteId}_cookie_change_count`
      ] =
        site
          .cookie_change_count;


      flattened[
        `${siteId}_cookie_settings_reopened`
      ] =
        encodeBoolean(
          site.cookie_settings_reopened
        );


      flattened[
        `${siteId}_cookie_settings_reopen_count`
      ] =
        site
          .cookie_settings_reopen_count;


      flattened[
        `${siteId}_cookie_settings_saved_unchanged_count`
      ] =
        site
          .cookie_settings_saved_unchanged_count;


      flattened[
        `${siteId}_time_initial_choice_to_change_ms`
      ] =
        site
          .time_initial_choice_to_change_ms ??
        "";


      flattened[
        `${siteId}_context_before_cookie_change`
      ] =
        site
          .context_before_cookie_change ??
        "";


      flattened[
        `${siteId}_suggestion_seen_before_cookie_change`
      ] =
        encodeBoolean(
          site.suggestion_seen_before_cookie_change
        );


      flattened[
        `${siteId}_suggestion_opened_before_cookie_change`
      ] =
        encodeBoolean(
          site.suggestion_opened_before_cookie_change
        );


      /* -------------------------
         SETTINGS INTERACTION
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


      flattened[
        `${siteId}_cookie_settings_total_open_count`
      ] =
        site
          .cookie_settings_total_open_count;


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
        `${siteId}_cookie_final_decision_time_ms`
      ] =
        site
          .cookie_final_decision_time_ms ??
        "";


      flattened[
        `${siteId}_task_progress_at_cookie_decision`
      ] =
        site
          .task_progress_at_cookie_decision ??
        "";


      flattened[
        `${siteId}_task_progress_at_final_cookie_decision`
      ] =
        site
          .task_progress_at_final_cookie_decision ??
        "";


      /* -------------------------
         SUGGESTIONS
         ------------------------- */

      flattened[
        `${siteId}_suggestion_topic`
      ] =
        site
          .suggestion_topic ??
        "";


      flattened[
        `${siteId}_suggestion_shown`
      ] =
        encodeBoolean(
          site.suggestion_shown
        );


      flattened[
        `${siteId}_suggestion_exposure_count`
      ] =
        site
          .suggestion_exposure_count;


      flattened[
        `${siteId}_suggestion_opened`
      ] =
        encodeBoolean(
          site.suggestion_opened
        );


      flattened[
        `${siteId}_suggestion_open_count`
      ] =
        site
          .suggestion_open_count;


      flattened[
        `${siteId}_suggestion_dismissed`
      ] =
        encodeBoolean(
          site.suggestion_dismissed
        );


      flattened[
        `${siteId}_suggestion_dismiss_count`
      ] =
        site
          .suggestion_dismiss_count;


      flattened[
        `${siteId}_suggestion_update_count`
      ] =
        site
          .suggestion_update_count;


      flattened[
        `${siteId}_suggestion_settings_opened`
      ] =
        encodeBoolean(
          site.suggestion_settings_opened
        );


      flattened[
        `${siteId}_suggestion_settings_open_count`
      ] =
        site
          .suggestion_settings_open_count;


      flattened[
        `${siteId}_suggestion_contexts_seen`
      ] =
        site
          .suggestion_contexts_seen
          .join(",");


      flattened[
        `${siteId}_suggestion_first_context`
      ] =
        site
          .suggestion_first_context ??
        "";


      flattened[
        `${siteId}_suggestion_final_context`
      ] =
        site
          .suggestion_final_context ??
        "";


      flattened[
        `${siteId}_context_before_first_cookie_change`
      ] =
        site
          .context_before_first_cookie_change ??
        "";


      flattened[
        `${siteId}_suggestion_to_cookie_change_ms`
      ] =
        site
          .suggestion_to_cookie_change_ms ??
        "";


      flattened[
        `${siteId}_first_suggestion_to_cookie_change_ms`
      ] =
        site
          .first_suggestion_to_cookie_change_ms ??
        "";


      /* -------------------------
         AUTOMATION
         ------------------------- */

      flattened[
        `${siteId}_automation_applied`
      ] =
        encodeBoolean(
          site.automation_applied
        );


      flattened[
        `${siteId}_automation_applied_choice`
      ] =
        site
          .automation_applied_choice ??
        "";


      flattened[
        `${siteId}_automation_application_time_ms`
      ] =
        site
          .automation_application_time_ms ??
        "";


      flattened[
        `${siteId}_automation_reviewed`
      ] =
        encodeBoolean(
          site.automation_reviewed
        );


      flattened[
        `${siteId}_automation_review_count`
      ] =
        site
          .automation_review_count;


      flattened[
        `${siteId}_automation_override`
      ] =
        encodeBoolean(
          site.automation_override
        );


      flattened[
        `${siteId}_automation_override_count`
      ] =
        site
          .automation_override_count;


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
    .site3_shopping_task_1_product_id =
      shopping
        .task_1_product_id ??
      "";


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
 * Convert the flattened summary to query parameters.
 *
 * We may later use postMessage instead, but preserving
 * this helper keeps the existing architecture compatible.
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
    (
      [
        key,
        value
      ]
    ) => {

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