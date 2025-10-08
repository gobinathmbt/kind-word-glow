
export const formatApiNames = (name: string): string => {
  if (!name) return "";

  return name
    .split("_") // Split by underscore
    .map(word => word.charAt(0).toUpperCase() + word.slice(1)) // Capitalize first letter of each word
    .join(" "); // Join back with space
};