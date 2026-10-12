import { Printer } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { Button, ButtonLink, fieldClass } from "../components/Button";
import { Dialog } from "../components/Dialog";
import { chronological } from "../lib/activity";
import { formatDate, todayISO } from "../lib/dates";
import { locationLabel } from "../lib/regions";
import { photoKindLabel } from "../lib/photos";
import { symptomLabels } from "../lib/symptoms";
import { usePageTitle } from "../lib/usePageTitle";
import { useAppState } from "../state/StoreProvider";
import type { Concern } from "../types";

const SUGGESTIONS = [
  "Has the size or colour changed in a way I should keep watching?",
  "Which of these photos is most useful for you?",
  "What should I pay attention to before the next visit?",
  "Are there other areas you would like me to photograph?",
  "Is there anything in my notes you want me to describe differently?",
];

export function VisitPrep() {
  const { concerns, questions, includedObservationIds, dispatch } = useAppState();
  usePageTitle("Visit preparation");
  const questionFieldId = useId();
  const [draftQuestion, setDraftQuestion] = useState("");
  const [questionError, setQuestionError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [editingError, setEditingError] = useState("");
  const [removeQuestionId, setRemoveQuestionId] = useState<string | null>(null);
  const [printError, setPrintError] = useState("");
  const included = new Set(includedObservationIds);

  const selectedConcerns = concerns
    .map((concern) => ({
      concern,
      observations: chronological(concern).filter((observation) => included.has(observation.id)),
    }))
    .filter((item) => item.observations.length > 0);
  const includedQuestions = questions.filter((question) => question.included);
  const canPrint = selectedConcerns.length > 0 || includedQuestions.length > 0;
  const showsIllustration = selectedConcerns.some((item) =>
    item.observations.some((observation) => observation.photoKind !== "upload"),
  );

  function addQuestion(text: string, source: "draft" | "suggestion") {
    const trimmed = text.trim();
    if (!trimmed) {
      setQuestionError("Write a question before adding it.");
      document.getElementById(questionFieldId)?.focus();
      return;
    }
    if (trimmed.length > 240) {
      setQuestionError("Use 240 characters or fewer.");
      return;
    }
    dispatch({
      type: "add-question",
      question: { id: crypto.randomUUID(), text: trimmed, included: true },
    });
    if (source === "draft") setDraftQuestion("");
    setQuestionError("");
  }

  return (
    <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:items-start xl:gap-16">
      <div className="no-print min-w-0">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-forest">Before the appointment</p>
        <h1 className="mt-3 text-4xl sm:text-5xl">Visit preparation</h1>
        <p className="mt-4 max-w-prose">
          Choose what to show your dermatologist, and note the questions you want to ask.
        </p>

        <section className="mt-10" aria-labelledby="include-heading">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 id="include-heading" className="text-[1.7rem]">
              Include
            </h2>
            {concerns.length > 0 ? (
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => dispatch({ type: "set-all-included", included: true })}>
                  Select all
                </Button>
                <Button variant="ghost" onClick={() => dispatch({ type: "set-all-included", included: false })}>
                  Clear
                </Button>
              </div>
            ) : null}
          </div>
          {concerns.length === 0 ? (
            <div className="mt-4 border-t border-line pt-4">
              <p className="text-muted">No concerns yet. Document a change and it can be added to this summary.</p>
              <div className="mt-4">
                <ButtonLink to="/map">Document a change</ButtonLink>
              </div>
            </div>
          ) : (
            <ul className="mt-4 border-t border-line">
              {concerns.map((concern) => (
                <ConcernPicker
                  key={concern.id}
                  concern={concern}
                  includedIds={included}
                  onConcern={(checked) =>
                    dispatch({ type: "set-concern-included", concernId: concern.id, included: checked })
                  }
                  onObservation={(observationId, checked) =>
                    dispatch({ type: "set-observation-included", observationId, included: checked })
                  }
                />
              ))}
            </ul>
          )}
        </section>

        <section className="mt-12" aria-labelledby="questions-heading">
          <h2 id="questions-heading" className="text-[1.7rem]">
            Questions
          </h2>
          <p className="mt-2 max-w-prose text-sm text-muted">
            These are prompts for the appointment. Uncheck one to leave it out of the summary.
          </p>
          {questions.length === 0 ? (
            <p className="mt-4 text-muted">No questions yet. Add your own, or start from a suggestion.</p>
          ) : (
            <ul className="mt-4 border-t border-line">
              {questions.map((question) => (
                <li key={question.id} className="border-b border-line py-4">
                  {editingId === question.id ? (
                    <form
                      onSubmit={(event) => {
                        event.preventDefault();
                        const trimmed = editingText.trim();
                        if (!trimmed) {
                          setEditingError("Write a question, or cancel.");
                          return;
                        }
                        dispatch({ type: "update-question", questionId: question.id, text: trimmed });
                        setEditingId(null);
                        setEditingError("");
                      }}
                    >
                      <label className="text-sm font-semibold" htmlFor={`edit-${question.id}`}>
                        Edit question
                      </label>
                      <input
                        id={`edit-${question.id}`}
                        className={fieldClass}
                        value={editingText}
                        maxLength={240}
                        autoFocus
                        onChange={(event) => setEditingText(event.target.value)}
                      />
                      {editingError ? (
                        <p role="alert" className="mt-2 text-sm text-danger">
                          {editingError}
                        </p>
                      ) : null}
                      <div className="mt-3 flex gap-3">
                        <Button type="submit">Save</Button>
                        <Button
                          variant="secondary"
                          onClick={() => {
                            setEditingId(null);
                            setEditingError("");
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <div>
                      <label className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={question.included}
                          onChange={(event) =>
                            dispatch({
                              type: "set-question-included",
                              questionId: question.id,
                              included: event.target.checked,
                            })
                          }
                        />
                        <span className="break-words">{question.text}</span>
                      </label>
                      <div className="mt-3 flex gap-3 pl-8">
                        <Button
                          variant="ghost"
                          className="min-h-9 px-2"
                          onClick={() => {
                            setEditingId(question.id);
                            setEditingText(question.text);
                            setEditingError("");
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          className="min-h-9 px-2"
                          onClick={() => setRemoveQuestionId(question.id)}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}

          <form
            className="mt-6"
            onSubmit={(event) => {
              event.preventDefault();
              addQuestion(draftQuestion, "draft");
            }}
          >
            <label htmlFor={questionFieldId} className="text-sm font-semibold">
              Add a question
            </label>
            <input
              id={questionFieldId}
              className={fieldClass}
              value={draftQuestion}
              maxLength={240}
              autoComplete="off"
              aria-invalid={Boolean(questionError) || undefined}
              aria-describedby={questionError ? "question-error" : undefined}
              onChange={(event) => {
                setDraftQuestion(event.target.value);
                setQuestionError("");
              }}
            />
            {questionError ? (
              <p id="question-error" role="alert" className="mt-2 text-sm text-danger">
                {questionError}
              </p>
            ) : null}
            <div className="mt-3">
              <Button type="submit">Add question</Button>
            </div>
          </form>

          <h3 className="mt-8 font-sans text-sm font-semibold tracking-normal">Suggestions</h3>
          <ul className="mt-3 divide-y divide-line border-y border-line">
            {SUGGESTIONS.map((suggestion) => {
              const added = questions.some((question) => question.text === suggestion);
              return (
                <li key={suggestion} className="flex items-start justify-between gap-4 py-3">
                  <p className="text-sm">{suggestion}</p>
                  {added ? (
                    <span className="shrink-0 text-sm font-semibold text-muted">Added</span>
                  ) : (
                    <Button variant="secondary" className="shrink-0" onClick={() => addQuestion(suggestion, "suggestion")}>
                      Add
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      <article id="visit-summary" className="mt-14 min-w-0 border border-line bg-paper px-5 py-8 sm:px-8 xl:mt-0" aria-labelledby="summary-heading">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-forest">SkinStory</p>
        <h2 id="summary-heading" className="mt-3 text-4xl">
          Visit summary
        </h2>
        <p className="mt-3 text-sm">Prepared {formatDate(todayISO())}</p>
        <p className="mt-4 max-w-prose text-sm text-muted">
          Personal observations to discuss with a dermatologist. This is not a diagnosis, a risk assessment, or a
          treatment plan.
        </p>
        {showsIllustration ? (
          <p className="mt-3 text-sm text-muted">
            Sample and demo illustrations are fictional stand-ins, not clinical photographs.
          </p>
        ) : null}

        {selectedConcerns.length === 0 && includedQuestions.length === 0 ? (
          <p className="mt-8 border-t border-line pt-6 text-muted">
            Select at least one concern, or add a question, to build the summary.
          </p>
        ) : null}

        {selectedConcerns.map(({ concern, observations }) => (
          <section key={concern.id} className="print-block mt-8 border-t border-line pt-6">
            <h3 className="text-[1.6rem]">{concern.name}</h3>
            <p className="mt-1 text-sm text-muted">
              {locationLabel(concern.regionLabel, concern.view)}
              {concern.sample ? " · Sample" : " · This session"}
            </p>
            <p className="mt-1 text-sm text-muted">Oldest first</p>
            <ol className="mt-4 grid gap-6">
              {observations.map((observation) => (
                <li key={observation.id} className="print-entry">
                  <p className="font-semibold">{formatDate(observation.date)}</p>
                  <img
                    src={observation.photoSrc}
                    alt={`${photoKindLabel(observation.photoKind)} from ${formatDate(observation.date)}`}
                    className="mt-3 aspect-[4/5] w-full max-w-xs border border-line object-contain"
                  />
                  <p className="mt-2 text-sm text-muted">{photoKindLabel(observation.photoKind)}</p>
                  <p className="mt-2 text-sm">Symptoms: {symptomLabels(observation.symptoms)}</p>
                  <p className="mt-2 whitespace-pre-wrap break-words text-sm">
                    {observation.notes || "No notes."}
                  </p>
                </li>
              ))}
            </ol>
          </section>
        ))}

        {includedQuestions.length > 0 ? (
          <section className="print-block mt-8 border-t border-line pt-6">
            <h3 className="text-[1.6rem]">Questions</h3>
            <ol className="mt-3 list-decimal space-y-2 pl-5">
              {includedQuestions.map((question) => (
                <li key={question.id} className="break-words">
                  {question.text}
                </li>
              ))}
            </ol>
          </section>
        ) : null}

        <div className="no-print mt-8 border-t border-line pt-6">
          <Button
            onClick={() => {
              if (!canPrint) {
                setPrintError("Select a concern or add a question before printing.");
                const heading = document.getElementById("include-heading");
                if (heading instanceof HTMLElement) {
                  heading.tabIndex = -1;
                  heading.focus();
                }
                return;
              }
              setPrintError("");
              window.print();
            }}
          >
            <Printer aria-hidden="true" className="size-4" strokeWidth={1.5} />
            Print or save as PDF
          </Button>
          {printError ? (
            <p role="alert" className="mt-3 text-sm text-danger">
              {printError}
            </p>
          ) : (
            <p className="mt-3 max-w-prose text-sm text-muted">
              Opens your browser’s print dialog. Choose “Save as PDF” there if you want a file.
            </p>
          )}
        </div>
      </article>

      <Dialog
        open={removeQuestionId !== null}
        title="Remove this question?"
        description="It will be left out of the visit summary."
        confirmLabel="Remove"
        onClose={() => setRemoveQuestionId(null)}
        onConfirm={() => {
          if (!removeQuestionId) return;
          dispatch({ type: "delete-question", questionId: removeQuestionId });
          setRemoveQuestionId(null);
        }}
      />
    </div>
  );
}

function ConcernPicker({
  concern,
  includedIds,
  onConcern,
  onObservation,
}: {
  concern: Concern;
  includedIds: Set<string>;
  onConcern: (included: boolean) => void;
  onObservation: (observationId: string, included: boolean) => void;
}) {
  const observations = chronological(concern);
  const count = observations.filter((observation) => includedIds.has(observation.id)).length;
  const state = count === 0 ? "none" : count === observations.length ? "all" : "some";
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = `concern-${concern.id}`;

  useEffect(() => {
    if (inputRef.current) inputRef.current.indeterminate = state === "some";
  }, [state]);

  return (
    <li className="border-b border-line py-4">
      <label className="flex items-start gap-3" htmlFor={inputId}>
        <input
          ref={inputRef}
          id={inputId}
          type="checkbox"
          checked={state === "all"}
          onChange={(event) => onConcern(event.target.checked)}
        />
        <span>
          <span className="block font-serif text-2xl">{concern.name}</span>
          <span className="mt-1 block text-sm text-muted">
            {locationLabel(concern.regionLabel, concern.view)} · {concern.sample ? "Sample" : "This session"}
          </span>
        </span>
      </label>
      <ul className="mt-3 grid gap-3 pl-8">
        {observations.map((observation) => (
          <li key={observation.id}>
            <label className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                checked={includedIds.has(observation.id)}
                onChange={(event) => onObservation(observation.id, event.target.checked)}
              />
              <span>
                <span className="font-semibold">{formatDate(observation.date)}</span>
                <span className="mt-0.5 block text-muted">{symptomLabels(observation.symptoms)}</span>
              </span>
            </label>
          </li>
        ))}
      </ul>
    </li>
  );
}
