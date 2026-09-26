import type { ButtonHTMLAttributes } from 'react';

import { adminClass } from './admin-styles.ts';

type AdminPrimaryButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

export default function AdminPrimaryButton({
  className = '',
  type = 'button',
  ...rest
}: AdminPrimaryButtonProps) {
  const classes = className ? `${adminClass.btnPrimary} ${className}` : adminClass.btnPrimary;
  return <button type={type} className={classes} {...rest} />;
}
