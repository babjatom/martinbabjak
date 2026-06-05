'use client';

import Link from 'next/link';

interface Props {
  email: string;
}

export default function AdminSessionBar({ email }: Props): React.ReactElement {
  return (
    <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
      <span>
        Signed in as <span className="font-medium text-gray-900">{email}</span>
      </span>
      <Link
        href="/api/auth/signout?callbackUrl=/"
        className="font-medium text-indigo-600 hover:text-indigo-700"
      >
        Sign out
      </Link>
    </div>
  );
}
