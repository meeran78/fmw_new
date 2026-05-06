import "server-only";
import axios, { AxiosError } from "axios";

function throwSendbirdError(err: unknown): never {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as
      | { message?: string; code?: number; error?: boolean }
      | undefined;
    const detail =
      typeof data?.message === "string"
        ? data.message
        : err.message || `HTTP ${err.response?.status ?? "?"}`;
    throw new Error(`Sendbird: ${detail}`);
  }
  throw err;
}

function getSendbirdCredentials() {
  const appId = process.env.NEXT_PUBLIC_SENDBIRD_APP_ID;
  const apiToken =
    process.env.SENDBIRD_API_TOKEN ?? process.env.NEXT_PUBLIC_SENDBIRD_API_TOKEN;
  if (!appId || !apiToken) {
    throw new Error(
      "Sendbird is not configured (NEXT_PUBLIC_SENDBIRD_APP_ID and SENDBIRD_API_TOKEN)"
    );
  }
  return { appId, apiToken };
}

function isSendbirdUserMissing(err: unknown): boolean {
  if (!axios.isAxiosError(err)) return false;
  const ax = err as AxiosError<{ message?: string }>;
  const status = ax.response?.status;
  const msg = String(ax.response?.data?.message ?? "").toLowerCase();
  if (status === 404) return true;
  if (status === 400 && msg.includes("not found") && msg.includes("user"))
    return true;
  return false;
}

/** Ensure user exists in Sendbird (create or update nickname). */
export async function ensureSendbirdUser(userId: string, nickname: string) {
  const { appId, apiToken } = getSendbirdCredentials();
  const base = `https://api-${appId}.sendbird.com/v3/users`;
  const headers = {
    "Content-Type": "application/json",
    "Api-Token": apiToken,
  };
  const safeNickname = nickname.trim().slice(0, 80) || userId;

  async function patchNickname() {
    await axios.put(
      `${base}/${encodeURIComponent(userId)}`,
      { nickname: safeNickname, profile_url: "" },
      { headers }
    );
  }

  try {
    await axios.get(`${base}/${encodeURIComponent(userId)}`, {
      headers: { "Api-Token": apiToken },
    });
    await patchNickname();
    return;
  } catch (err) {
    if (!isSendbirdUserMissing(err)) {
      throwSendbirdError(err);
    }

    try {
      await axios.post(
        base,
        {
          user_id: userId,
          nickname: safeNickname,
          profile_url: "",
        },
        { headers }
      );
      return;
    } catch (postErr) {
      if (!axios.isAxiosError(postErr)) throw postErr;
      const pmsg = String(
        (postErr.response?.data as { message?: string })?.message ?? ""
      ).toLowerCase();
      const duplicate =
        postErr.response?.status === 400 &&
        (pmsg.includes("already") ||
          pmsg.includes("exist") ||
          pmsg.includes("duplicate"));
      if (duplicate) {
        try {
          await patchNickname();
        } catch {
          /* user exists; nickname update optional */
        }
        return;
      }
      throwSendbirdError(postErr);
    }
  }
}

export async function createDistinctGroupChannel(params: {
  name: string;
  userIds: string[];
  /** Buyer who opened the chat — Sendbird uses this for `created_by` and invitation attribution (otherwise it stays null via Platform API). */
  inviterUserId?: string;
}) {
  if (params.userIds.length < 2) {
    throw new Error("Group channel requires at least two users");
  }
  if (
    params.inviterUserId &&
    !params.userIds.includes(params.inviterUserId)
  ) {
    throw new Error("inviterUserId must be one of userIds");
  }
  const { appId, apiToken } = getSendbirdCredentials();
  const url = `https://api-${appId}.sendbird.com/v3/group_channels`;
  const headers = {
    "Content-Type": "application/json",
    "Api-Token": apiToken,
  };

  const body: Record<string, unknown> = {
    name: params.name.slice(0, 190),
    user_ids: params.userIds,
    is_distinct: true,
    custom_type: "listing_inquiry",
  };
  if (params.inviterUserId) {
    body.inviter_id = params.inviterUserId;
  }

  try {
    const { data } = await axios.post(url, body, { headers });

    const channelUrl =
      (data as { channel_url?: string }).channel_url ??
      (data as { channelUrl?: string }).channelUrl;
    if (!channelUrl || typeof channelUrl !== "string") {
      throw new Error("Sendbird returned no channel URL");
    }

    return { channel_url: channelUrl };
  } catch (err) {
    throwSendbirdError(err);
  }
}
