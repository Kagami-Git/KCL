export interface PlayerProfile {
  id: string;
  name: string;
  textures?: {
    SKIN?: {
      url: string;
    };
  };
}

export interface SessionProfile {
  id: string;
  name: string;
  properties: Array<{
    name: string;
    value: string;
  }>;
}

async function getUuid(username: string): Promise<string | null> {
  try {
    const response = await fetch(`https://api.mojang.com/users/profiles/minecraft/${username}`);
    if (!response.ok) {
      return null;
    }
    const data = await response.json();
    return data.id;
  } catch {
    return null;
  }
}

async function getSessionProfile(uuid: string): Promise<SessionProfile | null> {
  try {
    const response = await fetch(`https://sessionserver.mojang.com/session/minecraft/profile/${uuid}`);
    if (!response.ok) {
      return null;
    }
    return await response.json();
  } catch {
    return null;
  }
}

function decodeTextures(profile: SessionProfile): PlayerProfile["textures"] {
  const textureProperty = profile.properties.find((p) => p.name === "textures");
  if (!textureProperty) {
    return undefined;
  }
  try {
    const decoded = JSON.parse(atob(textureProperty.value));
    return decoded.textures;
  } catch {
    return undefined;
  }
}

export async function getPlayerProfile(username: string): Promise<PlayerProfile | null> {
  const uuid = await getUuid(username);
  if (!uuid) {
    return null;
  }
  const sessionProfile = await getSessionProfile(uuid);
  if (!sessionProfile) {
    return { id: uuid, name: username };
  }
  return {
    id: sessionProfile.id,
    name: sessionProfile.name,
    textures: decodeTextures(sessionProfile),
  };
}

export function getSkinUrl(profile: PlayerProfile): string | undefined {
  return profile.textures?.SKIN?.url;
}
