import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';

type WorkoutSuggestion = {
  _id?: string;
  title: string;
  reason: string;
};

type SuggestionsResponse = { suggestions: WorkoutSuggestion[] };
const suggestionEmail = 'mona@example.com';

export default function Workouts() {
  const [suggestions, setSuggestions] = useState<WorkoutSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getJson<SuggestionsResponse>(`/api/workouts/suggestions/${encodeURIComponent(suggestionEmail)}`)
      .then(({ suggestions: data }) => {
        if (active) setSuggestions(data);
      })
      .catch(() => {
        if (active) setError('Unable to load workout suggestions.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="card h-100">
      <div className="card-body">
        <h2 className="h4">Workout suggestions</h2>
        <p>Recommend workouts from activity patterns.</p>
        {loading ? (
          <p role="status">Loading workout suggestions...</p>
        ) : error ? (
          <p role="alert">{error}</p>
        ) : suggestions.length === 0 ? (
          <p>No workout suggestions yet.</p>
        ) : (
          <ul>
            {suggestions.map((suggestion, index) => (
              <li key={suggestion._id ?? `${suggestion.title}-${index}`}>
                {suggestion.title}: {suggestion.reason}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
