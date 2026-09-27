import "./panel.scss";

import React from "react";

export interface PanelProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Optional content to display in the binder-style tab header.
   * Can be any slottable ReactNode (text, heading elements, icons, badges, etc.).
   * If omitted, null, or undefined, the heading tab container is not rendered.
   */
  heading?: React.ReactNode;

  /**
   * Optional HTML attributes forwarded directly to the heading container element (.panel-heading).
   */
  headingProps?: React.HTMLAttributes<HTMLDivElement>;

  /**
   * Optional HTML attributes forwarded directly to the content container element (.panel-content).
   */
  contentProps?: React.HTMLAttributes<HTMLDivElement>;

  /**
   * Declarative panel body content rendered inside the content container.
   */
  children?: React.ReactNode;
}

/**
 * Panel component with an integrated binder-style folder tab heading.
 * Conforms to normal DOM flow with a 2-piece or 3-piece structure:
 * - Root container: `.panel`
 * - Heading container (if heading provided): `.panel-heading` (also `.heading`)
 * - Content container: `.panel-content` (also `.content`)
 */
export function Panel({
  heading,
  headingProps,
  contentProps,
  children,
  className,
  ...rest
}: PanelProps) {
  const rootClasses = ["panel", className].filter(Boolean).join(" ");
  const hasHeading = heading !== undefined && heading !== null;

  const headingClasses = [
    "panel-heading",
    "heading",
    headingProps?.className,
  ]
    .filter(Boolean)
    .join(" ");

  const contentClasses = [
    "panel-content",
    "content",
    contentProps?.className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div {...rest} className={rootClasses}>
      {hasHeading && (
        <div {...headingProps} className={headingClasses}>
          {heading}
        </div>
      )}
      <div {...contentProps} className={contentClasses}>
        {children}
      </div>
    </div>
  );
}

export default Panel;
