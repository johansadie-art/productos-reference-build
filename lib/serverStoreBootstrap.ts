import { setStore } from "./storeProvider";
import { fsStore } from "./fsStore";

// Side-effect module: wires the shared pipeline logic (lib/orchestrator.ts,
// via lib/store.ts) to the real filesystem backend. Import this ONLY from
// server-only code (the app/api/* route files) — never from anything that
// could end up in a client bundle, since lib/fsStore.ts imports Node's
// `fs`/`path`. See lib/storeProvider.ts's doc comment for why this can't
// just live inside storeProvider.ts itself.
setStore(fsStore);
