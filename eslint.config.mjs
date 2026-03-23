import coreWebVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = [
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
