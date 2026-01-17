module.exports = {
  preset: "jest-preset-angular",
  setupFilesAfterEnv: ["<rootDir>/src/setupJest.ts"],
  testPathIgnorePatterns: ["<rootDir>/node_modules/", "<rootDir>/dist/"],
  moduleNameMapper: {
    "@core/(.*)": "<rootDir>/src/app/core/$1",
    "@shared/(.*)": "<rootDir>/src/app/shared/$1",
    // Add other paths here if they exist in your project
  },
};
