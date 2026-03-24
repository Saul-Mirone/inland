export const generateSlug = (name: string): string =>
  name.toLowerCase().replace(/[^a-z0-9]/g, '-');

export const resolveDisplayName = (data: {
  displayName?: string;
  name: string;
}): string => data.displayName || data.name;
