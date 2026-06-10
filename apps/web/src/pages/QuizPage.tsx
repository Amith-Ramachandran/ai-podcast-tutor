import { useParams } from 'react-router-dom';

export function QuizPage() {
  const { id } = useParams();
  return (
    <section>
      <h2>Quiz {id}</h2>
      <p className="muted">Phase 7 will render MCQs + flashcards here.</p>
    </section>
  );
}
