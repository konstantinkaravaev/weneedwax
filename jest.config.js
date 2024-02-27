module.exports = {
  preset: "jest-preset-angular",
  setupFilesAfterEnv: ["<rootDir>/src/setupJest.ts"],
  testPathIgnorePatterns: ["<rootDir>/node_modules/", "<rootDir>/dist/"],
  moduleNameMapper: {
    "@core/(.*)": "<rootDir>/src/app/core/$1",
    "@shared/(.*)": "<rootDir>/src/app/shared/$1",
    // Добавьте другие пути, если они есть в вашем проекте
  },
};
