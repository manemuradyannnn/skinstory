import { createContext, useContext, useEffect, useReducer, type Dispatch, type ReactNode } from "react";
import { createInitialState, reducer, type Action, type State } from "./reducer";

type Store = State & { dispatch: Dispatch<Action> };

const StoreContext = createContext<Store | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, createInitialState);

  useEffect(() => {
    if (!state.toast) return;
    const timeout = window.setTimeout(() => dispatch({ type: "clear-toast" }), 4500);
    return () => window.clearTimeout(timeout);
  }, [state.toast]);

  return (
    <StoreContext.Provider value={{ ...state, dispatch }}>{children}</StoreContext.Provider>
  );
}

export function useAppState(): Store {
  const store = useContext(StoreContext);
  if (!store) throw new Error("useAppState must be used within AppStateProvider");
  return store;
}
