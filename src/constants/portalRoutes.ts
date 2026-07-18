export function portalPath(token: string): string {
  return `/portal/${encodeURIComponent(token)}`;
}

export function portalShareUrl(origin: string, token: string): string {
  return `${origin}${portalPath(token)}`;
}
