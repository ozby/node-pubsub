import { baseConfig } from "webpresso/stryker";

export default {
  ...baseConfig,
  checkers: ["typescript"],
  tsconfigFile: "tsconfig.json",
};
