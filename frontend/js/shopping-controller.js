"use strict";

import {
  getSession,
  saveSession,
  logEvent
} from "./experiment-core.js";

import {
  setPrivacyContext
} from "./cookie-interface.js";

import {
  simulateTrackingActivity
} from "./tracking-simulator.js";


const SITE_ID =
  "site3";


/* =========================================================
   PRODUCTS
   ========================================================= */

const PRODUCTS = {

  "cloud-cafe": {
    id: "cloud-cafe",
    name: "Cloud Café Series",
    price: 24.90,
    regularDesigns: 12,
    hasSecret: true,
    availability: "in_stock"
  },

  "moon-bunny": {
    id: "moon-bunny",
    name: "Moon Bunny Series",
    price: 27.90,
    regularDesigns: 12,
    hasSecret: true,
    availability: "in_stock"
  },

  "pocket-garden": {
    id: "pocket-garden",
    name: "Pocket Garden Series",
    price: 22.90,
    regularDesigns: 8,
    hasSecret: true,
    availability: "in_stock"
  },

  "sleepy-monsters": {
    id: "sleepy-monsters",
    name: "Sleepy Monsters Series",
    price: 21.90,
    regularDesigns: 12,
    hasSecret: false,
    availability: "in_stock"
  },

  "starry-friends": {
    id: "starry-friends",
    name: "Starry Friends Series",
    price: 29.90,
    regularDesigns: 10,
    hasSecret: true,
    availability: "in_stock"
  },

  "mini-bakery": {
    id: "mini-bakery",
    name: "Mini Bakery Series",
    price: 23.90,
    regularDesigns: 10,
    hasSecret: true,
    availability: "sold_out"
  }

};


/* =========================================================
   FICTIONAL DEMO ACCOUNT
   ========================================================= */

const DEMO_EMAIL =
  "jamie.taylor@example.test";

const DEMO_PASSWORD =
  "Demo1234";


/* =========================================================
   SHOPPING STATE
   ========================================================= */

function createInitialState() {

  return {

    taskProgress:
      0,

    cartProductId:
      null,

    signedIn:
      false,

    selectedDeliveryOption:
      null,

    completed:
      false

  };

}


function getShoppingState(
  session
) {

  const stored =
    session?.shoppingState;


  if (
    !stored ||
    typeof stored !==
      "object"
  ) {

    return createInitialState();

  }


  return {

    ...createInitialState(),

    ...stored

  };

}


function saveShoppingState(
  state
) {

  const session =
    getSession();


  if (
    !session
  ) {

    return;

  }


  /*
   * Only safe structural experiment state is stored.
   *
   * Raw email/password values are never persisted.
   */
  session.shoppingState = {

    taskProgress:
      state.taskProgress,

    cartProductId:
      state.cartProductId,

    signedIn:
      state.signedIn,

    selectedDeliveryOption:
      state.selectedDeliveryOption,

    completed:
      state.completed

  };


  saveSession(
    session
  );

}


/* =========================================================
   PRODUCT HELPERS
   ========================================================= */

function productMeetsTaskOne(
  product
) {

  return Boolean(

    product &&

    product.price <
      25 &&

    product.regularDesigns >=
      10 &&

    product.hasSecret ===
      true &&

    product.availability ===
      "in_stock"

  );

}


function formatPrice(
  value
) {

  return (
    `$${Number(
      value
    ).toFixed(
      2
    )}`
  );

}


/* =========================================================
   MAIN CONTROLLER
   ========================================================= */

