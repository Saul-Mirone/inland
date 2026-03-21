import { Link } from 'react-router';

import { authModel } from '@/model/auth-model';
import { useObservable } from '@/utils/use-observable';

export function Dashboard() {
  const authState = useObservable(authModel.authState$);
  const user = authState.user;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Dashboard
        </h1>
        <p className="text-sm text-muted-foreground">
          Welcome back
          {user ? `, ${user.username}` : ''}!
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <DashboardCard
          title="Sites"
          description="Manage your documentation sites"
          href="/sites"
        />
        <DashboardCard
          title="Articles"
          description="Create and edit articles"
          href="/articles"
        />
      </div>
    </div>
  );
}

function DashboardCard({
  title,
  description,
  href,
}: {
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link
      to={href}
      className="group rounded-lg border border-border bg-card p-5 transition-colors hover:bg-accent"
    >
      <h3 className="font-semibold text-card-foreground group-hover:text-accent-foreground">
        {title}
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </Link>
  );
}
