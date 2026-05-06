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

/** Ensure user exists in Sendbird (create or update nickname). */
export async function ensureSendbirdUser(userId: string, nickname: string) {
  const { appId, apiToken } = getSendbirdCredentials();
  const base = `https://api-${appId}.sendbird.com/v3/users`;
  const headers = {
    "Content-Type": "application/json",
    "Api-Token": apiToken,
  };
  const safeNickname = nickname.trim().slice(0, 80) || userId;

  try {
    await axios.get(`${base}/${encodeURIComponent(userId)}`, {
      headers: { "Api-Token": apiToken },
    });
    await axios.put(
      `${base}/${encodeURIComponent(userId)}`,
      { nickname: safeNickname, profile_url: "" },
      { headers }
    );
  } catch (err) {
    if (!axios.isAxiosError(err)) throw err;
    const ax = err as AxiosError;
    if (ax.response?.status === 404) {
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
        throwSendbirdError(postErr);
      }
    }
    throwSendbirdError(err);
  }
}

export async function createDistinctGroupChannel(params: {
  name: string;
  userIds: string[];
}) {
  if (params.userIds.length < 2) {
    throw new Error("Group channel requires at least two users");
  }
  const { appId, apiToken } = getSendbirdCredentials();
  const url = `https://api-${appId}.sendbird.com/v3/group_channels`;
  const headers = {
    "Content-Type": "application/json",
    "Api-Token": apiToken,
  };

  try {
    const { data } = await axios.post(
      url,
      {
        name: params.name.slice(0, 190),
        user_ids: params.userIds,
        is_distinct: true,
        custom_type: "listing_inquiry",
      },
      { headers }
    );

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
