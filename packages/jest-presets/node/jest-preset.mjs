/** @type {import('jest').Config} */
const config = {
  roots: ["<rootDir>"],
  transform: {
    "^.+\\.tsx?$": "ts-jest",
  },
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
  modulePathIgnorePatterns: [
    "<rootDir>/test/__fixtures__",
    "<rootDir>/node_modules",
    "<rootDir>/dist",
  ],
  preset: "ts-jest",
  testMatch: [
    "**/tests/**/*.[jt]s?(x)"
  ],
  testPathIgnorePatterns: [
    "<rootDir>/src/tests/integration/helpers/"
  ],
  testEnvironment: "node",
  setupFiles: [
    "<rootDir>/node_modules/@repo/jest-presets/node/jest.setup.js"
  ],
};

export default config;

