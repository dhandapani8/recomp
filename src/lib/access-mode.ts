export function isPublicAccessEnabled() {
  return process.env.RECOMP_PUBLIC_ACCESS?.trim().toLowerCase() === "true";
}
