export const generateSlug = (name: string): string =>
  name.toLowerCase().replace(/[^a-z0-9]/g, '-')
