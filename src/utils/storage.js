// localStorage のキー
const STORAGE_KEY = "image_crop_presets";

// データの読み書き関数
export const getPresets = () =>
  JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
export const savePresets = (presets) =>
  localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
