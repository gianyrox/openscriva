import coreWebVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = [
  {
    ignores: [
      // Local agent worktrees contain their own .next/ build output and
      // should never be linted as source.
      ".claude/worktrees/**",
      ".next/**",
      "node_modules/**",
    ],
  },
  ...coreWebVitals,
  {
    rules: {
      // Downgrade to warning: many legitimate patterns (fetching in useEffect,
      // reading localStorage) trigger this strict React 19 rule.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
];

export default eslintConfig;
