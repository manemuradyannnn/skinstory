import { allObservationIds, SAMPLE_CONCERNS } from "../data/samples";
import type { Concern, Observation, Question, Toast } from "../types";

export type State = {
  concerns: Concern[];
  questions: Question[];
  includedObservationIds: string[];
  toast: Toast | null;
  toastSeq: number;
};

export type Action =
  | { type: "add-observation"; concernId: string; observation: Observation }
  | { type: "add-concern"; concern: Concern }
  | { type: "delete-observation"; concernId: string; observationId: string }
  | { type: "delete-concern"; concernId: string }
  | { type: "set-observation-included"; observationId: string; included: boolean }
  | { type: "set-concern-included"; concernId: string; included: boolean }
  | { type: "set-all-included"; included: boolean }
  | { type: "add-question"; question: Question }
  | { type: "update-question"; questionId: string; text: string }
  | { type: "set-question-included"; questionId: string; included: boolean }
  | { type: "delete-question"; questionId: string }
  | { type: "clear-toast" };

export function createInitialState(): State {
  const concerns = SAMPLE_CONCERNS.map((concern) => ({
    ...concern,
    observations: concern.observations.map((observation) => ({ ...observation })),
  }));
  return {
    concerns,
    questions: [],
    includedObservationIds: allObservationIds(concerns),
    toast: null,
    toastSeq: 0,
  };
}

function withToast(state: State, message: string, next: Omit<State, "toast" | "toastSeq">): State {
  const toastSeq = state.toastSeq + 1;
  return {
    ...next,
    toastSeq,
    toast: { id: toastSeq, message },
  };
}

export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "add-observation":
      return {
        ...state,
        concerns: state.concerns.map((concern) =>
          concern.id === action.concernId
            ? { ...concern, observations: [...concern.observations, action.observation] }
            : concern,
        ),
        includedObservationIds: state.includedObservationIds.includes(action.observation.id)
          ? state.includedObservationIds
          : [...state.includedObservationIds, action.observation.id],
      };
    case "add-concern":
      return {
        ...state,
        concerns: [action.concern, ...state.concerns],
        includedObservationIds: [
          ...state.includedObservationIds,
          ...action.concern.observations
            .map((observation) => observation.id)
            .filter((id) => !state.includedObservationIds.includes(id)),
        ],
      };
    case "delete-observation": {
      const concern = state.concerns.find((item) => item.id === action.concernId);
      if (!concern) return state;
      const remaining = concern.observations.filter(
        (observation) => observation.id !== action.observationId,
      );
      const concerns =
        remaining.length === 0
          ? state.concerns.filter((item) => item.id !== concern.id)
          : state.concerns.map((item) =>
              item.id === concern.id ? { ...item, observations: remaining } : item,
            );
      const removedIds = new Set(
        remaining.length === 0
          ? concern.observations.map((observation) => observation.id)
          : [action.observationId],
      );
      return withToast(
        state,
        remaining.length === 0 ? "Concern removed." : "Observation removed.",
        {
          ...state,
          concerns,
          includedObservationIds: state.includedObservationIds.filter((id) => !removedIds.has(id)),
        },
      );
    }
    case "delete-concern": {
      const concern = state.concerns.find((item) => item.id === action.concernId);
      if (!concern) return state;
      const removed = new Set(concern.observations.map((observation) => observation.id));
      return withToast(state, "Concern removed.", {
        ...state,
        concerns: state.concerns.filter((item) => item.id !== action.concernId),
        includedObservationIds: state.includedObservationIds.filter((id) => !removed.has(id)),
      });
    }
    case "set-observation-included": {
      const has = state.includedObservationIds.includes(action.observationId);
      if (action.included === has) return state;
      return {
        ...state,
        includedObservationIds: action.included
          ? [...state.includedObservationIds, action.observationId]
          : state.includedObservationIds.filter((id) => id !== action.observationId),
      };
    }
    case "set-concern-included": {
      const concern = state.concerns.find((item) => item.id === action.concernId);
      if (!concern) return state;
      const ids = concern.observations.map((observation) => observation.id);
      const rest = state.includedObservationIds.filter((id) => !ids.includes(id));
      return {
        ...state,
        includedObservationIds: action.included ? [...rest, ...ids] : rest,
      };
    }
    case "set-all-included":
      return {
        ...state,
        includedObservationIds: action.included ? allObservationIds(state.concerns) : [],
      };
    case "add-question":
      return { ...state, questions: [...state.questions, action.question] };
    case "update-question":
      return {
        ...state,
        questions: state.questions.map((question) =>
          question.id === action.questionId ? { ...question, text: action.text } : question,
        ),
      };
    case "set-question-included":
      return {
        ...state,
        questions: state.questions.map((question) =>
          question.id === action.questionId
            ? { ...question, included: action.included }
            : question,
        ),
      };
    case "delete-question":
      return withToast(state, "Question removed.", {
        ...state,
        questions: state.questions.filter((question) => question.id !== action.questionId),
      });
    case "clear-toast":
      return { ...state, toast: null };
    default:
      return state;
  }
}
