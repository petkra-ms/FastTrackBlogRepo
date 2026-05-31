/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
    preset: "ts-jest",
    testEnvironment: "jsdom",
    roots: ["<rootDir>/LeadSummaryControl"],
    moduleFileExtensions: ["ts", "tsx", "js", "jsx"],
    testMatch: ["**/__tests__/**/*.test.ts", "**/__tests__/**/*.test.tsx"],
    globals: {
        ComponentFramework: true,
    },
};
