"use strict";

import {
  getSession,
  saveSession,
  logEvent
} from "./experiment-core.js";

import {
  setPrivacyContext
} from "./cookie-interface.js";


const SITE_ID = "site3";


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
   * Do not deduplicate contexts here.
   *
   * cookie-interface.js decides whether the current
   * suggestion should update, remain visible, or reappear
   * after the participant has dismissed it.
   *
   * This means a later meaningful interaction can trigger
   * the same context again after dismissal.
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


    /* -------------------------
       TASK 1
       ------------------------- */

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


    /* -------------------------
       TASK 2
       ------------------------- */

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


    /* -------------------------
       TASK 3
       ------------------------- */

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


    /* -------------------------
       COMPLETE
       ------------------------- */

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


    /*
     * Restore a previously selected delivery option
     * after a refresh.
     */
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


            /*
             * Only opening the product is treated as
             * viewing it.
             */
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
               * NEW:
               *
               * The shopping/privacy suggestion appears
               * because the participant actually viewed a
               * product — not because BOXDROP loaded.
               */
              triggerPrivacyContext(
                "product_browsing",
                {

                  trigger:
                    "product_details_opened",

                  interaction:
                    "view_product",

                  productId,

                  taskProgress:
                    state.taskProgress

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
             * Adding something to the cart is another
             * meaningful shopping/tracking signal.
             *
             * If a product suggestion was previously
             * dismissed, this new interaction may cause it
             * to reappear.
             */
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
                  state.taskProgress

              }
            );


            /*
             * Only evaluate Task 1 while Task 1 is active.
             */
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


              /*
               * IMPORTANT:
               *
               * Do NOT switch the Suggestions context to
               * account here.
               *
               * The account suggestion should appear only
               * after the participant actually interacts
               * with the account feature.
               */
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


      /*
       * Opening a populated cart is another genuine
       * shopping interaction.
       */
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


      /*
       * NEW:
       *
       * Account Suggestions now come from an actual account
       * interaction.
       */
      triggerPrivacyContext(
        "account",
        {

          trigger:
            "account_feature_opened",

          interaction:
            "open_account",

          taskProgress:
            state.taskProgress

        }
      );


      scrollToElement(
        accountSection
      );

    }
  );


  /* =======================================================
     DEMO LOGIN
     ======================================================= */

  /*
   * Focusing a demo-account field is an actual account
   * interaction.
   *
   * We pass only the structural interaction. The email or
   * password itself is never passed to the Suggestions
   * system, event log or storage.
   */
  demoLoginForm.addEventListener(
    "focusin",
    function (
      event
    ) {

      if (
        !event.target.matches(
          "input"
        )
      ) {

        return;

      }


      triggerPrivacyContext(
        "account",
        {

          trigger:
            "demo_account_field_focused",

          interaction:
            "use_account_form",

          taskProgress:
            state.taskProgress

        }
      );

    }
  );


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


      /*
       * Submitting the demo sign-in form is another
       * meaningful account interaction.
       *
       * This also lets the account suggestion reappear if
       * the participant dismissed it while filling in the
       * form.
       */
      triggerPrivacyContext(
        "account",
        {

          trigger:
            "demo_login_submitted",

          interaction:
            "submit_account_form",

          taskProgress:
            state.taskProgress

        }
      );


      loginAttemptNumber +=
        1;


      /*
       * These values are used ONLY for immediate fictional
       * demo-account validation.
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
       * Remove the fictional credentials immediately after
       * successful validation.
       */
      demoEmail.value =
        "";


      demoPassword.value =
        "";


      demoLoginFeedback.textContent =
        "";


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


        /*
         * IMPORTANT:
         *
         * Do NOT automatically show the delivery/location
         * Suggestions context here.
         *
         * Merely making the delivery section available is
         * not enough.
         *
         * The participant must actually interact with one
         * of the delivery controls first.
         */
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

  /*
   * The delivery/location suggestion is triggered only by
   * actual interaction with delivery controls.
   *
   * "Perth WA 6000" is fixed fictional content displayed
   * by the mock website.
   *
   * No real participant location is collected or inferred.
   */
  document
    .querySelectorAll(
      'input[name="deliveryOption"]'
    )
    .forEach(
      function (
        option
      ) {

        option.addEventListener(
          "change",
          function () {

            triggerPrivacyContext(
              "delivery",
              {

                trigger:
                  "delivery_option_interacted",

                interaction:
                  "select_delivery_option",

                option:
                  option.value,

                mockLocation:
                  "Perth WA 6000",

                taskProgress:
                  state.taskProgress

              }
            );

          }
        );

      }
    );


  confirmDeliveryButton.addEventListener(
    "click",
    function () {

      /*
       * Confirming delivery is another meaningful delivery
       * interaction.
       *
       * If the location suggestion was dismissed after
       * selecting an option, clicking Confirm can therefore
       * make it reappear.
       */
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
            state.taskProgress

        }
      );


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


      const option =
        selected.value;


      /*
       * Standard = FREE / 5–7 business days
       * Express  = $12.95 / 1–2 business days
       * Priority = $19.95 / next business day
       *
       * Fastest option below $15 = Express.
       */
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


  /*
   * Observe the actual cookie-banner state so reopening
   * cookie settings also collapses the mobile task card.
   */
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
   * IMPORTANT:
   *
   * Do not restore or automatically infer a Suggestions
   * context simply from task progress.
   *
   * On a refreshed page, a new meaningful interaction must
   * occur before a contextual Suggestions message appears.
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