// Sends action_request messages (section 4c of the overview doc) downstream and
// returns the action_result (section 4d). Brain Layer does not care whether the
// thing on the other end is the Safety Layer or, for isolated testing, the
// bundled mock Data Layer — same contract either way.

const DOWNSTREAM_URL = process.env.DOWNSTREAM_URL || "http://localhost:5003";

/**
 * @param {object} actionRequest - matches the action_request shape (section 4c)
 * @returns {Promise<object>} action_result (section 4d)
 */
export async function sendActionRequest(actionRequest) {
  try {
    const res = await fetch(`${DOWNSTREAM_URL}/action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(actionRequest),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return {
        type: "action_result",
        success: false,
        data: null,
        error: `downstream_error_${res.status}: ${text || res.statusText}`,
        session_id: actionRequest.session_id,
      };
    }

    const result = await res.json();
    return result;
  } catch (err) {
    return {
      type: "action_result",
      success: false,
      data: null,
      error: `downstream_unreachable: ${err.message}`,
      session_id: actionRequest.session_id,
    };
  }
}