export function initialiseShoppingController(
  config = {}
) {

  const siteId =
    config.siteId ||
    SITE_ID;


  const onContinue =

    typeof config.onContinue ===
      "function"

      ? config.onContinue

      : function () {};


  const session =
    getSession();


  if (
    !session
  ) {

    throw new Error(
      "No experiment session exists for the shopping controller."
    );

  }


  let state =
    getShoppingState(
      session
    );


  let loginAttemptNumber =
    0;


  let toastTimer =
    null;


  /*
   * Suggestions are interaction-driven.
   *
   * cookie-interface.js decides whether a contextual
   * suggestion is actually shown.
   */
  function triggerPrivacyContext(
    contextName,
    metadata = {}
  ) {

    setPrivacyContext(
      siteId,
      contextName,
      metadata
    );

  }


  /* =======================================================
     DOM REFERENCES
     ======================================================= */

  const taskBox =
    document.getElementById(
      "shoppingTaskBox"
    );

  const taskPanel =
    document.getElementById(
      "shoppingTaskPanel"
    );

  const taskInstruction =
    document.getElementById(
      "shoppingTaskInstruction"
    );

  const taskDetails =
    document.getElementById(
      "shoppingTaskDetails"
    );

  const taskFeedback =
    document.getElementById(
      "shoppingTaskFeedback"
    );

  const collapseButton =
    document.getElementById(
      "shoppingTaskCollapseButton"
    );

  const finishButton =
    document.getElementById(
      "shoppingFinishButton"
    );

  const accountButton =
    document.getElementById(
      "boxdropAccountButton"
    );

  const cartButton =
    document.getElementById(
      "boxdropCartButton"
    );

  const cartCount =
    document.getElementById(
      "boxdropCartCount"
    );

  const cartSection =
    document.getElementById(
      "cartSection"
    );

  const emptyCart =
    document.getElementById(
      "boxdropEmptyCart"
    );

  const cartContents =
    document.getElementById(
      "boxdropCartContents"
    );

  const cartProductName =
    document.getElementById(
      "boxdropCartProductName"
    );

  const cartProductPrice =
    document.getElementById(
      "boxdropCartProductPrice"
    );

  const accountSection =
    document.getElementById(
      "accountSection"
    );

  const demoLoginForm =
    document.getElementById(
      "demoLoginForm"
    );

  const demoEmail =
    document.getElementById(
      "demoEmail"
    );

  const demoPassword =
    document.getElementById(
      "demoPassword"
    );

  const demoLoginFeedback =
    document.getElementById(
      "demoLoginFeedback"
    );

  const demoSignedInState =
    document.getElementById(
      "demoSignedInState"
    );

  const deliverySection =
    document.getElementById(
      "deliverySection"
    );

  const confirmDeliveryButton =
    document.getElementById(
      "confirmDeliveryButton"
    );

  const deliveryOptionFeedback =
    document.getElementById(
      "deliveryOptionFeedback"
    );

  const completeSection =
    document.getElementById(
      "shoppingCompleteSection"
    );

  const toast =
    document.getElementById(
      "shoppingToast"
    );


  const requiredElements = [

    taskBox,
    taskPanel,
    taskInstruction,
    taskDetails,
    taskFeedback,
    collapseButton,
    finishButton,

    accountButton,
    cartButton,
    cartCount,

    cartSection,
    emptyCart,
    cartContents,
    cartProductName,
    cartProductPrice,

    accountSection,
    demoLoginForm,
    demoEmail,
    demoPassword,
    demoLoginFeedback,
    demoSignedInState,

    deliverySection,
    confirmDeliveryButton,
    deliveryOptionFeedback,

    completeSection

  ];


  if (
    requiredElements.some(
      element => !element
    )
  ) {

    throw new Error(
      "One or more required BOXDROP elements could not be found."
    );

  }


  /* =======================================================
     UI HELPERS
     ======================================================= */

  function showToast(
    message
  ) {

    if (
      !toast
    ) {

      return;

    }


    if (
      toastTimer
    ) {

      window.clearTimeout(
        toastTimer
      );

    }


    toast.textContent =
      message;


    toast.hidden =
      false;


    toastTimer =
      window.setTimeout(
        function () {

          toast.hidden =
            true;

          toast.textContent =
            "";

        },
        2000
      );

  }


  function scrollToElement(
    element
  ) {

    if (
      !element
    ) {

      return;

    }


    window.setTimeout(
      function () {

        element.scrollIntoView(
          {

            behavior:
              "smooth",

            block:
              "center"

          }
        );

      },
      150
    );

  }


  function saveProgress(
    progress
  ) {

    state.taskProgress =
      Math.max(

        state.taskProgress,

        Math.min(
          3,
          Number(
            progress
          ) ||
          0
        )

      );


    /*
     * Safe structural task state used by
     * cookie-interface.js.
     */
    document.body.dataset
      .shoppingTaskProgress =
        String(
          state.taskProgress
        );


    saveShoppingState(
      state
    );

  }


  function setTaskCollapsed(
    collapsed
  ) {

    taskPanel.dataset.collapsed =
      collapsed
        ? "true"
        : "false";


    collapseButton.textContent =
      collapsed
        ? "+"
        : "−";


    collapseButton.setAttribute(
      "aria-expanded",
      collapsed
        ? "false"
        : "true"
    );


    collapseButton.setAttribute(
      "aria-label",

      collapsed
        ? "Expand website task"
        : "Collapse website task"
    );

  }


  /* =======================================================
     RENDER TASK
     ======================================================= */

  function renderTask() {

    document.body.dataset
      .shoppingTaskProgress =
        String(
          state.taskProgress
        );


    taskFeedback.textContent =
      "";


    taskFeedback.dataset.state =
      "";


    finishButton.hidden =
      true;


    taskBox.dataset.taskComplete =
      "false";


    if (
      state.taskProgress ===
      0
    ) {

      taskInstruction.textContent =
        "Find a blind-box series under $25 with at least 10 regular designs and a possible secret figure. Add one suitable box to your cart.";


      taskDetails.innerHTML = `
        <span>
          Shopping task 1 of 3
        </span>
      `;


      return;

    }


    if (
      state.taskProgress ===
      1
    ) {

      taskInstruction.textContent =
        "Sign in using the fictional demo account shown in the account section. Do not use your own details.";


      taskDetails.innerHTML = `
        <span>
          Shopping task 2 of 3
        </span>
      `;


      return;

    }


    if (
      state.taskProgress ===
      2
    ) {

      taskInstruction.textContent =
        "Choose the fastest delivery option that costs less than $15.";


      taskDetails.innerHTML = `
        <span>
          Shopping task 3 of 3
        </span>
      `;


      return;

    }


    taskInstruction.textContent =
      "All three shopping tasks have been completed.";


    taskDetails.innerHTML = `
      <span>
        Shopping tasks complete
      </span>
    `;


    taskFeedback.textContent =
      "Responses recorded.";


    taskFeedback.dataset.state =
      "recorded";


    taskBox.dataset.taskComplete =
      "true";


    finishButton.hidden =
      false;

  }


  /* =======================================================
     RENDER CART
     ======================================================= */

  function renderCart() {

    const product =

      state.cartProductId

        ? PRODUCTS[
            state.cartProductId
          ]

        : null;


    if (
      !product
    ) {

      emptyCart.hidden =
        false;


      cartContents.hidden =
        true;


      cartCount.textContent =
        "0";


      cartProductName.textContent =
        "";


      cartProductPrice.textContent =
        "";


      return;

    }


    emptyCart.hidden =
      true;


    cartContents.hidden =
      false;


    cartProductName.textContent =
      product.name;


    cartProductPrice.textContent =
      formatPrice(
        product.price
      );


    cartCount.textContent =
      "1";

  }


  /* =======================================================
     RENDER ACCOUNT
     ======================================================= */

  function renderAccount() {

    accountSection.hidden =
      state.taskProgress <
      1;


    demoLoginForm.hidden =
      state.signedIn;


    demoSignedInState.hidden =
      !state.signedIn;

  }


  /* =======================================================
     RENDER DELIVERY
     ======================================================= */

  function renderDelivery() {

    deliverySection.hidden =
      !(
        state.signedIn &&
        state.taskProgress >=
          2
      );


    completeSection.hidden =
      !(
        state.completed ||
        state.taskProgress >=
          3
      );


    if (
      state.selectedDeliveryOption
    ) {

      const restoredOption =
        document.querySelector(
          `input[name="deliveryOption"][value="${state.selectedDeliveryOption}"]`
        );


      if (
        restoredOption
      ) {

        restoredOption.checked =
          true;

      }

    }

  }


  /* =======================================================
     PRODUCT DETAILS
     ======================================================= */

  document
    .querySelectorAll(
      '[data-action="toggle_product_details"]'
    )
    .forEach(
      function (
        button
      ) {

        button.addEventListener(
          "click",
          function () {

            const productId =
              button.dataset
                .productId;


            const details =
              document.querySelector(
                `[data-details-for="${productId}"]`
              );


            if (
              !details
            ) {

              return;

            }


            const opening =
              details.hidden;


            details.hidden =
              !opening;


            button.textContent =
              opening
                ? "Hide details"
                : "View details";


            button.setAttribute(
              "aria-expanded",
              opening
                ? "true"
                : "false"
            );


            if (
              opening
            ) {

              logEvent(
                siteId,
                "product_viewed",
                {

                  productId,

                  taskProgress:
                    state.taskProgress

                }
              );


              /*
               * Ordinary analytics tracking.
               *
               * This mock tracker respects the current
               * analytics-cookie preference.
               */
              const tracking =
                simulateTrackingActivity(
                  siteId,
                  {

                    trackingId:
                      "site3_product_view_analytics",

                    trackerType:
                      "analytics",

                    cookieCategory:
                      "analytics",

                    dataCategory:
                      "product_interest",

                    dataLabel:
                      "Product viewed",

                    purpose:
                      "Measure product engagement",

                    purposeClass:
                      "analytics_measurement",

                    disclosureStatus:
                      "disclosed",

                    consentRelevant:
                      true,

                    respectsPreference:
                      true,

                    privacyContext:
                      "product_browsing",

                    metadata: {

                      productId

                    }

                  }
                );


              triggerPrivacyContext(
                "product_browsing",
                {

                  trigger:
                    "product_details_opened",

                  interaction:
                    "view_product",

                  productId,

                  taskProgress:
                    state.taskProgress,

                  tracking

                }
              );

            }

          }
        );

      }
    );


  /* =======================================================
     ADD TO CART
     ======================================================= */

  document
    .querySelectorAll(
      '[data-action="add_to_cart"]'
    )
    .forEach(
      function (
        button
      ) {

        button.addEventListener(
          "click",
          function () {

            const productId =
              button.dataset
                .productId;


            const product =
              PRODUCTS[
                productId
              ];


            if (
              !product ||
              product.availability !==
                "in_stock"
            ) {

              return;

            }


            const correct =
              productMeetsTaskOne(
                product
              );


            state.cartProductId =
              product.id;


            saveShoppingState(
              state
            );


            renderCart();


            logEvent(
              siteId,
              "product_added_to_cart",
              {

                productId:
                  product.id,

                taskOneCriteriaMet:
                  correct,

                taskProgress:
                  state.taskProgress

              }
            );


            /*
             * A cart action is also an analytics signal.
             *
             * This provides tracking ground truth even if
             * the participant adds a product without first
             * pressing View details.
             */
            const cartTracking =
              simulateTrackingActivity(
                siteId,
                {

                  trackingId:
                    "site3_cart_activity_analytics",

                  trackerType:
                    "analytics",

                  cookieCategory:
                    "analytics",

                  dataCategory:
                    "cart_activity",

                  dataLabel:
                    "Product added to cart",

                  purpose:
                    "Measure shopping engagement",

                  purposeClass:
                    "analytics_measurement",

                  disclosureStatus:
                    "disclosed",

                  consentRelevant:
                    true,

                  respectsPreference:
                    true,

                  privacyContext:
                    "product_browsing",

                  metadata: {

                    productId:
                      product.id

                  }

                }
              );


            triggerPrivacyContext(
              "product_browsing",
              {

                trigger:
                  "product_added_to_cart",

                interaction:
                  "add_to_cart",

                productId:
                  product.id,

                taskProgress:
                  state.taskProgress,

                tracking:
                  cartTracking

              }
            );


            if (
              state.taskProgress ===
              0
            ) {

              if (
                !correct
              ) {

                taskFeedback.textContent =
                  "That item does not meet all of the task requirements. Try another series.";


                taskFeedback.dataset.state =
                  "validation";


                showToast(
                  "That series does not meet all task requirements."
                );


                return;

              }


              saveProgress(
                1
              );


              logEvent(
                siteId,
                "shopping_task_completed",
                {

                  taskId:
                    "site3_find_product",

                  taskNumber:
                    1,

                  success:
                    true,

                  productId:
                    product.id

                }
              );


              taskFeedback.textContent =
                "Item added. Task recorded.";


              taskFeedback.dataset.state =
                "recorded";


              showToast(
                "Item added to cart."
              );


              renderAccount();


              window.setTimeout(
                function () {

                  renderTask();


                  scrollToElement(
                    accountSection
                  );

                },
                650
              );


              return;

            }


            showToast(
              `${product.name} added to cart.`
            );

          }
        );

      }
    );


  /* =======================================================
     CART
     ======================================================= */

  cartButton.addEventListener(
    "click",
    function () {

      logEvent(
        siteId,
        "cart_opened",
        {

          hasItem:
            Boolean(
              state.cartProductId
            ),

          productId:
            state.cartProductId,

          taskProgress:
            state.taskProgress

        }
      );


      if (
        state.cartProductId
      ) {

        triggerPrivacyContext(
          "product_browsing",
          {

            trigger:
              "cart_opened",

            interaction:
              "view_cart",

            productId:
              state.cartProductId,

            taskProgress:
              state.taskProgress

          }
        );

      }


      scrollToElement(
        cartSection
      );

    }
  );


  /* =======================================================
     ACCOUNT
     ======================================================= */

  accountButton.addEventListener(
    "click",
    function () {

      logEvent(
        siteId,
        "demo_login_opened",
        {

          taskProgress:
            state.taskProgress,

          alreadySignedIn:
            state.signedIn

        }
      );


      if (
        state.taskProgress <
        1
      ) {

        showToast(
          "Complete the first shopping task to continue."
        );


        return;

      }


      scrollToElement(
        accountSection
      );

    }
  );


  /* =======================================================
     DEMO LOGIN
     ======================================================= */

  demoLoginForm.addEventListener(
    "submit",
    function (
      event
    ) {

      event.preventDefault();


      if (
        state.signedIn
      ) {

        return;

      }


      loginAttemptNumber +=
        1;


      /*
       * Values are used only for immediate validation.
       *
       * They are never logged or persisted.
       */
      const success =

        demoEmail
          .value
          .trim() ===
          DEMO_EMAIL &&

        demoPassword
          .value ===
          DEMO_PASSWORD;


      logEvent(
        siteId,
        "demo_login_attempt",
        {

          success,

          attemptNumber:
            loginAttemptNumber,

          taskProgress:
            state.taskProgress

        }
      );


      if (
        !success
      ) {

        demoLoginFeedback.textContent =
          "Those details do not match the demo account shown beside the form.";


        return;

      }


      state.signedIn =
        true;


      saveShoppingState(
        state
      );


      /*
       * Remove fictional credentials immediately.
       */
      demoEmail.value =
        "";


      demoPassword.value =
        "";


      demoLoginFeedback.textContent =
        "";


      /*
       * ACCOUNT-LINKED ACTIVITY
       *
       * This deliberately does not depend on optional
       * cookies.
       */
      const accountTracking =
        simulateTrackingActivity(
          siteId,
          {

            trackingId:
              "site3_account_linkage",

            trackerType:
              "first_party_account",

            cookieCategory:
              null,

            dataCategory:
              "account_linked_activity",

            dataLabel:
              "Shopping activity linked to the demo account",

            purpose:
              "Maintain the signed-in shopping session",

            purposeClass:
              "service_function",

            disclosureStatus:
              "disclosed",

            consentRelevant:
              false,

            respectsPreference:
              true,

            privacyContext:
              "account"

          }
        );


      triggerPrivacyContext(
        "account",
        {

          trigger:
            "demo_login_success",

          interaction:
            "account_linked",

          taskProgress:
            state.taskProgress,

          tracking:
            accountTracking

        }
      );


      renderAccount();


      if (
        state.taskProgress ===
        1
      ) {

        saveProgress(
          2
        );


        logEvent(
          siteId,
          "shopping_task_completed",
          {

            taskId:
              "site3_demo_sign_in",

            taskNumber:
              2,

            success:
              true

          }
        );


        logEvent(
          siteId,
          "checkout_started",
          {

            productId:
              state.cartProductId,

            taskProgress:
              2

          }
        );


        taskFeedback.textContent =
          "Sign-in recorded.";


        taskFeedback.dataset.state =
          "recorded";


        showToast(
          "Demo account signed in."
        );


        renderDelivery();


        window.setTimeout(
          function () {

            renderTask();


            scrollToElement(
              deliverySection
            );

          },
          650
        );

      }

    }
  );


  /* =======================================================
     DELIVERY
     ======================================================= */

  confirmDeliveryButton.addEventListener(
    "click",
    function () {

      const selected =
        document.querySelector(
          'input[name="deliveryOption"]:checked'
        );


      if (
        !selected
      ) {

        deliveryOptionFeedback.textContent =
          "Please select a delivery option.";


        return;

      }


      /*
       * DELIBERATE SECONDARY-USE CASE
       *
       * The fixed fictional location is reused by a mock
       * advertising tracker.
       *
       * The tracker intentionally ignores the participant's
       * advertising-cookie preference.
       *
       * If Advertising is disabled this therefore becomes a
       * known preference mismatch.
       *
       * No real location is collected.
       */
      const deliveryTracking =
        simulateTrackingActivity(
          siteId,
          {

            trackingId:
              "site3_delivery_location_advertising",

            trackerType:
              "advertising",

            cookieCategory:
              "advertising",

            dataCategory:
              "mock_delivery_location",

            dataLabel:
              "Mock delivery location: Perth WA 6000",

            purpose:
              "Personalise advertising",

            purposeClass:
              "secondary_use",

            disclosureStatus:
              "not_explicitly_disclosed",

            consentRelevant:
              true,

            respectsPreference:
              false,

            privacyContext:
              "delivery"

          }
        );


      triggerPrivacyContext(
        "delivery",
        {

          trigger:
            "delivery_confirm_clicked",

          interaction:
            "confirm_delivery",

          mockLocation:
            "Perth WA 6000",

          taskProgress:
            state.taskProgress,

          tracking:
            deliveryTracking

        }
      );


      const option =
        selected.value;


      const correct =
        option ===
        "express";


      state.selectedDeliveryOption =
        option;


      saveShoppingState(
        state
      );


      logEvent(
        siteId,
        "delivery_option_selected",
        {

          option,

          correct,

          taskProgress:
            state.taskProgress

        }
      );


      if (
        !correct
      ) {

        deliveryOptionFeedback.textContent =
          "That option does not meet the task requirements. Check both the price and delivery time.";


        return;

      }


      deliveryOptionFeedback.textContent =
        "";


      if (
        state.taskProgress <
        3
      ) {

        saveProgress(
          3
        );


        state.completed =
          true;


        saveShoppingState(
          state
        );


        logEvent(
          siteId,
          "shopping_task_completed",
          {

            taskId:
              "site3_delivery_option",

            taskNumber:
              3,

            success:
              true,

            deliveryOption:
              "express"

          }
        );


        showToast(
          "All shopping tasks complete."
        );


        renderDelivery();


        renderTask();


        scrollToElement(
          completeSection
        );

      }

    }
  );


  /* =======================================================
     FINISH
     ======================================================= */

  finishButton.addEventListener(
    "click",
    function () {

      if (
        !state.completed ||
        state.taskProgress <
          3
      ) {

        return;

      }


      logEvent(
        siteId,
        "shopping_site_finished",
        {

          completed:
            true,

          taskProgress:
            state.taskProgress

        }
      );


      onContinue();

    }
  );


  /* =======================================================
     TASK COLLAPSE
     ======================================================= */

  collapseButton.addEventListener(
    "click",
    function () {

      const collapsed =

        taskPanel.dataset
          .collapsed ===
        "true";


      setTaskCollapsed(
        !collapsed
      );


      logEvent(
        siteId,

        collapsed
          ? "shopping_task_opened"
          : "shopping_task_collapsed",

        {

          taskProgress:
            state.taskProgress

        }
      );

    }
  );


  /* =======================================================
     COOKIE INTERFACE + MOBILE TASK CARD
     ======================================================= */

  const cookieBanner =
    document.getElementById(
      "cookieBanner"
    );


  const narrowLayout =
    window.matchMedia(
      "(max-width: 1000px)"
    );


  function syncTaskWithCookieBanner() {

    if (
      !narrowLayout.matches
    ) {

      setTaskCollapsed(
        false
      );


      return;

    }


    const cookieInterfaceOpen =
      Boolean(

        cookieBanner &&

        !cookieBanner
          .classList
          .contains(
            "hidden"
          )

      );


    setTaskCollapsed(
      cookieInterfaceOpen
    );

  }


  if (
    cookieBanner &&
    typeof MutationObserver !==
      "undefined"
  ) {

    const observer =
      new MutationObserver(
        syncTaskWithCookieBanner
      );


    observer.observe(
      cookieBanner,
      {

        attributes:
          true,

        attributeFilter: [
          "class",
          "style"
        ]

      }
    );

  }


  if (
    typeof narrowLayout
      .addEventListener ===
    "function"
  ) {

    narrowLayout.addEventListener(
      "change",
      syncTaskWithCookieBanner
    );

  }


  /* =======================================================
     INITIAL RENDER
     ======================================================= */

  saveProgress(
    state.taskProgress
  );


  if (
    state.taskProgress >=
    3
  ) {

    state.completed =
      true;


    saveShoppingState(
      state
    );

  }


  renderCart();


  renderAccount();


  renderDelivery();


  renderTask();


  syncTaskWithCookieBanner();


  /*
   * Do not automatically infer a Suggestions context after
   * refresh. A new meaningful interaction should occur.
   */
  logEvent(
    siteId,
    "shopping_controller_initialised",
    {

      taskProgress:
        state.taskProgress,

      restoredState:
        Boolean(
          session.shoppingState
        )

    }
  );

}