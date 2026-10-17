import { Link } from 'react-router-dom';
import { PlayingCard } from '../components/PlayingCard';
import { EmptyState } from '../ui/Section';

/** A link that leads nowhere: the page mucks its cards and points home. */
export function NotFoundPage() {
  return (
    <EmptyState
      art={
        <span className="nf-muck">
          <span>
            <PlayingCard size="lg" />
          </span>
          <span>
            <PlayingCard size="lg" />
          </span>
        </span>
      }
      title="This page folded"
      body="The link may be old. Your progress is safe."
      action={
        <Link to="/" className="btn btn-primary" style={{ marginTop: '0.4rem' }}>
          Go to Today
        </Link>
      }
    />
  );
}
