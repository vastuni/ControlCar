module.exports = {
  root: true,
  extends: ["@react-native"],
  rules: {
    "arrow-parens": ["warn", "always"],
    quotes: ["warn", "double"],
    "react/react-in-jsx-scope": "off",
    "react-native/no-inline-styles": "off",
    curly: "off",
    "prettier/prettier": [
      "error",
      {
        endOfLine: "auto",
      },
    ],
  },
};
