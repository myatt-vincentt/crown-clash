// Dev-only: window.__crown exposes the store, the live players and the duel
// for debugging; `live.powerOverride = [a, b]` stands in for the two players'
// expressions. Scene.tsx lazy-imports this behind an inline NODE_ENV check,
// so it never reaches production.
import { useEffect } from "react";
import { useThree } from "@react-three/fiber";

import { live } from "./live";
import { crownActions, getCrown } from "./state";

const DevKeys = () => {
  const scene = useThree((st) => st.scene);
  useEffect(() => {
    (window as unknown as Record<string, unknown>).__crown = {
      actions: crownActions,
      get: getCrown,
      live,
      scene,
    };
  }, [scene]);
  return null;
};

export default DevKeys;
