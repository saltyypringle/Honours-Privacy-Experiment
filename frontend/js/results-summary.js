"use strict";

import {
  getSession,
  getEvents
} from "./experiment-core.js";


const SITE_IDS = [
  "site1",
  "site2",
  "site3",
  "site4"
];


function isObject(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}


function getEventValue(event) {
  return isObject(event?.eventValue)
    ? event.eventValue
    : {};
}


function getLastEvent(
  events,
  siteId,
  eventType
) {
  for (
    let index = events.length - 1;
    index >= 0;
    index -= 1
  ) {
    const event = events[index];

    if (
      event.siteId === siteId &&
      event.eventType === eventType
    ) {
      return event;
    }
  }

  return null;
}


function countEvents(
  events,
  siteId,
  eventType
) {
  return events.filter(function (event) {
    return (
      event.siteId === siteId &&
      event.eventType === eventType
    );
  }).length;
}


function getTaskResponse(
  session,
  siteId
) {
  const responses =
    Array.isArray(session.taskResponses)
      ? session.taskResponses
      : [];

  for (
    let index = responses.length - 1;
    index >= 0;
    index -= 1
  ) {
    if (
      responses[index].siteId === siteId
    ) {
      return responses[index];
    }
  }

  return null;
}


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


  const cookieEvent =
    getLastEvent(
      events,
      siteId,
      "cookie_choice"
    );


  const cookieValue =
    getEventValue(
      cookieEvent
    );


  const cookieSettings =
    isObject(
      cookieValue.settings
    )
      ? cookieValue.settings
      : {};


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


  return {

    task_id:
      taskResponse?.taskId ?? null,


    task_correct:
      typeof taskResponse?.isCorrect ===
      "boolean"
        ? taskResponse.isCorrect
        : null,


    task_submitted_at:
      taskResponse?.submittedAt ?? null,


    cookie_choice:
      cookieValue.choice ?? null,


    cookie_source:
      cookieValue.source ?? null,


    cookie_functional:
      typeof cookieSettings.functional ===
      "boolean"
        ? cookieSettings.functional
        : null,


    cookie_analytics:
      typeof cookieSettings.analytics ===
      "boolean"
        ? cookieSettings.analytics
        : null,


    cookie_advertising:
      typeof cookieSettings.advertising ===
      "boolean"
        ? cookieSettings.advertising
        : null,


    automation_override:
      Boolean(
        cookieValue.automationOverride
      ),


    time_on_site_ms:
      Number.isFinite(
        completionValue
          .timeOnSiteMilliseconds
      )
        ? completionValue
            .timeOnSiteMilliseconds
        : null,


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


    cookie_settings_open_count:
      countEvents(
        events,
        siteId,
        "cookie_settings_opened"
      ),


    suggestion_open_count:
      countEvents(
        events,
        siteId,
        "privacy_suggestion_opened"
      ),


    suggestion_dismiss_count:
      countEvents(
        events,
        siteId,
        "privacy_suggestion_dismissed"
      ),


    automation_review_count:
      countEvents(
        events,
        siteId,
        "automation_choice_reviewed"
      )

  };
}


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
    function (siteId) {

      sites[siteId] =
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
        session.startedAtMilliseconds;


  return {

    schema_version:
      "1.0",


    participant_id:
      session.participantId,


    condition:
      session.condition,


    site_order:
      Array.isArray(
        session.siteOrder
      )
        ? session.siteOrder
        : [...SITE_IDS],


    started_at:
      session.startedAt,


    completed_at:
      completionEvent?.timestamp ??
      new Date().toISOString(),


    total_duration_ms:
      totalDuration,


    total_event_count:
      events.length,


    sites,


    totals: {

      correct_task_count:
        SITE_IDS.reduce(
          function (
            total,
            siteId
          ) {

            return (
              total +
              (
                sites[siteId]
                  .task_correct === true
                  ? 1
                  : 0
              )
            );

          },
          0
        ),


      interaction_count:
        SITE_IDS.reduce(
          function (
            total,
            siteId
          ) {

            return (
              total +
              (
                sites[siteId]
                  .interaction_count ??
                0
              )
            );

          },
          0
        ),


      suggestion_open_count:
        SITE_IDS.reduce(
          function (
            total,
            siteId
          ) {

            return (
              total +
              sites[siteId]
                .suggestion_open_count
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
                sites[siteId]
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


function encodeBoolean(value) {

  if (value === true) {
    return "1";
  }

  if (value === false) {
    return "0";
  }

  return "";
}


export function flattenResultsSummary(
  summary
) {

  const flattened = {

    participant_id:
      summary.participant_id,


    condition:
      summary.condition,


    site_order:
      summary.site_order.join(","),


    total_duration_ms:
      summary.total_duration_ms,


    total_event_count:
      summary.total_event_count,


    correct_task_count:
      summary.totals
        .correct_task_count,


    total_interaction_count:
      summary.totals
        .interaction_count,


    suggestion_open_count:
      summary.totals
        .suggestion_open_count,


    automation_override_count:
      summary.totals
        .automation_override_count

  };


  SITE_IDS.forEach(
    function (siteId) {

      const site =
        summary.sites[siteId];


      flattened[
        `${siteId}_task_correct`
      ] =
        encodeBoolean(
          site.task_correct
        );


      flattened[
        `${siteId}_cookie_choice`
      ] =
        site.cookie_choice ?? "";


      flattened[
        `${siteId}_cookie_source`
      ] =
        site.cookie_source ?? "";


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


      flattened[
        `${siteId}_automation_override`
      ] =
        encodeBoolean(
          site.automation_override
        );


      flattened[
        `${siteId}_time_ms`
      ] =
        site.time_on_site_ms ??
        "";


      flattened[
        `${siteId}_interaction_count`
      ] =
        site.interaction_count ??
        "";


      flattened[
        `${siteId}_suggestion_open_count`
      ] =
        site.suggestion_open_count;

    }
  );


  return flattened;
}


export function buildQualtricsUrl(
  baseUrl,
  summary
) {

  const url =
    new URL(baseUrl);


  const flattened =
    flattenResultsSummary(
      summary
    );


  Object.entries(
    flattened
  ).forEach(
    function ([key, value]) {

      url.searchParams.set(
        key,
        String(value)
      );

    }
  );


  return url.toString();
}