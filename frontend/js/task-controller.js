"use strict";

import {
  getSession,
  saveSession,
  logEvent
} from "./experiment-core.js";


/**
 * Normalise an answer before comparing it with the
 * configured correct answer.
 *
 * @param {string} value
 * @returns {string}
 */
function normaliseAnswer(value) {
  return value
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}


/**
 * Create the task panel if it does not already exist.
 *
 * @param {HTMLElement} nextBox
 * @returns {HTMLElement}
 */
function ensureTaskPanel(nextBox) {
  let taskPanel =
    nextBox.querySelector(".task-panel");

  if (!taskPanel) {
    taskPanel =
      document.createElement("section");

    taskPanel.className =
      "task-panel";

    nextBox.insertBefore(
      taskPanel,
      nextBox.firstChild
    );
  }

  return taskPanel;
}


/**
 * Convert one answer option into safe HTML.
 *
 * @param {string} option
 * @param {number} index
 * @param {object} config
 * @returns {string}
 */
function buildOptionHtml(
  option,
  index,
  config
) {
  const optionId =
    `${config.answerInputId}_${index}`;

  return `
    <label
      class="task-option"
      for="${optionId}"
    >
      <input
        id="${optionId}"
        class="task-option-input"
        type="radio"
        name="${config.answerInputId}"
        value="${option}"
      />

      <span class="task-option-text">
        ${option}
      </span>
    </label>
  `;
}


/**
 * Initialise the task displayed on a mock website.
 *
 * @param {object} config
 */
