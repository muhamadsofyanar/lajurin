function enabled(value: string | undefined) {
  return value?.trim().toLowerCase() === "true";
}

export function workspaceFoundationEnabled(env: NodeJS.ProcessEnv = process.env) {
  return enabled(env.WORKSPACE_FOUNDATION_ENABLED);
}

export function workspaceCanaryUserIds(env: NodeJS.ProcessEnv = process.env) {
  return new Set((env.WORKSPACE_CANARY_USER_IDS ?? "").split(",").map((value) => value.trim()).filter(Boolean));
}

export function isWorkspaceCanaryUser(userId: string, env: NodeJS.ProcessEnv = process.env) {
  return workspaceFoundationEnabled(env) && workspaceCanaryUserIds(env).has(userId);
}
