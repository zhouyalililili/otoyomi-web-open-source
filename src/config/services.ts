/**
 * Hosted feature composition root.
 *
 * The public repository deliberately ships without production auth, AI, quota,
 * database or API credentials. Replace these exports with your own adapters;
 * see docs/HOSTED_FEATURES.md. Never put a provider secret in client code or a
 * VITE_* environment variable.
 */
export {
  unconfiguredAuthAdapter as authAdapter,
  unconfiguredAiImportAdapter as aiImportAdapter,
  unconfiguredQuotaAdapter as quotaAdapter,
} from "@/extensions/unconfigured";
