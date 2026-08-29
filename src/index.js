export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Save completed experiment session
    if (
      request.method === "POST" &&
      url.pathname === "/api/session"
    ) {
      try {
        const data = await request.json();

        const participantId = data.participant_id;
        const condition = data.condition;

        if (!participantId || !condition) {
          return Response.json(
            {
              success: false,
              error: "Missing participant_id or condition"
            },
            { status: 400 }
          );
        }

        await env.DB
          .prepare(`
            INSERT INTO experiment_sessions (
              participant_id,
              condition,
              results_json,
              completed_at
            )
            VALUES (?, ?, ?, ?)

            ON CONFLICT(participant_id)
            DO UPDATE SET
              condition = excluded.condition,
              results_json = excluded.results_json,
              completed_at = excluded.completed_at
          `)
          .bind(
            participantId,
            condition,
            JSON.stringify(data),
            data.completed_at || new Date().toISOString()
          )
          .run();

        return Response.json({
          success: true
        });

      } catch (error) {
        console.error(
          "Unable to save experiment session:",
          error
        );

        return Response.json(
          {
            success: false,
            error: "Unable to save experiment session"
          },
          { status: 500 }
        );
      }
    }

    // Everything else = your normal experiment website
    return env.ASSETS.fetch(request);
  }
};