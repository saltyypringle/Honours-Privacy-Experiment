# Honours Privacy Experiment

> **Scope:** This repository contains the **website component** of the experiment, not the complete Qualtrics survey. The consent form, questionnaires, condition assignment, and survey flow were managed in Qualtrics. A Qualtrics `.qsf` export is required to reproduce the full study.

## Experiment overview

Participants completed an initial Qualtrics questionnaire before being assigned to one of three conditions:

- **Control:** Conventional cookie consent interfaces.
- **Automation:** Participants selected a general cookie preference after the first website; this preference was applied on the remaining websites, with the option to review or change it.
- **Suggestions:** Contextual privacy information and suggestions were presented during relevant website interactions.

All participants completed three mock websites in the same order:

1. **PlainPath Travel (`site1.html`)** – common baseline website, with the same cookie interface for all conditions.
2. **VibeCheck (`site2.html`)** – content website themed around “7 × 7 = 49”; the assigned condition is applied.
3. **BOXDROP Collectibles (`site3.html`)** – simulated shopping tasks; the assigned condition continues.

After completing the website tasks, participants returned to Qualtrics for the final questionnaire.

## Technology

- HTML, CSS and JavaScript (including JavaScript modules)
- Cloudflare Workers for serving the experiment and handling completed-session submissions
- Cloudflare D1 (SQLite) for storing completed website-session records
- Qualtrics for consent, survey questions, and experimental assignment (**managed separately**)

## Repository structure

```text
.
├── frontend/
│   ├── index.html                  # Website-task entry page
│   ├── site1.html                  # PlainPath Travel (baseline)
│   ├── site2.html                  # VibeCheck
│   ├── site3.html                  # BOXDROP Collectibles
│   ├── transition.html             # Between-site instructions and automation setup
│   ├── complete.html               # Submission and return-to-survey page
│   ├── css/                        # Page stylesheets
│   └── js/
│       ├── experiment-core.js      # Session management and event logging
│       ├── site-controller.js      # Website tasks and navigation
│       ├── cookie-interface.js     # Consent interfaces and interventions
│       ├── task-controller.js      # Multiple-choice task behaviour
│       ├── tracking-simulator.js   # Simulated website tracking events
│       ├── shopping-controller.js  # Final shopping task interactions
│       └── results-summary.js      # Completed-session summary
├── src/
│   └── index.js                    # Worker API endpoint (/api/session)
├── wrangler.jsonc                  # Cloudflare Worker and D1 configuration
├── index.html                      # Root redirect (for alternative static hosting)
└── README.md
```

Other frontend assets and styles are retained alongside these files. The optional `schema.sql` supplied separately with this README is a **new, minimal development schema**, not an export of the original research database.

## Run the website component locally

**Prerequisites:** Node.js and npm. Wrangler can be invoked using `npx`; no application build step is required for the HTML/JavaScript frontend.

1. Clone the repository and move into the project directory:

   ```bash
   git clone https://github.com/saltyypringle/Honours-Privacy-Experiment.git
   cd Honours-Privacy-Experiment
   ```

2. Create the local D1 table. Save the accompanying `schema.sql` in the project root, then run:

   ```bash
   npx wrangler d1 execute honours-privacy-data --local --file=./schema.sql
   ```

3. Start the development server:

   ```bash
   npx wrangler dev
   ```

4. Open the local experiment with a **test-only** participant ID and one of the three conditions:

   ```text
   http://127.0.0.1:8787/?pid=TEST_000001&condition=control
   http://127.0.0.1:8787/?pid=TEST_000002&condition=automation
   http://127.0.0.1:8787/?pid=TEST_000003&condition=suggestions
   ```

   The `pid` must be 6–64 characters and contain only letters, numbers, underscores, or hyphens. The accepted `condition` values are exactly `control`, `automation`, and `suggestions`.

5. Complete the three tasks and check that the final page successfully submits the session. To inspect local results:

   ```bash
   npx wrangler d1 execute honours-privacy-data --local --command="SELECT participant_id, condition, completed_at FROM experiment_sessions;"
   ```

**Important:** Local D1 data are separate from the deployed research database. Use `--local` for development commands. Do not submit test responses to the original deployed experiment, as doing so could contaminate research records.

## Data collection and storage

The website component logs predefined actions such as cookie decisions, interface interactions, task responses, and event timing in the browser's session storage. At the completion page, a participant-level JSON record is sent to `POST /api/session`. The Cloudflare Worker saves this record into the D1 `experiment_sessions` table, keyed by participant ID.

Qualtrics survey responses are stored separately in Qualtrics. The participant identifier is used to match survey and website records during analysis. The mock websites are designed not to save values typed into simulated personal-information forms; the tracking simulator models website tracking events rather than implementing real third-party advertising trackers.

## Reproducing the complete study

The GitHub source alone is **not sufficient** to recreate the full participant journey. A full handover also needs:

1. The **Qualtrics_Export `.qsf` export**, containing the survey questions, blocks, Survey Flow, and embedded-data configuration (but not participant responses).
2. The Qualtrics-to-website launch configuration: the URL passes `pid` and `condition` as query parameters. Check the links and any account-specific settings after importing the `.qsf` file.
3. A Cloudflare D1 database with the required table schema and an updated `database_id` in `wrangler.jsonc` for the new Cloudflare account.
4. If needed for analysis, separately provided, appropriately de-identified Qualtrics response exports and D1 experiment records, subject to research ethics and data-management requirements.

The original Qualtrics survey is closed to new participants. A copied survey can be used for reconstruction or testing without reopening the original research collection.

## Deployment notes

`wrangler.jsonc` references the original Cloudflare D1 database. Anyone deploying their own copy should create a new D1 database, replace the database ID with their own, apply the schema, and deploy their Worker using Wrangler. Do not repurpose the original production database for testing.

## Research and privacy notes

The mock websites were developed for an academic experiment. Do not submit real personal details or payment information to the simulated shopping forms. Do not commit real participant responses, identifying data, account credentials, or raw production database exports to a public repository.

## Licence

The repository includes an MIT licence. Refer to `LICENSE` for the terms applying to the source code.