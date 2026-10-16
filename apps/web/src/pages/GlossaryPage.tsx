import { GLOSSARY, type GlossaryTerm } from '@felt/content';
import { useMemo, useState } from 'react';
import { LessonSheet } from '../lesson/LessonSheet';
import { entryFor } from '../state/lessons';
import { ChevronRightIcon } from '../ui/icons';
import { PageHeader } from '../ui/PageHeader';
import './screens.css';

const sortKey = (t: GlossaryTerm) => t.term.replace(/^[^A-Za-z]+/, '').toLowerCase() || t.term;
const letterOf = (t: GlossaryTerm) => (/^[0-9]/.test(t.term) ? '#' : sortKey(t)[0].toUpperCase());

/** Every poker term Suited uses, in plain words, searchable. Each one links to the lesson that teaches it. */
export function GlossaryPage() {
  const [query, setQuery] = useState('');
  const [reading, setReading] = useState<string>();
  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const hits = GLOSSARY.filter(
      (t) => !q || t.term.toLowerCase().includes(q) || t.aliases?.some((a) => a.toLowerCase().includes(q)) || t.short.toLowerCase().includes(q),
    ).sort((a, b) => sortKey(a).localeCompare(sortKey(b)));
    const by = new Map<string, GlossaryTerm[]>();
    for (const t of hits) by.set(letterOf(t), [...(by.get(letterOf(t)) ?? []), t]);
    return [...by];
  }, [query]);

  return (
    <div className="stack" style={{ gap: '1.2rem' }}>
      <PageHeader title="Glossary" back={{ to: '/more', label: 'More' }} />
      <input
        className="glossary-search"
        type="search"
        inputMode="search"
        placeholder={`Search ${GLOSSARY.length} terms`}
        aria-label="Search the glossary"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {groups.length === 0 && <p className="muted">No term matches “{query}”.</p>}
      {groups.map(([letter, terms]) => (
        <section key={letter}>
          <h2 className="section-title">{letter}</h2>
          <div className="list">
            {terms.map((t) => {
              const entry = t.lesson ? entryFor(t.lesson) : undefined;
              const body = (
                <span className="grow">
                  <span className="glossary-term">{t.term}</span>
                  <span className="glossary-def">{t.short}</span>
                </span>
              );
              return entry?.content ? (
                <button key={t.id} className="list-row glossary-row" onClick={() => setReading(entry.key)} aria-label={`${t.term}. ${t.short} Read the lesson.`}>
                  {body}
                  <ChevronRightIcon size={14} className="chev" />
                </button>
              ) : (
                <div key={t.id} className="list-row glossary-row">
                  {body}
                </div>
              );
            })}
          </div>
        </section>
      ))}
      {reading && <LessonSheet lessonKey={reading} onClose={() => setReading(undefined)} />}
    </div>
  );
}
