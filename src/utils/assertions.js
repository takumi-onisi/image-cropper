/**
 * 開発者向けバリデーション:
 * config オブジェクトが必要な構造を持っているかチェックする
 */
export const assertCropConfig = (config) => {
  if (!config) throw new Error("config is required");

  const { selection, transform } = config;

  // 必須プロパティの存在確認
  if (!selection || !transform) {
    throw new Error("Missing required properties: selection or transform");
  }

  // selection の構造チェック (x, y, width, height)
  const requiredSelection = ["x", "y", "width", "height"];
  const missingInSelection = requiredSelection.filter(
    (p) => typeof selection[p] !== "number",
  );

  if (missingInSelection.length > 0) {
    throw new Error(
      `Invalid selection: ${missingInSelection.join(", ")} must be numbers`,
    );
  }

  // transform の配列チェック (6つの数値)
  if (!Array.isArray(transform) || transform.length !== 6) {
    throw new Error("Invalid transform: must be an array of 6 numbers");
  }

  return true;
};
