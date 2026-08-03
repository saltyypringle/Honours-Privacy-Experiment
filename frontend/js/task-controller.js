"use strict";

import { getSession, saveSession, logEvent } from "../experiment-core.js";

function normaliseAnswer(value) {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

function ensureTaskPanel(nextBox) {
  let taskPanel = nextBox.querySelector(".task-panel");

  if (!taskPanel) {
    taskPanel = document.createElement("section");
    taskPanel.className = "task-panel";
    nextBox.insertBefore(taskPanel, nextBox.firstChild);
  }

  return taskPanel;
}

export function initialiseTaskController(config) {
  const session = getSession();

  if (!session) {
    console.error("No study session exists for task controller.");
    return;
  }

  const nextBox = document.querySelector(".next-box");
  const continueButton = document.getElementById(config.continueButtonId);

  if (!nextBox || !continueButton) {
    return;
  }

  const taskPanel = ensureTaskPanel(nextBox);

  taskPanel.innerHTML = `
    <h3>${config.heading}</h3>
    <p class="task-instruction">${config.prompt}</p>
    <form class="task-form" novalidate>
      <label class="task-answer-label" for="${config.answerInputId}">Your answer</label>
      <input
        id="${config.answerInputId}"
        class="task-answer-input"
        type="text"
        autocomplete="off"
        spellcheck="false"
        placeholder="Type your answer here"
      />
      <button type="submit" class="task-submit-button">Submit answer</button>
      <p class="task-feedback" aria-live="polite"></p>
    </form>
  `;

  const taskForm = taskPanel.querySelector(".task-form");
  const answerInput = taskPanel.querySelector(".task-answer-input");
  const feedback = taskPanel.querySelector(".task-feedback");
  const submitButton = taskPanel.querySelector(".task-submit-button");

  continueButton.disabled = true;
  continueButton.classList.add("task-continue-button");

  function renderFeedback(message, isCorrect) {
    feedback.textContent = message;
    feedback.dataset.state = isCorrect ? "correct" : "incorrect";
    taskPanel.dataset.submitted = "true";
  }

  const existingResponse = Array.isArray(session.taskResponses)
    ? session.taskResponses.find(function (response) {
        return response.taskId === config.taskId;
      })
    : null;

  if (existingResponse) {
    answerInput.value = existingResponse.answer;
    answerInput.disabled = true;
    submitButton.disabled = true;
    continueButton.disabled = false;
    renderFeedback(
      existingResponse.isCorrect
        ? "Answer recorded. That is correct."
        : "Answer recorded. Review the page if you want to compare it with the page text.",
      existingResponse.isCorrect
    );
  }

  taskForm.addEventListener("submit", function (event) {
    event.preventDefault();

    if (taskPanel.dataset.submitted === "true") {
      return;
    }

    const response = answerInput.value.trim();

    if (!response) {
      feedback.textContent = "Please enter an answer before continuing.";
      feedback.dataset.state = "incorrect";
      return;
    }

    const isCorrect =
      normaliseAnswer(response) === normaliseAnswer(config.correctAnswer);

    const taskResponse = {
      taskId: config.taskId,
      siteId: config.siteId,
      prompt: config.prompt,
      answer: response,
      correctAnswer: config.correctAnswer,
      isCorrect,
      submittedAt: new Date().toISOString()
    };

    const updatedSession = getSession();

    if (updatedSession) {
      const taskResponses = Array.isArray(updatedSession.taskResponses)
        ? updatedSession.taskResponses
        : [];

      taskResponses.push(taskResponse);
      updatedSession.taskResponses = taskResponses;
      saveSession(updatedSession);
    }

    logEvent(config.siteId, "task_submitted", taskResponse);

    renderFeedback(
      isCorrect
        ? "Answer recorded. That is correct."
        : "Answer recorded. Review the page if you want to compare it with the page text.",
      isCorrect
    );

    answerInput.disabled = true;
    submitButton.disabled = true;
    continueButton.disabled = false;
    continueButton.focus();
  });

  continueButton.addEventListener("click", function () {
    if (continueButton.disabled) {
      return;
    }

    config.onContinue();
  });
}