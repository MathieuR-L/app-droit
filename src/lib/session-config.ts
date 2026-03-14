const DEMO_SESSION_SECRET = "app-droit-demo-session-secret";

let hasWarnedAboutFallbackSecret = false;

export function getSessionSecretValue() {
  const configuredSecret = process.env.SESSION_SECRET?.trim();

  if (configuredSecret) {
    return configuredSecret;
  }

  if (!hasWarnedAboutFallbackSecret) {
    console.warn(
      "SESSION_SECRET is not configured. Falling back to the built-in demo secret.",
    );
    hasWarnedAboutFallbackSecret = true;
  }

  return DEMO_SESSION_SECRET;
}

export function resetSessionConfigWarningsForTests() {
  hasWarnedAboutFallbackSecret = false;
}