export function initialiseTaskController(
  config
) {
  const session = getSession();

  if (!session) {
    console.error(
      "No study session exists for task controller."
    );

    return;
  }

  const nextBox =
    document.querySelector(".next-box");

  const continueButton =
    document.getElementById(
      config.continueButtonId
    );

  if (
    !nextBox ||
    !continueButton
  ) {
    return;
  }

  const taskPanel =
    ensureTaskPanel(nextBox);


  /*
   * Build the multiple-choice answer list.
   */
  const optionHtml =
    config.options
      .map(function (option, index) {
        return buildOptionHtml(
          option,
          index,
          config
        );
      })
      .join("");


  /*
   * Display the task.
   */
taskPanel.innerHTML = `
  <div class="task-panel-header">

    <h3>
      ${config.heading}
    </h3>

    <button
      type="button"
      class="task-collapse-button"
      aria-expanded="true"
      aria-label="Collapse website task"
    >
      −
    </button>

  </div>

  <div class="task-panel-content">

    <p class="task-instruction">
      ${config.prompt}
    </p>

    <form
      class="task-form"
      novalidate
    >
      <fieldset class="task-options">
        <legend class="task-answer-label">
          Select one answer
        </legend>

        ${optionHtml}
      </fieldset>

      <button
        type="submit"
        class="task-submit-button"
      >
        Submit answer
      </button>

      <p
        class="task-feedback"
        aria-live="polite"
      ></p>
    </form>

  </div>
`;


  const taskForm =
    taskPanel.querySelector(
      ".task-form"
    );

  const optionInputs =
    Array.from(
      taskPanel.querySelectorAll(
        ".task-option-input"
      )
    );

  const feedback =
    taskPanel.querySelector(
      ".task-feedback"
    );

  const submitButton =
    taskPanel.querySelector(
      ".task-submit-button"
    );

    const collapseButton =
  taskPanel.querySelector(
    ".task-collapse-button"
  );


const taskContent =
  taskPanel.querySelector(
    ".task-panel-content"
  );


collapseButton.addEventListener(
  "click",
  function () {

    const isCollapsed =
      taskPanel.dataset.collapsed ===
      "true";


    if (isCollapsed) {

      taskPanel.dataset.collapsed =
        "false";

      collapseButton.textContent =
        "−";

      collapseButton.setAttribute(
        "aria-expanded",
        "true"
      );

      collapseButton.setAttribute(
        "aria-label",
        "Collapse website task"
      );

    } else {

      taskPanel.dataset.collapsed =
        "true";

      collapseButton.textContent =
        "+";

      collapseButton.setAttribute(
        "aria-expanded",
        "false"
      );

      collapseButton.setAttribute(
        "aria-label",
        "Expand website task"
      );

    }

  }
);


  /*
   * Participants cannot continue until they have
   * submitted an answer.
   */
  continueButton.disabled = true;

  continueButton.classList.add(
    "task-continue-button"
  );


  /**
   * Display neutral submission feedback.
   */
function renderRecordedFeedback() {

  feedback.textContent =
    "Answer recorded.";

  feedback.dataset.state =
    "recorded";

  taskPanel.dataset.submitted =
    "true";


  /*
   * Compact the persistent task card after the
   * participant has submitted an answer.
   */
  nextBox.dataset.taskComplete =
    "true";

}


  /**
   * Disable the answer controls after submission.
   */
  function disableTaskInputs() {
    optionInputs.forEach(
      function (input) {
        input.disabled = true;
      }
    );

    submitButton.disabled = true;
  }


  /*
   * Check whether this task has already been completed.
   *
   * This allows the page state to be restored if needed.
   */
  const existingResponse =
    Array.isArray(session.taskResponses)
      ? session.taskResponses.find(
          function (response) {
            return (
              response.taskId ===
              config.taskId
            );
          }
        )
      : null;


  if (existingResponse) {
    const matchingInput =
      optionInputs.find(
        function (input) {
          return (
            input.value ===
            existingResponse.answer
          );
        }
      );

    if (matchingInput) {
      matchingInput.checked = true;
    }

    disableTaskInputs();

    continueButton.disabled = false;

    renderRecordedFeedback();
  }


  /*
   * Handle task submission.
   */
  taskForm.addEventListener(
    "submit",
    function (event) {
      event.preventDefault();

      if (
        taskPanel.dataset.submitted ===
        "true"
      ) {
        return;
      }


      /*
       * Find the selected multiple-choice answer.
       */
      const selectedInput =
        optionInputs.find(
          function (input) {
            return input.checked;
          }
        );


      /*
       * Require an answer before submission.
       */
      if (!selectedInput) {
        feedback.textContent =
          "Please select an answer before continuing.";

        feedback.dataset.state =
          "validation";

        return;
      }


      const response =
        selectedInput.value;


      /*
       * Correctness is calculated and stored internally,
       * but is not shown to the participant.
       */
      const isCorrect =
        normaliseAnswer(response) ===
        normaliseAnswer(
          config.correctAnswer
        );


      const taskResponse = {
        taskId:
          config.taskId,

        siteId:
          config.siteId,

        prompt:
          config.prompt,

        answer:
          response,

        correctAnswer:
          config.correctAnswer,

        isCorrect,

        submittedAt:
          new Date().toISOString()
      };


      /*
       * Save the response in the participant session.
       */
      const updatedSession =
        getSession();

      if (updatedSession) {
        const taskResponses =
          Array.isArray(
            updatedSession.taskResponses
          )
            ? updatedSession.taskResponses
            : [];

        /*
         * Remove an existing response for the same
         * task before saving the current response.
         */
        const filteredResponses =
          taskResponses.filter(
            function (existing) {
              return (
                existing.taskId !==
                config.taskId
              );
            }
          );

        filteredResponses.push(
          taskResponse
        );

        updatedSession.taskResponses =
          filteredResponses;

        saveSession(
          updatedSession
        );
      }


      /*
       * Record the task submission as an experiment event.
       */
      logEvent(
        config.siteId,
        "task_submitted",
        taskResponse
      );


      /*
       * Do not tell the participant whether the answer
       * was correct.
       */
      renderRecordedFeedback();

      disableTaskInputs();

      continueButton.disabled = false;

      continueButton.focus();
    }
  );


  /*
   * Advance to the next mock website.
   */
  continueButton.addEventListener(
    "click",
    function () {
      if (
        continueButton.disabled
      ) {
        return;
      }

      config.onContinue();
    }
  );
}