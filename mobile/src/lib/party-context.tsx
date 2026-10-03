import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

/**
 * Which party the client is looking at. The tabs (Pagamento, Convidados, Convite, Local) read it;
 * Início sets it, from the list or from a link that was opened. Remembered on the device.
 */
const KEY = "komyx.cliente.party";

const Ctx = createContext<{ token: string | null; ready: boolean; setToken: (t: string | null) => void }>({ token: null, ready: false, setToken: () => {} });

export function PartyProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => { AsyncStorage.getItem(KEY).then((v) => { setTokenState(v); setReady(true); }).catch(() => setReady(true)); }, []);
  const setToken = useCallback((t: string | null) => {
    setTokenState(t);
    (t ? AsyncStorage.setItem(KEY, t) : AsyncStorage.removeItem(KEY)).catch(() => {});
  }, []);
  const value = useMemo(() => ({ token, ready, setToken }), [token, ready, setToken]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useParty = () => useContext(Ctx);
