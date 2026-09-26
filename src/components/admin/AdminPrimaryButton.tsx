import type { ButtonHTMLAttributes } from 'react';

import { adminPrimaryButtonStyle } from './admin-styles.ts';

type AdminPrimaryButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

export default function AdminPrimaryButton({
  className = 'px-4 py-2 text-sm disabled:opacity-60',
  type = 'button',
  ...rest
}: AdminPrimaryButtonProps) {
  return <button type={type} className={className} style={adminPrimaryButtonStyle} {...rest} />;
}
