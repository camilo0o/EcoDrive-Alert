/** Une clases de Tailwind ignorando los valores vacíos o falsos. */
export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}
