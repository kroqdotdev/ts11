import clsx from "clsx";

/**
 * An email address that wraps only where it reads naturally: after the @ (a <wbr>)
 * or at a hyphen, never in the middle of a word, unless a single part is wider
 * than the whole line.
 */
export function EmailText({ email, className }: { email: string; className?: string }) {
  const at = email.lastIndexOf("@");
  if (at < 0) return <span className={clsx("break-words", className)}>{email}</span>;
  return (
    <span className={clsx("break-words", className)}>
      {email.slice(0, at + 1)}
      <wbr />
      {email.slice(at + 1)}
    </span>
  );
}
