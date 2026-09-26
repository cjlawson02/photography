import { useId } from 'react';

type Props = {
  className?: string;
  title?: string;
};

/** Brand aperture — ring + six-blade iris, drawn in `currentColor`. */
export default function ApertureMark({ className, title }: Props) {
  const maskId = `aperture-${useId().replace(/:/g, '')}`;
  return (
    <svg
      className={className}
      viewBox="0 0 32 32"
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      focusable="false"
    >
      <mask id={maskId}>
        <circle cx="16" cy="16" r="10.6" fill="#fff" />
        <path
          d="M18.94 14.3 26.29 18.54M18.94 17.7v8.48M16 19.4l-7.35 4.24M13.06 17.7 5.71 13.46M13.06 14.3V5.82M16 12.6l7.35-4.24"
          stroke="#000"
          strokeWidth="1.35"
          strokeLinecap="square"
        />
        <polygon points="16 12.6 18.94 14.3 18.94 17.7 16 19.4 13.06 17.7 13.06 14.3" fill="#000" />
      </mask>
      <circle cx="16" cy="16" r="14.4" fill="none" stroke="currentColor" strokeWidth="1.9" />
      <circle cx="16" cy="16" r="10.6" fill="currentColor" mask={`url(#${maskId})`} />
    </svg>
  );
}
