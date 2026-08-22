import React, {
  Fragment,
  useEffect,
  useId,
  useLayoutEffect,
  useReducer,
} from "react";
import { StyleSheet, View } from "react-native";

// A dependency-free portal for native. RN has no createPortal for native, and
// its built-in Modal collapses its content frame on the New Architecture
// (Fabric), which breaks full-screen overlays. Instead we keep the mounted
// overlays in a tiny module-level store and render them in a single full-screen
// host at the app root. The store is deliberately OUTSIDE React state so that
// mounting/updating an overlay only re-renders the host- never the whole app,
// which would loop (overlays render during app renders). Because the host lives
// below the app's providers, portaled content still sees PlayerProvider, Music,
// safe-area, etc.

let overlays: Record<string, React.ReactNode> = {};
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((notify) => notify());

const setOverlay = (id: string, node: React.ReactNode) => {
  overlays = { ...overlays, [id]: node };
  emit();
};

const removeOverlay = (id: string) => {
  const next = { ...overlays };
  delete next[id];
  overlays = next;
  emit();
};

const OverlayHost = () => {
  const [, force] = useReducer((n) => n + 1, 0);
  // Subscribe during layout so the host is listening before any Portal's
  // passive effect fires — including portals mounted in the very same commit
  // as the host (passive effects run children-first, after all layout effects).
  useLayoutEffect(() => {
    listeners.add(force);
    return () => {
      listeners.delete(force);
    };
  }, []);

  return (
    <View style={styles.host}>
      {Object.entries(overlays).map(([id, node]) => (
        <Fragment key={id}>{node}</Fragment>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  host: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    // Must live in StyleSheet.create, not an inline style object:
    // react-native-web can only express "box-none" as a generated CSS
    // class (none on the host, auto on children) — inlined, the invalid
    // declaration is dropped and the host swallows every click
    pointerEvents: "box-none",
  },
});

// Renders the host alongside the app. No React state here, so it never forces
// the app subtree to re-render.
export const OverlayProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => (
  <>
    {children}
    <OverlayHost />
  </>
);

// Renders nothing in place; mounts its children into the host instead. Children
// are refreshed on every render so their closures (and Animated values) stay
// current; this only re-renders the host, not this component's parent.
export const Portal = ({ children }: { children: React.ReactNode }) => {
  const id = useId();

  useEffect(() => {
    setOverlay(id, children);
  });

  useEffect(() => () => removeOverlay(id), [id]);

  return null;
};
