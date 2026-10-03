/** Results update with their scenario, including when rendering is throttled. */
export function AnimatedNumber({ value, format }: { value: number; format: (n: number) => string }) {
  return <span className="num">{format(value)}</span>;
}
