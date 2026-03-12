import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

interface UiAction {
  label: string;
  value: string;
}

interface UiLink {
  label: string;
  href: string;
}

interface ResponseActionsProps {
  actions: UiAction[];
  links?: UiLink[];
  onActionClick: (value: string) => void;
  disabled?: boolean;
}

export function ResponseActions({ actions, links, onActionClick, disabled }: ResponseActionsProps) {
  // Max 2 action buttons
  const cappedActions = actions.slice(0, 2);
  // Max 6 link buttons, but only show ones not already in actions
  const cappedLinks = (links || []).slice(0, 6);

  if (cappedActions.length === 0 && cappedLinks.length === 0) return null;

  return (
    <div className="space-y-1.5">
      {/* Action buttons */}
      {cappedActions.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {cappedActions.map((action, i) => (
            <button
              key={i}
              onClick={() => onActionClick(action.value)}
              disabled={disabled}
              className="px-3 py-1.5 text-xs rounded-full border border-primary/30 text-primary hover:bg-primary/10 transition-colors disabled:opacity-50"
            >
              {action.label}
            </button>
          ))}
        </div>
      )}

      {/* Link chips */}
      {cappedLinks.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {cappedLinks.map((link, i) => {
            const isExternal = link.href.startsWith("http");
            if (isExternal) {
              return (
                <a
                  key={i}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 text-xs rounded-full border border-muted-foreground/30 text-muted-foreground hover:text-foreground hover:border-foreground/50 transition-colors inline-flex items-center gap-1"
                >
                  {link.label}
                  <ArrowRight className="h-3 w-3" />
                </a>
              );
            }
            return (
              <Link
                key={i}
                to={link.href}
                className="px-3 py-1.5 text-xs rounded-full border border-muted-foreground/30 text-muted-foreground hover:text-foreground hover:border-foreground/50 transition-colors inline-flex items-center gap-1"
              >
                {link.label}
                <ArrowRight className="h-3 w-3" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
