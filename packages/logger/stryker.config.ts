import { baseConfig } from "@webpresso/agent-stryker";

export default {
  ...baseConfig,
  checkers: ["typescript"],
  tsconfigFile: "tsconfig.json",
};
