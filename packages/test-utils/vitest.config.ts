import { nodeConfig } from "@webpresso/agent-vitest/node";
import { mergeConfig } from "vite-plus/test/config";

export default mergeConfig(nodeConfig as never, {});
