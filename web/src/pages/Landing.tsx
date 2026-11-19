import { Link } from 'react-router';
import { PublicLayout } from '../components/layout/PublicLayout';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Avatar } from '../components/ui/Avatar';

export function Landing() {
  return (
    <PublicLayout>
      <div className="flex-1 flex flex-col justify-between max-w-[1080px] mx-auto w-full px-4 sm:px-8 py-10 sm:py-16">
        {/* Hero Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-center">
          <div className="lg:col-span-7 flex flex-col items-start">
            <span className="text-[13px] font-semibold tracking-widest uppercase text-muted mb-3">
              Ajo, made simple
            </span>
            <h1 className="text-[34px] sm:text-[48px] font-[650] font-display text-ink leading-[1.15] mb-5">
              Save together, the way you already do.
            </h1>
            <p className="text-[16px] sm:text-[18px] text-muted leading-relaxed mb-8 max-w-xl">
              Kolo runs your ajo or esusu group for you. Everyone pays in, one person collects each round, and every naira is recorded so nobody has to keep the notebook.
            </p>
            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              <Link to="/register" className="w-full sm:w-auto">
                <Button size="md" className="w-full sm:w-auto">
                  Create an account
                </Button>
              </Link>
              <Link to="/login" className="w-full sm:w-auto">
                <Button variant="secondary" size="md" className="w-full sm:w-auto">
                  Log in
                </Button>
              </Link>
            </div>
          </div>

          {/* Static illustration built with real UI components */}
          <div className="lg:col-span-5 w-full max-w-md mx-auto">
            <Card className="p-6 shadow-sm border-border bg-surface">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <h3 className="font-display font-semibold text-[18px] text-ink">
                    Office Ajo
                  </h3>
                  <Badge status="active" />
                </div>
                <span className="text-[13px] font-semibold text-muted tabular-nums">
                  ₦10,000 / wk
                </span>
              </div>

              <div className="rounded-xl bg-surface-muted p-4 mb-4 flex flex-col gap-3">
                <div className="flex items-center justify-between text-[13px]">
                  <span className="font-semibold text-ink">
                    Round 3 of 6
                  </span>
                  <span className="text-muted">
                    Due in 6 days
                  </span>
                </div>

                {/* Progress bar */}
                <div>
                  <div className="flex justify-between text-[12px] text-muted mb-1">
                    <span>Progress</span>
                    <span className="font-semibold text-ink">4 of 6 paid</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-border overflow-hidden">
                    <div className="h-full bg-accent w-4/6 rounded-full transition-all duration-300" />
                  </div>
                </div>

                {/* Recipient */}
                <div className="flex items-center justify-between pt-1 text-[13px] border-t border-border/60">
                  <span className="text-muted">Recipient</span>
                  <div className="flex items-center gap-2">
                    <Avatar name="Ngozi Eze" userId="ngozi" size="sm" />
                    <span className="font-semibold text-ink">Ngozi Eze</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-[13px] text-muted pt-1">
                <span>6 members joined</span>
                <span className="font-semibold text-primary">Pot: ₦60,000</span>
              </div>
            </Card>
          </div>
        </div>

        {/* "How it works" */}
        <div className="mt-16 sm:mt-24 pt-12 border-t border-border">
          <h2 className="text-[20px] font-display font-semibold text-ink mb-8 text-center sm:text-left">
            How it works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex flex-col gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-on-primary text-[14px] font-bold">
                1
              </span>
              <h3 className="text-[16px] font-semibold text-ink">
                Start a group
              </h3>
              <p className="text-[14px] text-muted leading-relaxed">
                Set the amount, how often you pay, and how many people.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-on-primary text-[14px] font-bold">
                2
              </span>
              <h3 className="text-[16px] font-semibold text-ink">
                Invite your people
              </h3>
              <p className="text-[14px] text-muted leading-relaxed">
                Share a code. When everyone's in, start the group.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-on-primary text-[14px] font-bold">
                3
              </span>
              <h3 className="text-[16px] font-semibold text-ink">
                Pay in, collect in turn
              </h3>
              <p className="text-[14px] text-muted leading-relaxed">
                Each round, everyone pays and one member receives the full pot.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-16 sm:mt-24 pt-6 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between text-[13px] text-muted gap-3">
          <p>Kolo is a learning project. It runs in test mode only.</p>
          <a
            href="#"
            className="hover:text-ink transition underline select-none"
          >
            Source code
          </a>
        </footer>
      </div>
    </PublicLayout>
  );
}
