import { initBotId } from "botid/client/core";

/**
 * Vercel BotID: invisible bot check attached to these requests.
 * Server Actions POST to the page that renders the form, so protect those pages.
 * Every protected path must also call checkBotId() on the server.
 */
initBotId({
  protect: [
    { path: "/membership", method: "POST" },
    { path: "/interest", method: "POST" },
  ],
});
